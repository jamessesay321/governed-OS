import { roundCurrency } from '@/lib/financial/normalise';
import type { PeriodProjection } from './calculations';

// === Output Types ===

export type PeriodDelta = {
  period: string;
  revenueDelta: number;
  revenueDeltaPct: number;
  grossMarginDelta: number;
  netProfitDelta: number;
  netMarginDelta: number;
  closingCashDelta: number;
  runwayDelta: number;
};

export type ScenarioComparisonResult = {
  baseName: string;
  comparisonName: string;
  periodDeltas: PeriodDelta[];
  summaryRevenueDelta: number;
  summaryNetProfitDelta: number;
  summaryClosingCashDelta: number;
  baseBreakEvenPeriod: string | null;
  comparisonBreakEvenPeriod: string | null;
};

// === Pure Functions ===

/**
 * Compare two scenario projections period by period.
 * Returns deltas (comparison - base) for key metrics.
 */
export function compareScenarios(
  base: { name: string; projections: PeriodProjection[] },
  comparison: { name: string; projections: PeriodProjection[] }
): ScenarioComparisonResult {
  const baseMap = new Map<string, PeriodProjection>();
  for (const p of base.projections) {
    baseMap.set(p.period, p);
  }

  const periodDeltas: PeriodDelta[] = [];
  let summaryRevenueDelta = 0;
  let summaryNetProfitDelta = 0;
  let summaryClosingCashDelta = 0;

  for (const comp of comparison.projections) {
    const baseP = baseMap.get(comp.period);

    if (!baseP) {
      periodDeltas.push({
        period: comp.period,
        revenueDelta: comp.revenue,
        revenueDeltaPct: 1,
        grossMarginDelta: comp.grossMarginPct,
        netProfitDelta: comp.netProfit,
        netMarginDelta: comp.netMarginPct,
        closingCashDelta: comp.closingCash,
        runwayDelta: comp.runwayMonths,
      });
      summaryRevenueDelta += comp.revenue;
      summaryNetProfitDelta += comp.netProfit;
      summaryClosingCashDelta = comp.closingCash;
      continue;
    }

    const revenueDelta = roundCurrency(comp.revenue - baseP.revenue);
    const revenueDeltaPct = baseP.revenue === 0
      ? (comp.revenue > 0 ? 1 : 0)
      : roundCurrency(revenueDelta / baseP.revenue * 10000) / 10000;

    const grossMarginDelta = roundCurrency(
      (comp.grossMarginPct - baseP.grossMarginPct) * 10000
    ) / 10000;

    const netProfitDelta = roundCurrency(comp.netProfit - baseP.netProfit);

    const netMarginDelta = roundCurrency(
      (comp.netMarginPct - baseP.netMarginPct) * 10000
    ) / 10000;

    const closingCashDelta = roundCurrency(comp.closingCash - baseP.closingCash);
    const runwayDelta = roundCurrency(comp.runwayMonths - baseP.runwayMonths);

    periodDeltas.push({
      period: comp.period,
      revenueDelta,
      revenueDeltaPct,
      grossMarginDelta,
      netProfitDelta,
      netMarginDelta,
      closingCashDelta,
      runwayDelta,
    });

    summaryRevenueDelta += revenueDelta;
    summaryNetProfitDelta += netProfitDelta;
    summaryClosingCashDelta = closingCashDelta;
  }

  const baseBreakEven = base.projections.find((p) => p.isBreakEven);
  const compBreakEven = comparison.projections.find((p) => p.isBreakEven);

  return {
    baseName: base.name,
    comparisonName: comparison.name,
    periodDeltas,
    summaryRevenueDelta: roundCurrency(summaryRevenueDelta),
    summaryNetProfitDelta: roundCurrency(summaryNetProfitDelta),
    summaryClosingCashDelta: roundCurrency(summaryClosingCashDelta),
    baseBreakEvenPeriod: baseBreakEven?.period ?? null,
    comparisonBreakEvenPeriod: compBreakEven?.period ?? null,
  };
}
