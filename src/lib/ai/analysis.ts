import type { ModelSnapshot, UnitEconomicsSnapshot } from '@/types';

// === Types ===

export type AnalysisResult = {
  type: 'anomaly' | 'risk' | 'opportunity' | 'insight';
  title: string;
  body: string;
  confidenceScore: number;
  sourceDataIds: string[];
};

// === Pure Functions ===

/**
 * Detect margin compression: gross margin declining by more than threshold
 * over consecutive periods.
 */
export function detectMarginCompression(
  snapshots: ModelSnapshot[],
  thresholdPct: number = 0.05
): AnalysisResult | null {
  if (snapshots.length < 2) return null;

  const sorted = [...snapshots].sort((a, b) => a.period.localeCompare(b.period));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const marginDrop = first.gross_margin_pct - last.gross_margin_pct;
  if (marginDrop <= thresholdPct) return null;

  return {
    type: 'risk',
    title: 'Margin Compression Detected',
    body: `Gross margin declined from ${(first.gross_margin_pct * 100).toFixed(1)}% to ${(last.gross_margin_pct * 100).toFixed(1)}% over ${sorted.length} periods (${(marginDrop * 100).toFixed(1)}pp drop). This exceeds the ${(thresholdPct * 100).toFixed(1)}pp threshold.`,
    confidenceScore: Math.min(0.95, 0.7 + marginDrop),
    sourceDataIds: [first.id, last.id],
  };
}

/**
 * Detect revenue anomalies: periods where revenue deviates from the mean
 * by more than a multiple of the standard deviation.
 */
export function detectRevenueAnomalies(
  snapshots: ModelSnapshot[],
  stdDevMultiplier: number = 2
): AnalysisResult[] {
  if (snapshots.length < 3) return [];

  const revenues = snapshots.map((s) => s.revenue);
  const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
  const variance = revenues.reduce((sum, r) => sum + (r - mean) ** 2, 0) / revenues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return [];

  const anomalies: AnalysisResult[] = [];

  for (const snap of snapshots) {
    const deviation = Math.abs(snap.revenue - mean);
    if (deviation > stdDev * stdDevMultiplier) {
      const direction = snap.revenue > mean ? 'above' : 'below';
      anomalies.push({
        type: 'anomaly',
        title: `Revenue Anomaly in ${snap.period}`,
        body: `Revenue of ${snap.revenue.toLocaleString()} is ${(deviation / stdDev).toFixed(1)} standard deviations ${direction} the mean of ${mean.toLocaleString()}.`,
        confidenceScore: Math.min(0.95, 0.6 + (deviation / stdDev) * 0.1),
        sourceDataIds: [snap.id],
      });
    }
  }

  return anomalies;
}

/**
 * Flag runway risk: closing cash / burn rate < threshold months.
 */
export function flagRunwayRisk(
  snapshots: ModelSnapshot[],
  thresholdMonths: number = 6
): AnalysisResult | null {
  if (snapshots.length === 0) return null;

  const sorted = [...snapshots].sort((a, b) => a.period.localeCompare(b.period));
  const latest = sorted[sorted.length - 1];

  if (latest.burn_rate <= 0) return null;
  if (latest.runway_months >= thresholdMonths) return null;

  return {
    type: 'risk',
    title: 'Low Cash Runway',
    body: `Current runway is ${latest.runway_months.toFixed(1)} months (threshold: ${thresholdMonths} months). Closing cash: ${latest.closing_cash.toLocaleString()}, monthly burn: ${latest.burn_rate.toLocaleString()}.`,
    confidenceScore: 0.9,
    sourceDataIds: [latest.id],
  };
}

/**
 * Detect accelerating burn rate over consecutive periods.
 */
export function detectBurnAcceleration(
  snapshots: ModelSnapshot[]
): AnalysisResult | null {
  if (snapshots.length < 3) return null;

  const sorted = [...snapshots].sort((a, b) => a.period.localeCompare(b.period));
  const burningPeriods = sorted.filter((s) => s.burn_rate > 0);

  if (burningPeriods.length < 3) return null;

  // Check if burn rate is increasing for at least 3 consecutive periods
  let consecutiveIncreases = 0;
  for (let i = 1; i < burningPeriods.length; i++) {
    if (burningPeriods[i].burn_rate > burningPeriods[i - 1].burn_rate) {
      consecutiveIncreases++;
    } else {
      consecutiveIncreases = 0;
    }
  }

  if (consecutiveIncreases < 2) return null;

  const first = burningPeriods[0];
  const last = burningPeriods[burningPeriods.length - 1];
  const increase = last.burn_rate - first.burn_rate;

  return {
    type: 'risk',
    title: 'Accelerating Burn Rate',
    body: `Burn rate has increased from ${first.burn_rate.toLocaleString()} to ${last.burn_rate.toLocaleString()} (+${increase.toLocaleString()}) over ${burningPeriods.length} periods with ${consecutiveIncreases} consecutive increases.`,
    confidenceScore: Math.min(0.95, 0.7 + consecutiveIncreases * 0.05),
    sourceDataIds: [first.id, last.id],
  };
}

/**
 * Flag segments with poor unit economics (LTV:CAC below threshold).
 */
export function flagPoorUnitEconomics(
  unitEconomics: UnitEconomicsSnapshot[],
  minLtvCacRatio: number = 3
): AnalysisResult[] {
  const results: AnalysisResult[] = [];

  for (const ue of unitEconomics) {
    if (ue.ltv_cac_ratio > 0 && ue.ltv_cac_ratio < minLtvCacRatio) {
      results.push({
        type: 'risk',
        title: `Poor Unit Economics: ${ue.segment_label}`,
        body: `LTV:CAC ratio of ${ue.ltv_cac_ratio.toFixed(1)}x is below the ${minLtvCacRatio}x threshold. CAC: ${ue.cac.toLocaleString()}, LTV: ${ue.ltv.toLocaleString()}.`,
        confidenceScore: 0.85,
        sourceDataIds: [ue.id],
      });
    }
  }

  return results;
}

/**
 * Run all analyses and return combined results.
 * AI NEVER modifies assumptions or calculations.
 */
export function runAllAnalyses(
  snapshots: ModelSnapshot[],
  unitEconomics: UnitEconomicsSnapshot[]
): AnalysisResult[] {
  const results: AnalysisResult[] = [];

  const marginCompression = detectMarginCompression(snapshots);
  if (marginCompression) results.push(marginCompression);

  const revenueAnomalies = detectRevenueAnomalies(snapshots);
  results.push(...revenueAnomalies);

  const runwayRisk = flagRunwayRisk(snapshots);
  if (runwayRisk) results.push(runwayRisk);

  const burnAcceleration = detectBurnAcceleration(snapshots);
  if (burnAcceleration) results.push(burnAcceleration);

  const poorUnitEcon = flagPoorUnitEconomics(unitEconomics);
  results.push(...poorUnitEcon);

  return results;
}
