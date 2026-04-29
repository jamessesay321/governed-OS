/**
 * Reconciliation Engine — Reconciliation Centre
 * -----------------------------------------------
 * Pure orchestration: pull values from each source, compare them, write a run
 * record, and (when drift is amber/red) open a drift_log entry.
 *
 * NO LLM calls here. Compare-and-flag only.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  KPI_DEFINITIONS,
  getKpiDefinition,
  type KpiDefinition,
} from './kpi-definitions';
import { detectDrift, type DriftResult, type RunStatus } from './drift-detector';
import type { SourceValue } from './source-fetchers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TriggeredBy = 'cron' | 'webhook' | 'manual';

export interface ReconciliationResult {
  runId: string;
  kpiId: string;
  kpiKey: string;
  period: string;
  status: RunStatus;
  primaryValue: number | null;
  maxDriftPct: number;
  sourceValues: SourceValue[];
  perSourceDriftPct: DriftResult['perSourceDriftPct'];
  driftId?: string;
  error?: string;
}

interface KpiRow {
  id: string;
  org_id: string;
  kpi_key: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Ensure that all KPI_DEFINITIONS exist as reconciliation_kpis rows for the org.
 * Idempotent — safe to call before every run.
 */
export async function ensureKpisSeeded(orgId: string): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { data: existingRows } = await supabase
    .from('reconciliation_kpis')
    .select('kpi_key')
    .eq('org_id', orgId);

  const existing = new Set(
    (existingRows ?? []).map((r: { kpi_key: string }) => r.kpi_key)
  );

  const toInsert = KPI_DEFINITIONS.filter((d) => !existing.has(d.kpi_key)).map(
    (d) => ({
      org_id: orgId,
      kpi_key: d.kpi_key,
      label: d.label,
      category: d.category,
      period_grain: d.period_grain,
      primary_source: d.primary_source,
      informational: d.informational,
      drift_thresholds: d.drift_thresholds,
      sources: d.sources.map((s) => ({
        integration: s.integration,
        query_hint: s.query_hint,
      })),
      enabled: true,
    })
  );

  if (toInsert.length === 0) return;

  const { error } = await supabase
    .from('reconciliation_kpis')
    .insert(toInsert);
  if (error) {
    console.error('[RECON] Failed to seed KPIs:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Run reconciliation for a single KPI + period and persist the results.
 */
export async function runReconciliation(
  orgId: string,
  kpiKey: string,
  period: string,
  triggeredBy: TriggeredBy = 'manual'
): Promise<ReconciliationResult> {
  const definition = getKpiDefinition(kpiKey);
  if (!definition) {
    throw new Error(`Unknown KPI: ${kpiKey}`);
  }

  // Look up the KPI row for this org (seed first if missing)
  await ensureKpisSeeded(orgId);
  const supabase = await createUntypedServiceClient();
  const { data: kpiRow, error: kpiErr } = await supabase
    .from('reconciliation_kpis')
    .select('id, org_id, kpi_key, enabled')
    .eq('org_id', orgId)
    .eq('kpi_key', kpiKey)
    .single();

  if (kpiErr || !kpiRow) {
    throw new Error(`KPI row not found for ${kpiKey}: ${kpiErr?.message}`);
  }
  const kpi = kpiRow as KpiRow;

  // Fetch all source values in parallel
  const sourceValues: SourceValue[] = await Promise.all(
    definition.sources.map((s) =>
      s.fetcher(orgId, period).catch(
        (err): SourceValue => ({
          integration: s.integration,
          value: null,
          queried_at: new Date().toISOString(),
          error: err instanceof Error ? err.message : 'unknown_error',
        })
      )
    )
  );

  // Detect drift
  const drift = detectDrift(definition, sourceValues);

  // Persist run
  const serviceClient = await createUntypedServiceClient();
  const { data: runRow, error: runErr } = await serviceClient
    .from('reconciliation_runs')
    .insert({
      org_id: orgId,
      kpi_id: kpi.id,
      period,
      triggered_by: triggeredBy,
      source_values: sourceValues,
      primary_value: drift.primaryValue,
      max_drift_pct: drift.maxDriftPct,
      status: drift.status,
      error: drift.error ?? null,
    })
    .select('id')
    .single();

  if (runErr || !runRow) {
    throw new Error(`Failed to insert reconciliation run: ${runErr?.message}`);
  }

  // Open a drift_log entry if status is amber or red
  let driftId: string | undefined;
  if (drift.status === 'amber' || drift.status === 'red') {
    const driftAmount = drift.perSourceDriftPct
      .map((d) => Math.abs(d.drift_amount ?? 0))
      .reduce((max, v) => (v > max ? v : max), 0);

    const { data: driftRow } = await serviceClient
      .from('drift_log')
      .insert({
        org_id: orgId,
        run_id: runRow.id,
        kpi_id: kpi.id,
        period,
        drift_pct: drift.maxDriftPct,
        drift_amount: driftAmount,
        status: 'open',
        severity: drift.status,
      })
      .select('id')
      .single();

    driftId = driftRow?.id as string | undefined;
  }

  return {
    runId: runRow.id as string,
    kpiId: kpi.id,
    kpiKey,
    period,
    status: drift.status,
    primaryValue: drift.primaryValue,
    maxDriftPct: drift.maxDriftPct,
    sourceValues,
    perSourceDriftPct: drift.perSourceDriftPct,
    driftId,
    error: drift.error,
  };
}

/**
 * Run reconciliation for every enabled KPI for the org for a given period.
 * KPIs are run in parallel.
 */
export async function runAllReconciliations(
  orgId: string,
  period: string,
  triggeredBy: TriggeredBy = 'manual'
): Promise<ReconciliationResult[]> {
  await ensureKpisSeeded(orgId);

  const supabase = await createUntypedServiceClient();
  const { data: kpiRows } = await supabase
    .from('reconciliation_kpis')
    .select('kpi_key, enabled')
    .eq('org_id', orgId)
    .eq('enabled', true);

  const enabledKeys = (kpiRows ?? []).map(
    (r: { kpi_key: string }) => r.kpi_key
  );

  const results = await Promise.all(
    enabledKeys.map((key) =>
      runReconciliation(orgId, key, period, triggeredBy).catch(
        (err): ReconciliationResult => ({
          runId: '',
          kpiId: '',
          kpiKey: key,
          period,
          status: 'error',
          primaryValue: null,
          maxDriftPct: 0,
          sourceValues: [],
          perSourceDriftPct: [],
          error: err instanceof Error ? err.message : 'unknown_error',
        })
      )
    )
  );

  return results;
}

/**
 * Helper — current month as YYYY-MM-01 (UTC).
 */
export function currentMonthPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** Helper — first-of-prev-month given a YYYY-MM-01 period. */
export function previousMonthPeriod(period: string): string {
  const [yStr, mStr] = period.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, '0')}-01`;
}
