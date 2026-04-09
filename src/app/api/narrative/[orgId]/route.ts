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
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { adaptMappingsFromDB } from '@/lib/financial/adapt-mappings';

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/**
 * GET /api/narrative/[orgId]
 * Generate a Claude API narrative summary for the dashboard.
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

    // Rate limit: 10 LLM calls per minute per org
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

    // Fetch financial data, accounts, mappings, and company skill in parallel
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
    const mappings = adaptMappingsFromDB(
      (mappingsResult.data ?? []) as Array<Record<string, unknown>>,
      accs,
      orgId
    );
    const lastSync = syncResult.data;

    const periods = getAvailablePeriods(fins);
    if (periods.length === 0) {
      return NextResponse.json({
        narrative: 'Connect your Xero account and sync data to see your financial summary.',
        period: null,
        reasoning: null,
        confidence: null,
      });
    }

    const period = parsed.data.period && periods.includes(parsed.data.period)
      ? parsed.data.period
      : periods[0];

    // Build P&L — semantic when mappings exist, class-based fallback
    const hasMappings = mappings.length > 0;
    const currentPnL = buildPnL(fins, accs, period);
    const periodIdx = periods.indexOf(period);
    const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
    const previousPnL = previousPeriod ? buildPnL(fins, accs, previousPeriod) : null;

    // Semantic P&L for richer category-level detail
    const semanticPnL = hasMappings ? buildSemanticPnL(fins, accs, mappings, period) : null;

    const currentData = {
      period,
      revenue: currentPnL.revenue,
      costOfSales: currentPnL.costOfSales,
      grossProfit: currentPnL.grossProfit,
      grossMargin: currentPnL.revenue > 0 ? ((currentPnL.grossProfit / currentPnL.revenue) * 100).toFixed(1) : '0',
      expenses: currentPnL.expenses,
      netProfit: currentPnL.netProfit,
      netMargin: currentPnL.revenue > 0 ? ((currentPnL.netProfit / currentPnL.revenue) * 100).toFixed(1) : '0',
    };

    const previousData = previousPnL ? {
      period: previousPeriod,
      revenue: previousPnL.revenue,
      grossProfit: previousPnL.grossProfit,
      grossMargin: previousPnL.revenue > 0 ? ((previousPnL.grossProfit / previousPnL.revenue) * 100).toFixed(1) : '0',
      expenses: previousPnL.expenses,
      netProfit: previousPnL.netProfit,
      netMargin: previousPnL.revenue > 0 ? ((previousPnL.netProfit / previousPnL.revenue) * 100).toFixed(1) : '0',
    } : null;

    // Build system prompt: Company Skill + narrative-specific instructions
    const systemPrompt = `${companySystemPrompt}

## Narrative Task
This is a UK company. Apply FRS 102/FRS 105 standards as appropriate.
Use ACCA/ICAEW practitioner methodology for ratio analysis.
Reference ISA 570 going concern indicators where relevant.

Generate a concise dashboard narrative summary (2-4 sentences).

Rules:
- Lead with the most important insight
- Reference specific numbers from the data
- If there's a previous period, highlight the most significant change
- Include a brief assessment of overall financial health
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 2-4 sentence summary",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    // Build category-aware P&L breakdown when semantic mappings exist
    const topLines = semanticPnL
      ? semanticPnL.sections
          .flatMap((s) =>
            s.rows.map((r) => ({
              name: r.accountName,
              category: r.categoryLabel,
              amount: r.amount,
              section: s.label,
            }))
          )
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
          .slice(0, 10)
          .map(
            (r) =>
              `- ${r.name} [${r.category}] (${r.section}): £${Math.abs(r.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
          )
          .join('\n')
      : currentPnL.sections
          .flatMap((s) =>
            s.rows.map((r) => ({ name: r.accountName, amount: r.amount, section: s.label }))
          )
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
          .slice(0, 8)
          .map(
            (r) =>
              `- ${r.name} (${r.section}): £${Math.abs(r.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
          )
          .join('\n');

    const userMessage = `Current period (${period}):
${JSON.stringify(currentData, null, 2)}

${previousData ? `Previous period (${previousData.period}):\n${JSON.stringify(previousData, null, 2)}` : 'No previous period data available.'}

Top P&L lines by amount:
${topLines}`;

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
      cacheSystemPrompt: true, // Company skill system prompt is large and reused
    });
    const responseText = llmResult.response;
    await trackTokenUsage(orgId, llmResult.tokensUsed, 'narrative');

    // Parse JSON response
    let result: { narrative: string; reasoning: string; confidence: string };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON in response');
      }
    } catch {
      // Fallback: use raw text as narrative
      result = {
        narrative: responseText.slice(0, 500),
        reasoning: 'Failed to parse structured response',
        confidence: 'low',
      };
    }

    // Pass through governance checkpoint — audit trail + data lineage
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
    console.error('[NARRATIVE] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate narrative' },
      { status: 500 }
    );
  }
}
