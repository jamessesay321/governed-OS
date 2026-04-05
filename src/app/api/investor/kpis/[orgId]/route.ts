import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { calculateKPIs, type CalculatedKPI } from '@/lib/kpi/engine';

const ParamsSchema = z.object({
  orgId: z.string().uuid('Valid org ID required'),
});

const QuerySchema = z.object({
  period: z.string().optional(),
  months: z.coerce.number().int().min(1).max(24).default(12),
});

/**
 * GET /api/investor/kpis/[orgId]
 * Returns curated KPI data for an investor, filtered by investor_shared_metrics.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const resolvedParams = await params;
    const paramsParsed = ParamsSchema.safeParse(resolvedParams);
    if (!paramsParsed.success) {
      return NextResponse.json(
        { error: 'Invalid org ID', details: paramsParsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orgId } = paramsParsed.data;

    // Parse query params
    const url = new URL(request.url);
    const queryParsed = QuerySchema.safeParse({
      period: url.searchParams.get('period') ?? undefined,
      months: url.searchParams.get('months') ?? 12,
    });
    if (!queryParsed.success) {
      return NextResponse.json(
        { error: 'Invalid query params', details: queryParsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { months } = queryParsed.data;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Verify investor has access to this org
    const serviceClient = await createServiceClient();
    const { data: access } = await serviceClient
      .from('investor_organisations')
      .select('id, access_level')
      .eq('investor_user_id', user.id)
      .eq('org_id', orgId)
      .not('accepted_at', 'is', null)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch shared metric keys for this org
    const { data: sharedMetrics } = await serviceClient
      .from('investor_shared_metrics')
      .select('metric_key, is_shared')
      .eq('org_id', orgId)
      .eq('is_shared', true);

    const sharedKeys = new Set((sharedMetrics ?? []).map((m: Record<string, unknown>) => m.metric_key as string));

    // Fetch available periods from normalised_financials
    const { data: financials } = await serviceClient
      .from('normalised_financials')
      .select('period')
      .eq('org_id', orgId);

    const allPeriods = financials
      ? [...new Set(financials.map((r: { period: string }) => r.period))].sort().reverse()
      : [];

    const periodsToFetch = allPeriods.slice(0, months);

    if (periodsToFetch.length === 0) {
      return NextResponse.json({
        kpis: [],
        periods: [],
        lastSyncDate: null,
        message: 'No financial data available yet',
      });
    }

    // Calculate KPIs for latest period
    const latestPeriod = periodsToFetch[0] as string;
    const allKpis = await calculateKPIs(orgId, latestPeriod);

    // Filter to only shared metrics (if any shared metrics are configured)
    let filteredKpis: CalculatedKPI[];
    if (sharedKeys.size > 0) {
      filteredKpis = allKpis.filter((kpi) => sharedKeys.has(kpi.key));
    } else {
      // If no shared metrics configured, show a safe default set
      const defaultKeys = new Set([
        'revenue',
        'gross_margin',
        'net_margin',
        'current_ratio',
        'revenue_growth_mom',
      ]);
      filteredKpis = allKpis.filter((kpi) => defaultKeys.has(kpi.key));
    }

    // Build revenue trend data for the chart (last N months)
    const revenueTrend: { period: string; revenue: number }[] = [];
    for (const period of periodsToFetch.reverse()) {
      try {
        const periodKpis = await calculateKPIs(orgId, period as string);
        const revenueKpi = periodKpis.find((k) => k.key === 'revenue');
        revenueTrend.push({
          period: period as string,
          revenue: revenueKpi?.value ? revenueKpi.value / 100 : 0, // Convert pence to pounds
        });
      } catch {
        revenueTrend.push({ period: period as string, revenue: 0 });
      }
    }

    // Fetch last sync date
    const { data: lastSync } = await serviceClient
      .from('sync_log')
      .select('completed_at')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      kpis: filteredKpis,
      revenueTrend,
      periods: periodsToFetch,
      latestPeriod,
      lastSyncDate: lastSync?.completed_at ?? null,
    });
  } catch (err) {
    console.error('[investor-kpis] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
