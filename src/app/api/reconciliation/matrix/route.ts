import { NextResponse, type NextRequest } from 'next/server';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { ensureKpisSeeded, currentMonthPeriod } from '@/lib/reconciliation/engine';

/**
 * GET /api/reconciliation/matrix?period=YYYY-MM-01
 *
 * Returns matrix-view data: for each KPI for the org, the most-recent
 * reconciliation_run for the requested period. Sources are exposed alongside
 * the value each one returned, plus the run-level status / drift_pct.
 *
 * KPIs that have never been reconciled appear with status = 'never_run' and
 * empty source values so the UI can render them as "—".
 */
export async function GET(req: NextRequest) {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const url = new URL(req.url);
    const period = url.searchParams.get('period') ?? currentMonthPeriod();

    if (!/^\d{4}-\d{2}-01$/.test(period)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    await ensureKpisSeeded(orgId);

    const supabase = await createUntypedServiceClient();

    // Pull all KPIs (so KPIs that haven't run yet still show in the matrix)
    const { data: kpis, error: kpiErr } = await supabase
      .from('reconciliation_kpis')
      .select('id, kpi_key, label, category, primary_source, informational, sources, drift_thresholds, enabled')
      .eq('org_id', orgId)
      .order('label', { ascending: true });

    if (kpiErr) {
      return NextResponse.json({ error: kpiErr.message }, { status: 500 });
    }

    // Pull most-recent run per KPI for the requested period
    const { data: runs, error: runErr } = await supabase
      .from('reconciliation_runs')
      .select('id, kpi_id, period, status, primary_value, max_drift_pct, source_values, completed_at, error')
      .eq('org_id', orgId)
      .eq('period', period)
      .order('completed_at', { ascending: false });

    if (runErr) {
      return NextResponse.json({ error: runErr.message }, { status: 500 });
    }

    // Reduce to first run per kpi_id (most recent)
    const latestByKpi = new Map<string, NonNullable<typeof runs>[number]>();
    for (const r of runs ?? []) {
      if (!latestByKpi.has(r.kpi_id)) {
        latestByKpi.set(r.kpi_id, r);
      }
    }

    const allIntegrations = new Set<string>();
    const rows = (kpis ?? []).map((k: {
      id: string;
      kpi_key: string;
      label: string;
      category: string;
      primary_source: string;
      informational: boolean;
      sources: Array<{ integration: string; query_hint: string }>;
      drift_thresholds: { green_pct: number; amber_pct: number };
      enabled: boolean;
    }) => {
      const sourcesList = (k.sources ?? []).map((s) => s.integration);
      sourcesList.forEach((s) => allIntegrations.add(s));

      const run = latestByKpi.get(k.id);

      return {
        kpi_id: k.id,
        kpi_key: k.kpi_key,
        label: k.label,
        category: k.category,
        primary_source: k.primary_source,
        informational: k.informational,
        sources: sourcesList,
        drift_thresholds: k.drift_thresholds,
        enabled: k.enabled,
        run: run
          ? {
              run_id: run.id,
              status: run.status,
              primary_value: run.primary_value,
              max_drift_pct: run.max_drift_pct,
              source_values: run.source_values,
              completed_at: run.completed_at,
              error: run.error,
            }
          : null,
      };
    });

    return NextResponse.json({
      period,
      integrations: Array.from(allIntegrations).sort(),
      kpis: rows,
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('[RECON MATRIX] error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
