import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  ensureKpisSeeded,
  currentMonthPeriod,
  previousMonthPeriod,
} from '@/lib/reconciliation/engine';
import { ReconciliationClient } from './reconciliation-client';

export default async function ReconciliationPage() {
  const { orgId, role } = await getUserProfile();

  // Make sure the KPI registry is populated so the matrix renders something
  // on first visit, even before any reconciliation has been run.
  await ensureKpisSeeded(orgId);

  const supabase = await createUntypedServiceClient();
  const period = currentMonthPeriod();
  const prevPeriod = previousMonthPeriod(period);

  const [{ data: kpis }, { data: runs }, { data: drifts }] = await Promise.all([
    supabase
      .from('reconciliation_kpis')
      .select(
        'id, kpi_key, label, category, primary_source, informational, sources, drift_thresholds, enabled'
      )
      .eq('org_id', orgId)
      .order('label'),
    supabase
      .from('reconciliation_runs')
      .select(
        'id, kpi_id, period, status, primary_value, max_drift_pct, source_values, completed_at, error'
      )
      .eq('org_id', orgId)
      .in('period', [period, prevPeriod])
      .order('completed_at', { ascending: false }),
    supabase
      .from('drift_log')
      .select(
        'id, period, drift_pct, drift_amount, status, severity, root_cause, resolution, opened_at, closed_at, kpi_id, run_id'
      )
      .eq('org_id', orgId)
      .order('opened_at', { ascending: false })
      .limit(200),
  ]);

  return (
    <ReconciliationClient
      orgId={orgId}
      role={role}
      currentPeriod={period}
      previousPeriod={prevPeriod}
      kpis={(kpis ?? []) as unknown as KpiRow[]}
      runs={(runs ?? []) as unknown as RunRow[]}
      drifts={(drifts ?? []) as unknown as DriftRow[]}
    />
  );
}

// Re-exported here so the client component can import the same shapes.
export interface KpiRow {
  id: string;
  kpi_key: string;
  label: string;
  category: string;
  primary_source: string;
  informational: boolean;
  sources: Array<{ integration: string; query_hint: string }>;
  drift_thresholds: { green_pct: number; amber_pct: number };
  enabled: boolean;
}

export interface RunRow {
  id: string;
  kpi_id: string;
  period: string;
  status: 'green' | 'amber' | 'red' | 'informational' | 'error';
  primary_value: number | null;
  max_drift_pct: number | null;
  source_values: Array<{
    integration: string;
    value: number | null;
    queried_at: string;
    error?: string;
    meta?: Record<string, unknown>;
  }>;
  completed_at: string;
  error: string | null;
}

export interface DriftRow {
  id: string;
  period: string;
  drift_pct: number;
  drift_amount: number;
  status: 'open' | 'investigating' | 'resolved' | 'wont_fix';
  severity: 'amber' | 'red';
  root_cause: string | null;
  resolution: string | null;
  opened_at: string;
  closed_at: string | null;
  kpi_id: string;
  run_id: string;
}
