import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { getSkillAsSystemPrompt } from '@/lib/skills/company-skill';
import { governedOutput, xeroFinancialsSource, companySkillSource } from '@/lib/governance/checkpoint';
import { llmLimiter } from '@/lib/rate-limit';
import { z } from 'zod';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/**
 * GET /api/narrative/balance-sheet/[orgId]
 * Generate a Claude API narrative for the Balance Sheet view.
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
        narrative: 'Connect your Xero account and sync data to see your balance sheet analysis.',
        period: null,
        reasoning: null,
        confidence: null,
      });
    }

    const period = parsed.data.period && periods.includes(parsed.data.period)
      ? parsed.data.period
      : periods[0];

    // Aggregate balance sheet accounts by class
    const periodData = fins.filter((f) => f.period === period);
    const accountMap = new Map(accs.map((a) => [a.id, a]));

    const balanceSheetClasses = ['ASSET', 'LIABILITY', 'EQUITY'];
    const balanceSheet: Record<string, { accounts: { name: string; amount: number; type: string }[]; total: number }> = {};

    for (const cls of balanceSheetClasses) {
      const classAccounts = periodData
        .filter((f) => {
          const acc = accountMap.get(f.account_id);
          return acc && acc.class === cls;
        })
        .map((f) => {
          const acc = accountMap.get(f.account_id);
          return {
            name: acc?.name ?? f.account_id,
            amount: Number(f.amount),
            type: acc?.type ?? 'UNKNOWN',
          };
        })
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

      balanceSheet[cls] = {
        accounts: classAccounts,
        total: classAccounts.reduce((sum, a) => sum + a.amount, 0),
      };
    }

    const totalAssets = balanceSheet['ASSET']?.total ?? 0;
    const totalLiabilities = balanceSheet['LIABILITY']?.total ?? 0;
    const totalEquity = balanceSheet['EQUITY']?.total ?? 0;
    const netAssets = totalAssets + totalLiabilities; // liabilities are negative

    // Previous period for comparison
    const periodIdx = periods.indexOf(period);
    const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
    let previousBalanceSheet: { totalAssets: number; totalLiabilities: number; totalEquity: number } | null = null;

    if (previousPeriod) {
      const prevData = fins.filter((f) => f.period === previousPeriod);
      const prevAssets = prevData.filter((f) => accountMap.get(f.account_id)?.class === 'ASSET').reduce((s, f) => s + Number(f.amount), 0);
      const prevLiabilities = prevData.filter((f) => accountMap.get(f.account_id)?.class === 'LIABILITY').reduce((s, f) => s + Number(f.amount), 0);
      const prevEquity = prevData.filter((f) => accountMap.get(f.account_id)?.class === 'EQUITY').reduce((s, f) => s + Number(f.amount), 0);
      previousBalanceSheet = { totalAssets: prevAssets, totalLiabilities: prevLiabilities, totalEquity: prevEquity };
    }

    const systemPrompt = `${companySystemPrompt}

## Narrative Task — Balance Sheet Analysis
This is a UK-based business. Use GBP. Reference UK tax rules (Corporation Tax, VAT, PAYE, Employer NI, Employer Pension) where relevant.

Generate a concise balance sheet narrative (3-5 sentences) that analyses the financial position.

Rules:
- Lead with net asset position and overall financial strength
- Break down assets (current vs fixed if distinguishable), liabilities, and equity
- Calculate and comment on the debt-to-equity ratio if liabilities and equity are both present
- Highlight the largest asset and liability items
- If there's a previous period, note significant changes in working capital or debt levels
- Assess liquidity and solvency implications
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 3-5 sentence balance sheet analysis",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    const topAssets = (balanceSheet['ASSET']?.accounts ?? []).slice(0, 8)
      .map((a) => `- ${a.name} (${a.type}): £${Math.abs(a.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      .join('\n');

    const topLiabilities = (balanceSheet['LIABILITY']?.accounts ?? []).slice(0, 8)
      .map((a) => `- ${a.name} (${a.type}): £${Math.abs(a.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      .join('\n');

    const equityItems = (balanceSheet['EQUITY']?.accounts ?? []).slice(0, 5)
      .map((a) => `- ${a.name}: £${Math.abs(a.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      .join('\n');

    const userMessage = `Balance Sheet as at ${period}:
Total Assets: £${Math.abs(totalAssets).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Total Liabilities: £${Math.abs(totalLiabilities).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Total Equity: £${Math.abs(totalEquity).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Net Assets: £${Math.abs(netAssets).toLocaleString('en-GB', { minimumFractionDigits: 2 })}

${previousBalanceSheet ? `Previous period (${previousPeriod}):
Total Assets: £${Math.abs(previousBalanceSheet.totalAssets).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Total Liabilities: £${Math.abs(previousBalanceSheet.totalLiabilities).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Total Equity: £${Math.abs(previousBalanceSheet.totalEquity).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : 'No previous period data available.'}

Top Assets:
${topAssets || 'No asset data.'}

Top Liabilities:
${topLiabilities || 'No liability data.'}

Equity:
${equityItems || 'No equity data.'}`;

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
    console.error('[NARRATIVE:BALANCE-SHEET] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate balance sheet narrative' },
      { status: 500 }
    );
  }
}
