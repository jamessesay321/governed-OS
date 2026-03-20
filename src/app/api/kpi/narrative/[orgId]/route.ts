import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';
import { z } from 'zod';

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/**
 * GET /api/kpi/narrative/[orgId]
 * Generate a Claude API narrative summary for KPI performance.
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

    // Fetch KPI snapshots for current period
    const period = parsed.data.period;
    const kpiQuery = supabase
      .from('kpi_snapshots')
      .select('*')
      .eq('org_id', orgId)
      .eq('type', 'universal');

    if (period) {
      kpiQuery.eq('period', period);
    }

    const { data: kpis } = await kpiQuery.order('period', { ascending: false }).limit(30);

    if (!kpis || kpis.length === 0) {
      return NextResponse.json({
        narrative: 'Calculate your KPIs to see performance insights. Connect Xero and sync your data first.',
        reasoning: null,
        confidence: null,
      });
    }

    // Group by period for trend analysis
    const byPeriod: Record<string, Record<string, unknown>[]> = {};
    for (const kpi of kpis) {
      const p = kpi.period as string;
      if (!byPeriod[p]) byPeriod[p] = [];
      byPeriod[p].push(kpi);
    }

    const periods = Object.keys(byPeriod).sort().reverse();
    const currentPeriod = period || periods[0];
    const previousPeriod = periods.length > 1 ? periods[1] : null;

    const currentKPIs = byPeriod[currentPeriod] || [];
    const previousKPIs = previousPeriod ? byPeriod[previousPeriod] || [] : [];

    // Fetch business context
    const { data: orgRaw } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single();

    const org = orgRaw as unknown as { name: string; business_scan?: Record<string, unknown> } | null;

    const businessContext = org?.business_scan
      ? `Business: ${org.business_scan.company_name || org.name || 'Unknown'}, Industry: ${org.business_scan.industry || 'Unknown'}`
      : `Business: ${org?.name || 'Unknown'}`;

    const systemPrompt = `You are the Advisory OS KPI intelligence engine. Generate a concise KPI performance narrative for a UK-based business owner.

Rules:
- Lead with the most actionable KPI insight
- Keep to 2-3 sentences maximum
- Reference specific KPI values and their sector benchmarks where available
- Highlight any KPIs that are significantly above or below benchmark
- If there's a previous period, note the most significant trend
- Be direct — this is for a busy business owner
- Respond with ONLY valid JSON

Output JSON schema:
{
  "narrative": "string — the 2-3 sentence KPI summary",
  "reasoning": "string — brief explanation of why these KPIs matter",
  "confidence": "high | medium | low"
}`;

    const formatKPIs = (kpiList: Record<string, unknown>[]) =>
      kpiList.map((k) => ({
        key: k.kpi_key,
        label: k.label,
        value: k.value,
        formatted: k.formatted_value,
        benchmark: k.sector_benchmark,
        direction: k.direction,
        status: k.status,
      }));

    const userMessage = `${businessContext}

Current period (${currentPeriod}) KPIs:
${JSON.stringify(formatKPIs(currentKPIs), null, 2)}

${previousKPIs.length > 0 ? `Previous period (${previousPeriod}) KPIs:\n${JSON.stringify(formatKPIs(previousKPIs), null, 2)}` : 'No previous period data.'}`;

    const responseText = await callLLM({
      systemPrompt,
      userMessage,
      temperature: 0.3,
    });

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

    return NextResponse.json({
      narrative: result.narrative,
      reasoning: result.reasoning,
      confidence: result.confidence,
      period: currentPeriod,
    });
  } catch (err) {
    console.error('[KPI_NARRATIVE] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate KPI narrative' },
      { status: 500 }
    );
  }
}
