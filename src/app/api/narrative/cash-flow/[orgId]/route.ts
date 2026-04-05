import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getSkillAsSystemPrompt } from '@/lib/skills/company-skill';
import { governedOutput, xeroFinancialsSource, companySkillSource } from '@/lib/governance/checkpoint';
import { llmLimiter } from '@/lib/rate-limit';
import { z } from 'zod';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/**
 * GET /api/narrative/cash-flow/[orgId]
 * Generate a Claude API narrative for the Cash Flow view.
 * Narrative-first principle: every screen leads with written insight.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limited = llmLimiter.check(orgId);
    if (limited) return limited;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      period: url.searchParams.get('period') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const untypedDb = await createUntypedServiceClient();

    const [financialsResult, accountsResult, companySystemPrompt, syncResult] =
      await Promise.all([
        supabase.from('normalised_financials').select('*').eq('org_id', orgId),
        supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
        getSkillAsSystemPrompt(orgId),
        supabase.from('sync_log').select('completed_at').eq('org_id', orgId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).single(),
      ]);

    const fins = (financialsResult.data ?? []) as NormalisedFinancial[];
    const accs = (accountsResult.data ?? []) as ChartOfAccount[];
    const lastSync = syncResult.data;

    const periods = getAvailablePeriods(fins);
    if (periods.length === 0) {
      return NextResponse.json({
        narrative: 'Connect your Xero account and sync data to see your cash flow analysis.',
        period: null,
        reasoning: null,
        confidence: null,
      });
    }

    const period = parsed.data.period && periods.includes(parsed.data.period)
      ? parsed.data.period
      : periods[0];

    const accountMap = new Map(accs.map((a) => [a.id, a]));
    const periodData = fins.filter((f) => f.period === period);

    // Derive cash flow components from P&L and balance sheet changes
    const currentPnL = buildPnL(fins, accs, period);
    const periodIdx = periods.indexOf(period);
    const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
    const previousPnL = previousPeriod ? buildPnL(fins, accs, previousPeriod) : null;

    // Cash and bank balances
    const cashAccounts = periodData
      .filter((f) => {
        const acc = accountMap.get(f.account_id);
        return acc && (acc.type === 'BANK' || acc.name?.toLowerCase().includes('cash'));
      })
      .map((f) => ({
        name: accountMap.get(f.account_id)?.name ?? f.account_id,
        amount: Number(f.amount),
      }));

    const totalCash = cashAccounts.reduce((sum, a) => sum + a.amount, 0);

    // Receivables and payables for working capital insight
    const receivables = periodData
      .filter((f) => accountMap.get(f.account_id)?.type === 'CURRENT')
      .filter((f) => {
        const name = (accountMap.get(f.account_id)?.name ?? '').toLowerCase();
        return name.includes('receivable') || name.includes('debtor') || name.includes('trade debtor');
      })
      .reduce((sum, f) => sum + Number(f.amount), 0);

    const payables = periodData
      .filter((f) => accountMap.get(f.account_id)?.type === 'CURRLIAB')
      .filter((f) => {
        const name = (accountMap.get(f.account_id)?.name ?? '').toLowerCase();
        return name.includes('payable') || name.includes('creditor') || name.includes('trade creditor');
      })
      .reduce((sum, f) => sum + Number(f.amount), 0);

    // Previous period cash for comparison
    let previousCash: number | null = null;
    if (previousPeriod) {
      const prevData = fins.filter((f) => f.period === previousPeriod);
      previousCash = prevData
        .filter((f) => {
          const acc = accountMap.get(f.account_id);
          return acc && (acc.type === 'BANK' || acc.name?.toLowerCase().includes('cash'));
        })
        .reduce((sum, f) => sum + Number(f.amount), 0);
    }

    const systemPrompt = `${companySystemPrompt}

## Narrative Task — Cash Flow Analysis
This is a UK company. Apply FRS 102/FRS 105 standards as appropriate.
Use ACCA/ICAEW practitioner methodology for ratio analysis.
Reference ISA 570 going concern indicators where relevant.
Use GBP. Reference UK tax rules (Corporation Tax, VAT, PAYE, Employer NI, Employer Pension) where relevant.

Generate a concise cash flow narrative (3-5 sentences) that analyses the business's cash position and movement.

Rules:
- Lead with the current cash position and whether it's improving or deteriorating
- Analyse cash from operations (net profit adjusted for working capital)
- Comment on the relationship between profit and cash (profitable but cash-poor, or vice versa)
- Calculate debtor days (receivables / revenue * 365) and creditor days (payables / cost of sales * 365) where data permits — comment on the working capital cycle
- Highlight receivables vs payables balance and working capital implications
- If there's a previous period, quantify the cash movement
- Flag any cash runway concerns or opportunities, referencing ISA 570 going concern indicators if cash position is deteriorating
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 3-5 sentence cash flow analysis",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    const cashAccountLines = cashAccounts
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .map((a) => `- ${a.name}: £${a.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      .join('\n');

    const userMessage = `Cash Flow Analysis for ${period}:

Total Cash & Bank: £${totalCash.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Trade Receivables: £${Math.abs(receivables).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Trade Payables: £${Math.abs(payables).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Net Profit (P&L): £${currentPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Revenue: £${currentPnL.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}

${previousCash !== null ? `Previous period (${previousPeriod}) cash: £${previousCash.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Cash movement: £${(totalCash - previousCash).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : 'No previous period cash data available.'}

${previousPnL ? `Previous period net profit: £${previousPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : ''}

Cash & Bank Accounts:
${cashAccountLines || 'No cash/bank accounts found.'}`;

    // Rate limit + budget checks
    const rateCheck = checkRateLimit(orgId, 'narrative');
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      );
    }

    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted. Upgrade your plan for more.' },
        { status: 402 }
      );
    }

    const llmResult = await callLLMCached({
      systemPrompt,
      userMessage,
      orgId,
      temperature: 0.3,
      model: 'sonnet',
      maxTokens: 4096,
      cacheSystemPrompt: true,
    });
    const responseText = llmResult.response;
    await trackTokenUsage(orgId, llmResult.tokensUsed, 'narrative');

    let result: { narrative: string; reasoning: string; confidence: string };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON in response');
      }
    } catch {
      result = {
        narrative: responseText.slice(0, 500),
        reasoning: 'Failed to parse structured response',
        confidence: 'low',
      };
    }

    const governed = await governedOutput({
      orgId,
      userId: profile.id as string,
      outputType: 'narrative',
      content: result.narrative,
      modelTier: 'sonnet',
      modelId: 'claude-sonnet-4-20250514',
      dataSources: [
        xeroFinancialsSource(period, lastSync?.completed_at as string | undefined),
        companySkillSource('2'),
      ],
      tokensUsed: llmResult.tokensUsed,
      cached: llmResult.cached,
    });

    return NextResponse.json({
      narrative: result.narrative,
      reasoning: result.reasoning,
      confidence: result.confidence,
      period,
      dataFreshness: lastSync?.completed_at || null,
      governanceId: governed.id,
    });
  } catch (err) {
    console.error('[NARRATIVE:CASH-FLOW] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate cash flow narrative' },
      { status: 500 }
    );
  }
}
