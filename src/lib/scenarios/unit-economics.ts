import { roundCurrency } from '@/lib/financial/normalise';

// === Input Types ===

export type SegmentInput = {
  segmentKey: string;
  segmentLabel: string;
  unitsSold: number;
  revenuePerUnit: number;
  variableCostPerUnit: number;
  acquisitionSpend: number;
  customersAcquired: number;
  avgCustomerLifespanMonths: number;
  avgRevenuePerCustomerPerMonth: number;
};

// === Output Types ===

export type SegmentEconomics = {
  segmentKey: string;
  segmentLabel: string;
  unitsSold: number;
  revenuePerUnit: number;
  variableCostPerUnit: number;
  contributionPerUnit: number;
  contributionMarginPct: number;
  totalRevenue: number;
  totalVariableCost: number;
  totalContribution: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
};

export type UnitEconomicsSummary = {
  period: string;
  segments: SegmentEconomics[];
  totalRevenue: number;
  totalContribution: number;
  weightedContributionMargin: number;
};

export type SegmentDelta = {
  segmentKey: string;
  segmentLabel: string;
  revenuePerUnitDelta: number;
  contributionPerUnitDelta: number;
  contributionMarginDelta: number;
  cacDelta: number;
  ltvDelta: number;
  ltvCacRatioDelta: number;
};

// === Pure Functions ===

/** Calculate per-segment economics from input data. */
export function calcSegmentEconomics(input: SegmentInput): SegmentEconomics {
  const contributionPerUnit = roundCurrency(input.revenuePerUnit - input.variableCostPerUnit);
  const contributionMarginPct = input.revenuePerUnit === 0
    ? 0
    : roundCurrency(contributionPerUnit / input.revenuePerUnit * 10000) / 10000;

  const totalRevenue = roundCurrency(input.unitsSold * input.revenuePerUnit);
  const totalVariableCost = roundCurrency(input.unitsSold * input.variableCostPerUnit);
  const totalContribution = roundCurrency(input.unitsSold * contributionPerUnit);

  const cac = calcCAC(input.acquisitionSpend, input.customersAcquired);
  const ltv = calcLTV(input.avgRevenuePerCustomerPerMonth, input.avgCustomerLifespanMonths);
  const ltvCacRatio = calcLTVCACRatio(ltv, cac);

  return {
    segmentKey: input.segmentKey,
    segmentLabel: input.segmentLabel,
    unitsSold: input.unitsSold,
    revenuePerUnit: input.revenuePerUnit,
    variableCostPerUnit: input.variableCostPerUnit,
    contributionPerUnit,
    contributionMarginPct,
    totalRevenue,
    totalVariableCost,
    totalContribution,
    cac,
    ltv,
    ltvCacRatio,
  };
}

/** Customer Acquisition Cost. */
export function calcCAC(acquisitionSpend: number, customersAcquired: number): number {
  if (customersAcquired === 0) return 0;
  return roundCurrency(acquisitionSpend / customersAcquired);
}

/** Lifetime Value. */
export function calcLTV(avgRevenuePerMonth: number, avgLifespanMonths: number): number {
  return roundCurrency(avgRevenuePerMonth * avgLifespanMonths);
}

/** LTV:CAC ratio. */
export function calcLTVCACRatio(ltv: number, cac: number): number {
  if (cac === 0) return 0;
  return roundCurrency(ltv / cac * 100) / 100;
}

/** Generate unit economics summary for a period across all segments. */
export function generateUnitEconomics(
  segments: SegmentInput[],
  period: string
): UnitEconomicsSummary {
  const economics = segments.map(calcSegmentEconomics);

  const totalRevenue = roundCurrency(
    economics.reduce((sum, s) => sum + s.totalRevenue, 0)
  );
  const totalContribution = roundCurrency(
    economics.reduce((sum, s) => sum + s.totalContribution, 0)
  );
  const weightedContributionMargin = totalRevenue === 0
    ? 0
    : roundCurrency(totalContribution / totalRevenue * 10000) / 10000;

  return {
    period,
    segments: economics,
    totalRevenue,
    totalContribution,
    weightedContributionMargin,
  };
}

/** Compare segment economics between two snapshots (baseline vs comparison). */
export function compareSegmentEconomics(
  baseline: SegmentEconomics[],
  comparison: SegmentEconomics[]
): SegmentDelta[] {
  const baseMap = new Map<string, SegmentEconomics>();
  for (const s of baseline) {
    baseMap.set(s.segmentKey, s);
  }

  const deltas: SegmentDelta[] = [];

  for (const comp of comparison) {
    const base = baseMap.get(comp.segmentKey);
    if (!base) {
      deltas.push({
        segmentKey: comp.segmentKey,
        segmentLabel: comp.segmentLabel,
        revenuePerUnitDelta: comp.revenuePerUnit,
        contributionPerUnitDelta: comp.contributionPerUnit,
        contributionMarginDelta: comp.contributionMarginPct,
        cacDelta: comp.cac,
        ltvDelta: comp.ltv,
        ltvCacRatioDelta: comp.ltvCacRatio,
      });
      continue;
    }

    deltas.push({
      segmentKey: comp.segmentKey,
      segmentLabel: comp.segmentLabel,
      revenuePerUnitDelta: roundCurrency(comp.revenuePerUnit - base.revenuePerUnit),
      contributionPerUnitDelta: roundCurrency(comp.contributionPerUnit - base.contributionPerUnit),
      contributionMarginDelta: roundCurrency((comp.contributionMarginPct - base.contributionMarginPct) * 10000) / 10000,
      cacDelta: roundCurrency(comp.cac - base.cac),
      ltvDelta: roundCurrency(comp.ltv - base.ltv),
      ltvCacRatioDelta: roundCurrency((comp.ltvCacRatio - base.ltvCacRatio) * 100) / 100,
    });
  }

  return deltas;
}
