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
 * GET /api/narrative/profitability/[orgId]
 * Generate a Claude API narrative for the Profitability deep-dive view.
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
        narrative: 'Connect your Xero account and sync data to see your profitability analysis.',
        period: null,
        reasoning: null,
        confidence: null,
      });
    }

    const period = parsed.data.period && periods.includes(parsed.data.period)
      ? parsed.data.period
      : periods[0];

    // Build P&L for current and recent periods
    const currentPnL = buildPnL(fins, accs, period);
    const periodIdx = periods.indexOf(period);
    const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
    const previousPnL = previousPeriod ? buildPnL(fins, accs, previousPeriod) : null;

    // Margin calculations
    const grossMargin = currentPnL.revenue > 0 ? ((currentPnL.grossProfit / currentPnL.revenue) * 100) : 0;
    const netMargin = currentPnL.revenue > 0 ? ((currentPnL.netProfit / currentPnL.revenue) * 100) : 0;
    const opexRatio = currentPnL.revenue > 0 ? ((Math.abs(currentPnL.expenses) / currentPnL.revenue) * 100) : 0;
    const cosRatio = currentPnL.revenue > 0 ? ((Math.abs(currentPnL.costOfSales) / currentPnL.revenue) * 100) : 0;

    const prevGrossMargin = previousPnL && previousPnL.revenue > 0
      ? ((previousPnL.grossProfit / previousPnL.revenue) * 100) : null;
    const prevNetMargin = previousPnL && previousPnL.revenue > 0
      ? ((previousPnL.netProfit / previousPnL.revenue) * 100) : null;

    // Profitability trend across recent periods (up to 6)
    const trendPeriods = periods.slice(0, Math.min(6, periods.length));
    const profitabilityTrend = trendPeriods.map((p) => {
      const pnl = buildPnL(fins, accs, p);
      return {
        period: p,
        grossMargin: pnl.revenue > 0 ? ((pnl.grossProfit / pnl.revenue) * 100).toFixed(1) : '0',
        netMargin: pnl.revenue > 0 ? ((pnl.netProfit / pnl.revenue) * 100).toFixed(1) : '0',
        netProfit: pnl.netProfit,
      };
    });

    // Top expense items eating into profit
    const accountMap = new Map(accs.map((a) => [a.id, a]));
    const expenseItems = fins
      .filter((f) => f.period === period)
      .filter((f) => {
        const acc = accountMap.get(f.account_id);
        return acc && (acc.class === 'EXPENSE' || acc.class === 'OVERHEADS');
      })
      .map((f) => ({
        name: accountMap.get(f.account_id)?.name ?? f.account_id,
        amount: Math.abs(Number(f.amount)),
      }))
      .sort((a, b) => b.amount - a.amount);

    const systemPrompt = `${companySystemPrompt}

## Narrative Task — Profitability Analysis
This is a UK-based business. Use GBP. Reference UK tax rules (Corporation Tax, VAT, PAYE, Employer NI, Employer Pension) where relevant.

Generate a concise profitability narrative (3-5 sentences) that analyses margin performance and cost efficiency.

Rules:
- Lead with the headline profitability metric (net margin) and whether it's healthy for this type of business
- Break down the margin waterfall: gross margin -> operating margin -> net margin
- Identify the biggest cost drivers eroding profitability
- Compare operating expense ratio to revenue — is the cost base scalable?
- If there's a previous period, highlight margin expansion or compression
- Comment on the profitability trend direction over recent periods
- Suggest the single biggest lever to improve margins
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 3-5 sentence profitability analysis",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    const topExpenseLines = expenseItems.slice(0, 8)
      .map((e) => `- ${e.name}: £${e.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${currentPnL.revenue > 0 ? ((e.amount / currentPnL.revenue) * 100).toFixed(1) : '0'}% of revenue)`)
      .join('\n');

    const trendLine = profitabilityTrend
      .map((t) => `${t.period}: GM ${t.grossMargin}% / NM ${t.netMargin}%`)
      .join(' | ');

    const userMessage = `Profitability Analysis for ${period}:

Revenue: £${currentPnL.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Cost of Sales: £${Math.abs(currentPnL.costOfSales).toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${cosRatio.toFixed(1)}% of revenue)
Gross Profit: £${currentPnL.grossProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Gross Margin: ${grossMargin.toFixed(1)}%
Operating Expenses: £${Math.abs(currentPnL.expenses).toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${opexRatio.toFixed(1)}% of revenue)
Net Profit: £${currentPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Net Margin: ${netMargin.toFixed(1)}%

${previousPnL ? `Previous period (${previousPeriod}):
Gross Margin: ${prevGrossMargin?.toFixed(1)}% | Net Margin: ${prevNetMargin?.toFixed(1)}%
Margin change: Gross ${(grossMargin - (prevGrossMargin ?? 0)).toFixed(1)}pp | Net ${(netMargin - (prevNetMargin ?? 0)).toFixed(1)}pp` : 'No previous period data.'}

Top Expense Items:
${topExpenseLines || 'No expense data.'}

Margin Trend (recent periods):
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
    console.error('[NARRATIVE:PROFITABILITY] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate profitability narrative' },
      { status: 500 }
    );
  }
}
