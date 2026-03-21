import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { llmLimiter } from '@/lib/rate-limit';
import { z } from 'zod';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

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

    // Fetch financial data
    const { data: financials } = await supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId);

    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('org_id', orgId);

    const fins = (financials ?? []) as NormalisedFinancial[];
    const accs = (accounts ?? []) as ChartOfAccount[];

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

    // Build P&L for current and previous period
    const currentPnL = buildPnL(fins, accs, period);
    const periodIdx = periods.indexOf(period);
    const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
    const previousPnL = previousPeriod ? buildPnL(fins, accs, previousPeriod) : null;

    // Fetch last sync time for data freshness
    const { data: lastSync } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch business profile for context
    // TODO: Regenerate Supabase types after migration to remove this cast
    const { data: orgRaw } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single();

    // business_scan column exists but isn't in generated types yet
    const org = orgRaw as unknown as { name: string; business_scan?: Record<string, unknown> } | null;

    // Build context for Claude API
    const businessContext = org?.business_scan
      ? `Business: ${org.business_scan.company_name || org.name || 'Unknown'}, Industry: ${org.business_scan.industry || 'Unknown'}, Stage: ${org.business_scan.estimated_stage || 'Unknown'}`
      : `Business: ${org?.name || 'Unknown'}`;

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

    const systemPrompt = `You are the Advisory OS financial intelligence engine. Generate a concise dashboard narrative summary for a UK-based business owner.

Rules:
- Use £ currency, formatted with commas (e.g. £79,000)
- Lead with the most important insight
- Keep to 2-4 sentences maximum
- Reference specific numbers from the data
- If there's a previous period, highlight the most significant change
- Include a brief assessment of overall financial health
- Be direct and actionable — this is for a busy business owner
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 2-4 sentence summary",
  "reasoning": "string — brief explanation of why you highlighted these points",
  "confidence": "high | medium | low"
}`;

    const userMessage = `${businessContext}

Current period (${period}):
${JSON.stringify(currentData, null, 2)}

${previousData ? `Previous period (${previousData.period}):\n${JSON.stringify(previousData, null, 2)}` : 'No previous period data available.'}

Top P&L lines by amount:
${currentPnL.sections
  .flatMap(s => s.rows.map(r => ({ name: r.accountName, amount: r.amount, section: s.label })))
  .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  .slice(0, 8)
  .map(r => `- ${r.name} (${r.section}): £${Math.abs(r.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`)
  .join('\n')}`;

    const responseText = await callLLM({
      systemPrompt,
      userMessage,
      temperature: 0.3,
    });

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

    return NextResponse.json({
      narrative: result.narrative,
      reasoning: result.reasoning,
      confidence: result.confidence,
      period,
      dataFreshness: lastSync?.completed_at || null,
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
