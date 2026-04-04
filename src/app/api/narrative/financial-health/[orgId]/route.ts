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
 * GET /api/narrative/financial-health/[orgId]
 * Generate a Claude API narrative for the Financial Health overview.
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
        narrative: 'Connect your Xero account and sync data to see your financial health assessment.',
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

    // P&L metrics
    const currentPnL = buildPnL(fins, accs, period);
    const grossMargin = currentPnL.revenue > 0 ? ((currentPnL.grossProfit / currentPnL.revenue) * 100) : 0;
    const netMargin = currentPnL.revenue > 0 ? ((currentPnL.netProfit / currentPnL.revenue) * 100) : 0;

    // Balance sheet metrics
    const totalAssets = periodData
      .filter((f) => accountMap.get(f.account_id)?.class === 'ASSET')
      .reduce((sum, f) => sum + Number(f.amount), 0);
    const totalLiabilities = periodData
      .filter((f) => accountMap.get(f.account_id)?.class === 'LIABILITY')
      .reduce((sum, f) => sum + Number(f.amount), 0);
    const totalEquity = periodData
      .filter((f) => accountMap.get(f.account_id)?.class === 'EQUITY')
      .reduce((sum, f) => sum + Number(f.amount), 0);

    // Cash position
    const totalCash = periodData
      .filter((f) => {
        const acc = accountMap.get(f.account_id);
        return acc && (acc.type === 'BANK' || acc.name?.toLowerCase().includes('cash'));
      })
      .reduce((sum, f) => sum + Number(f.amount), 0);

    // Current ratio (current assets / current liabilities)
    const currentAssets = periodData
      .filter((f) => {
        const acc = accountMap.get(f.account_id);
        return acc && acc.class === 'ASSET' && (acc.type === 'CURRENT' || acc.type === 'BANK');
      })
      .reduce((sum, f) => sum + Number(f.amount), 0);
    const currentLiabilities = periodData
      .filter((f) => accountMap.get(f.account_id)?.type === 'CURRLIAB')
      .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);
    const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : null;

    // Debt-to-equity
    const debtToEquity = Math.abs(totalEquity) > 0 ? (Math.abs(totalLiabilities) / Math.abs(totalEquity)) : null;

    // Cash runway (months of expenses covered by cash)
    const monthlyExpenses = Math.abs(currentPnL.expenses) + Math.abs(currentPnL.costOfSales);
    const cashRunway = monthlyExpenses > 0 ? (totalCash / monthlyExpenses) : null;

    // Trend data (up to 6 periods)
    const trendPeriods = periods.slice(0, Math.min(6, periods.length));
    const healthTrend = trendPeriods.map((p) => {
      const pnl = buildPnL(fins, accs, p);
      const pData = fins.filter((f) => f.period === p);
      const pCash = pData
        .filter((f) => {
          const acc = accountMap.get(f.account_id);
          return acc && (acc.type === 'BANK' || acc.name?.toLowerCase().includes('cash'));
        })
        .reduce((sum, f) => sum + Number(f.amount), 0);
      return {
        period: p,
        revenue: pnl.revenue,
        netProfit: pnl.netProfit,
        cash: pCash,
      };
    });

    const systemPrompt = `${companySystemPrompt}

## Narrative Task — Financial Health Assessment
This is a UK-based business. Use GBP. Reference UK tax rules (Corporation Tax, VAT, PAYE, Employer NI, Employer Pension) where relevant.

Generate a concise financial health narrative (4-6 sentences) that provides a holistic assessment of the business's financial position.

Rules:
- Lead with an overall health verdict: healthy, cautious, or concerning — with the key reason
- Assess profitability (margins), liquidity (current ratio, cash runway), and solvency (debt-to-equity)
- Rate each dimension: strong/adequate/weak
- Highlight the single biggest financial risk the business faces right now
- Highlight the single biggest financial strength or opportunity
- Comment on the trend direction — is health improving or deteriorating?
- If cash runway is less than 3 months, flag it as urgent
- Provide one actionable recommendation for the business owner
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 4-6 sentence financial health assessment",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    const trendLine = healthTrend
      .map((t) => `${t.period}: Rev £${t.revenue.toLocaleString('en-GB')} / NP £${t.netProfit.toLocaleString('en-GB')} / Cash £${t.cash.toLocaleString('en-GB')}`)
      .join('\n');

    const userMessage = `Financial Health Assessment for ${period}:

PROFITABILITY:
Revenue: £${currentPnL.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Gross Margin: ${grossMargin.toFixed(1)}%
Net Margin: ${netMargin.toFixed(1)}%
Net Profit: £${currentPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}

LIQUIDITY:
Cash & Bank: £${totalCash.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Current Assets: £${currentAssets.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Current Liabilities: £${currentLiabilities.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Current Ratio: ${currentRatio !== null ? currentRatio.toFixed(2) : 'N/A'}
Cash Runway: ${cashRunway !== null ? cashRunway.toFixed(1) + ' months' : 'N/A'}

SOLVENCY:
Total Assets: £${Math.abs(totalAssets).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Total Liabilities: £${Math.abs(totalLiabilities).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Total Equity: £${Math.abs(totalEquity).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Debt-to-Equity Ratio: ${debtToEquity !== null ? debtToEquity.toFixed(2) : 'N/A'}

TREND (recent periods):
${trendLine}`;

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
      outputType: 'health_summary',
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
    console.error('[NARRATIVE:FINANCIAL-HEALTH] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate financial health narrative' },
      { status: 500 }
    );
  }
}
