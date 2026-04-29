/**
 * Drift Detector — Reconciliation Centre
 * ---------------------------------------
 * Pure-arithmetic comparison of source values against the primary value.
 *
 * Status classification:
 *   - drift_pct  < green_pct  → green
 *   - drift_pct  < amber_pct  → amber
 *   - drift_pct  ≥ amber_pct  → red
 *
 * If the primary value is missing, status is 'error'. Sources whose value is
 * null are skipped (rendered as "—" in the UI), not treated as red drift.
 */

import type { SourceValue } from './source-fetchers';
import type { KpiDefinition } from './kpi-definitions';

export type RunStatus = 'green' | 'amber' | 'red' | 'informational' | 'error';

export interface DriftResult {
  status: RunStatus;
  primaryValue: number | null;
  /** Maximum drift percentage observed across non-primary sources (0 if none). */
  maxDriftPct: number;
  /** Per-source drift % (vs primary) — null where source is unavailable. */
  perSourceDriftPct: Array<{
    integration: string;
    drift_pct: number | null;
    drift_amount: number | null;
  }>;
  error?: string;
}

/** Detect drift across the source values for a KPI. */
export function detectDrift(
  kpi: KpiDefinition,
  sourceValues: SourceValue[]
): DriftResult {
  const primary = sourceValues.find((s) => s.integration === kpi.primary_source);

  if (kpi.informational) {
    // No comparison — just return aggregate info
    const perSource = sourceValues
      .filter((s) => s.integration !== kpi.primary_source)
      .map((s) => ({
        integration: s.integration,
        drift_pct: null,
        drift_amount: null,
      }));
    return {
      status: 'informational',
      primaryValue: primary?.value ?? null,
      maxDriftPct: 0,
      perSourceDriftPct: perSource,
    };
  }

  if (!primary || primary.value === null) {
    return {
      status: 'error',
      primaryValue: null,
      maxDriftPct: 0,
      perSourceDriftPct: [],
      error: primary?.error ?? 'primary_source_unavailable',
    };
  }

  const primaryValue = primary.value;
  const others = sourceValues.filter(
    (s) => s.integration !== kpi.primary_source
  );

  let maxDriftPct = 0;
  const perSource: DriftResult['perSourceDriftPct'] = [];

  for (const s of others) {
    if (s.value === null) {
      perSource.push({
        integration: s.integration,
        drift_pct: null,
        drift_amount: null,
      });
      continue;
    }
    const diff = s.value - primaryValue;
    const pct =
      primaryValue === 0
        ? s.value === 0
          ? 0
          : 100
        : (Math.abs(diff) / Math.abs(primaryValue)) * 100;

    perSource.push({
      integration: s.integration,
      drift_pct: round2(pct),
      drift_amount: round2(diff),
    });

    if (pct > maxDriftPct) maxDriftPct = pct;
  }

  const { green_pct, amber_pct } = kpi.drift_thresholds;
  let status: RunStatus = 'green';
  if (maxDriftPct >= amber_pct) status = 'red';
  else if (maxDriftPct >= green_pct) status = 'amber';

  return {
    status,
    primaryValue,
    maxDriftPct: round2(maxDriftPct),
    perSourceDriftPct: perSource,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
