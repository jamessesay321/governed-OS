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
 * GET /api/narrative/revenue/[orgId]
 * Generate a Claude API narrative for the Revenue deep-dive view.
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
        narrative: 'Connect your Xero account and sync data to see your revenue analysis.',
        period: null,
        reasoning: null,
        confidence: null,
      });
    }

    const period = parsed.data.period && periods.includes(parsed.data.period)
      ? parsed.data.period
      : periods[0];

    const accountMap = new Map(accs.map((a) => [a.id, a]));

    // Extract revenue accounts for current period
    const currentRevenueItems = fins
      .filter((f) => f.period === period)
      .filter((f) => {
        const acc = accountMap.get(f.account_id);
        return acc && (acc.class === 'REVENUE' || acc.class === 'OTHERINCOME');
      })
      .map((f) => ({
        name: accountMap.get(f.account_id)?.name ?? f.account_id,
        type: accountMap.get(f.account_id)?.type ?? 'REVENUE',
        amount: Number(f.amount),
      }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const totalRevenue = currentRevenueItems.reduce((sum, a) => sum + a.amount, 0);

    // Revenue trend across recent periods (up to 6)
    const trendPeriods = periods.slice(0, Math.min(6, periods.length));
    const revenueTrend = trendPeriods.map((p) => {
      const pnl = buildPnL(fins, accs, p);
      return { period: p, revenue: pnl.revenue };
    });

    // Previous period comparison
    const periodIdx = periods.indexOf(period);
    const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
    const previousPnL = previousPeriod ? buildPnL(fins, accs, previousPeriod) : null;

    // Revenue concentration: top account as % of total
    const topRevenueAccount = currentRevenueItems[0];
    const concentrationPct = totalRevenue !== 0 && topRevenueAccount
      ? ((Math.abs(topRevenueAccount.amount) / Math.abs(totalRevenue)) * 100).toFixed(1)
      : 'N/A';

    const systemPrompt = `${companySystemPrompt}

## Narrative Task — Revenue Analysis
This is a UK company. Apply FRS 102/FRS 105 standards as appropriate.
Use ACCA/ICAEW practitioner methodology for ratio analysis.
Use GBP. Reference UK tax rules (Corporation Tax with marginal relief, VAT) where relevant.

Generate a concise revenue narrative (3-5 sentences) providing a deep-dive into revenue performance.

Rules:
- Lead with total revenue and month-over-month growth rate
- Break down revenue by stream/account — identify the largest contributors
- Assess revenue concentration risk (is the business over-reliant on one stream?)
- Comment on the revenue trend over recent periods (growing, flat, or declining)
- If there's a previous period, highlight the most significant revenue changes
- Note any seasonality patterns if visible in the trend data
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 3-5 sentence revenue analysis",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    const revenueLines = currentRevenueItems.slice(0, 10)
      .map((r) => `- ${r.name}: £${Math.abs(r.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${totalRevenue !== 0 ? ((Math.abs(r.amount) / Math.abs(totalRevenue)) * 100).toFixed(1) : '0'}% of total)`)
      .join('\n');

    const trendLine = revenueTrend
      .map((t) => `${t.period}: £${t.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
      .join(' | ');

    const userMessage = `Revenue Analysis for ${period}:

Total Revenue: £${Math.abs(totalRevenue).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
${previousPnL ? `Previous Period Revenue (${previousPeriod}): £${Math.abs(previousPnL.revenue).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Growth: £${(Math.abs(totalRevenue) - Math.abs(previousPnL.revenue)).toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${previousPnL.revenue !== 0 ? (((totalRevenue - previousPnL.revenue) / Math.abs(previousPnL.revenue)) * 100).toFixed(1) : 'N/A'}%)` : 'No previous period data.'}

Revenue Concentration: Top stream is ${concentrationPct}% of total revenue

Revenue by Stream:
${revenueLines || 'No revenue accounts found.'}

Revenue Trend (recent periods):
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
    console.error('[NARRATIVE:REVENUE] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate revenue narrative' },
      { status: 500 }
    );
  }
}
