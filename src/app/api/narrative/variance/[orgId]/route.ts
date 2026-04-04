import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { buildPnL, buildSemanticPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getSkillAsSystemPrompt } from '@/lib/skills/company-skill';
import { governedOutput, xeroFinancialsSource, accountMappingsSource, companySkillSource } from '@/lib/governance/checkpoint';
import { llmLimiter } from '@/lib/rate-limit';
import { z } from 'zod';
import type { NormalisedFinancial, ChartOfAccount, AccountMapping } from '@/types';

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/**
 * GET /api/narrative/variance/[orgId]
 * Generate a Claude API narrative for the Variance Analysis view.
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

    const [financialsResult, accountsResult, mappingsResult, companySystemPrompt, syncResult] =
      await Promise.all([
        supabase.from('normalised_financials').select('*').eq('org_id', orgId),
        supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
        untypedDb.from('account_mappings').select('*').eq('org_id', orgId),
        getSkillAsSystemPrompt(orgId),
        supabase.from('sync_log').select('completed_at').eq('org_id', orgId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).single(),
      ]);

    const fins = (financialsResult.data ?? []) as NormalisedFinancial[];
    const accs = (accountsResult.data ?? []) as ChartOfAccount[];
    const mappings = (mappingsResult.data ?? []) as AccountMapping[];
    const lastSync = syncResult.data;

    const periods = getAvailablePeriods(fins);
    if (periods.length === 0) {
      return NextResponse.json({
        narrative: 'Connect your Xero account and sync data to see your variance analysis.',
        period: null,
        reasoning: null,
        confidence: null,
      });
    }

    const period = parsed.data.period && periods.includes(parsed.data.period)
      ? parsed.data.period
      : periods[0];

    const hasMappings = mappings.length > 0;
    const currentPnL = buildPnL(fins, accs, period);
    const periodIdx = periods.indexOf(period);
    const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;

    if (!previousPeriod) {
      return NextResponse.json({
        narrative: 'At least two periods of data are needed to perform variance analysis. Continue syncing data from Xero.',
        period,
        reasoning: 'Variance analysis requires comparison between periods.',
        confidence: 'low',
      });
    }

    const previousPnL = buildPnL(fins, accs, previousPeriod);

    // Compute line-item variances
    const accountMap = new Map(accs.map((a) => [a.id, a]));
    const currentPeriodData = fins.filter((f) => f.period === period);
    const previousPeriodData = fins.filter((f) => f.period === previousPeriod);

    const prevAmountMap = new Map(previousPeriodData.map((f) => [f.account_id, Number(f.amount)]));

    const variances = currentPeriodData.map((f) => {
      const acc = accountMap.get(f.account_id);
      const currentAmt = Number(f.amount);
      const prevAmt = prevAmountMap.get(f.account_id) ?? 0;
      const variance = currentAmt - prevAmt;
      const variancePct = prevAmt !== 0 ? ((variance / Math.abs(prevAmt)) * 100) : null;
      return {
        name: acc?.name ?? f.account_id,
        class: acc?.class ?? 'UNKNOWN',
        type: acc?.type ?? 'UNKNOWN',
        current: currentAmt,
        previous: prevAmt,
        variance,
        variancePct,
      };
    }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    // Summary-level variances
    const revenueVariance = currentPnL.revenue - previousPnL.revenue;
    const revenueVariancePct = previousPnL.revenue !== 0 ? ((revenueVariance / Math.abs(previousPnL.revenue)) * 100).toFixed(1) : 'N/A';
    const grossProfitVariance = currentPnL.grossProfit - previousPnL.grossProfit;
    const expenseVariance = currentPnL.expenses - previousPnL.expenses;
    const netProfitVariance = currentPnL.netProfit - previousPnL.netProfit;

    const systemPrompt = `${companySystemPrompt}

## Narrative Task — Variance Analysis
This is a UK-based business. Use GBP. Reference UK tax rules (Corporation Tax, VAT, PAYE, Employer NI, Employer Pension) where relevant.

Generate a concise variance analysis narrative (3-5 sentences) comparing two consecutive periods.

Rules:
- Lead with the most material variance (largest absolute change that impacts the bottom line)
- Classify variances as favourable or unfavourable (green/red thinking)
- For revenue: increase = favourable. For costs/expenses: increase = unfavourable
- Highlight the top 3-5 line-item variances by absolute amount
- Comment on whether variances are driven by volume, price, or mix shifts if discernible
- Flag any concerning trends (e.g., revenue declining while costs rise)
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 3-5 sentence variance analysis",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    const topVariances = variances.slice(0, 10).map((v) =>
      `- ${v.name} (${v.class}): £${v.current.toLocaleString('en-GB', { minimumFractionDigits: 2 })} vs £${v.previous.toLocaleString('en-GB', { minimumFractionDigits: 2 })} = £${v.variance.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${v.variancePct !== null ? v.variancePct.toFixed(1) + '%' : 'new'})`
    ).join('\n');

    const userMessage = `Variance Analysis: ${period} vs ${previousPeriod}

Summary:
Revenue: £${currentPnL.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })} vs £${previousPnL.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${revenueVariancePct}%)
Gross Profit: £${currentPnL.grossProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })} vs £${previousPnL.grossProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Operating Expenses: £${Math.abs(currentPnL.expenses).toLocaleString('en-GB', { minimumFractionDigits: 2 })} vs £${Math.abs(previousPnL.expenses).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
Net Profit: £${currentPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })} vs £${previousPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}

Top Line-Item Variances (sorted by absolute change):
${topVariances}`;

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
        ...(hasMappings ? [accountMappingsSource(mappings.length)] : []),
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
    console.error('[NARRATIVE:VARIANCE] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate variance narrative' },
      { status: 500 }
    );
  }
}
