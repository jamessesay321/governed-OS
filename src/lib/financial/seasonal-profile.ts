import { createUntypedServiceClient } from '@/lib/supabase/server';

export interface SeasonalProfile {
  orgId: string;
  isSeasonal: boolean;
  isHighlySeasonal: boolean;
  coefficientOfVariation: number;
  seasonalAmplitude: number;
  /** Seasonal index per calendar month (1-12). 1.0 = average, >1 = above average */
  monthlyIndex: Record<number, number>;
  peakMonths: number[];
  troughMonths: number[];
  /** Number of months of data used */
  dataMonths: number;
}

/**
 * Detect seasonal patterns from normalised_financials revenue data.
 * Requires at least 6 months of data to detect seasonality.
 */
export async function detectSeasonalProfile(orgId: string): Promise<SeasonalProfile> {
  const svc = await createUntypedServiceClient();

  // Get revenue accounts
  const { data: revAccounts } = await svc
    .from('chart_of_accounts')
    .select('id')
    .eq('org_id', orgId)
    .in('class', ['REVENUE', 'OTHERINCOME']);

  const revIds = ((revAccounts ?? []) as Array<{ id: string }>).map(a => a.id);

  const defaultProfile: SeasonalProfile = {
    orgId,
    isSeasonal: false,
    isHighlySeasonal: false,
    coefficientOfVariation: 0,
    seasonalAmplitude: 0,
    monthlyIndex: {},
    peakMonths: [],
    troughMonths: [],
    dataMonths: 0,
  };

  if (revIds.length === 0) return defaultProfile;

  // Fetch all revenue transactions
  const { data: financials } = await svc
    .from('normalised_financials')
    .select('period, amount')
    .eq('org_id', orgId)
    .in('account_id', revIds);

  if (!financials || financials.length === 0) return defaultProfile;

  // Aggregate revenue by period
  const periodRevenue = new Map<string, number>();
  for (const row of financials as Array<{ period: string; amount: number }>) {
    const current = periodRevenue.get(row.period) ?? 0;
    periodRevenue.set(row.period, current + Number(row.amount));
  }

  const periods = Array.from(periodRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (periods.length < 6) {
    return { ...defaultProfile, dataMonths: periods.length };
  }

  // Compute monthly averages by calendar month
  const monthTotals: Record<number, number[]> = {};
  for (const [period, revenue] of periods) {
    const month = new Date(period).getMonth() + 1; // 1-12
    if (!monthTotals[month]) monthTotals[month] = [];
    monthTotals[month].push(revenue);
  }

  const monthAverages: Record<number, number> = {};
  for (const [month, values] of Object.entries(monthTotals)) {
    monthAverages[Number(month)] = values.reduce((a, b) => a + b, 0) / values.length;
  }

  // Overall monthly average
  const allValues = periods.map(([, r]) => r);
  const overallAvg = allValues.reduce((a, b) => a + b, 0) / allValues.length;

  if (overallAvg <= 0) return { ...defaultProfile, dataMonths: periods.length };

  // Compute seasonal index
  const monthlyIndex: Record<number, number> = {};
  for (const [month, avg] of Object.entries(monthAverages)) {
    monthlyIndex[Number(month)] = overallAvg > 0 ? avg / overallAvg : 1;
  }

  // Coefficient of variation
  const mean = overallAvg;
  const variance = allValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allValues.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  // Peak and trough months
  const sortedMonths = Object.entries(monthlyIndex)
    .map(([m, idx]) => ({ month: Number(m), index: idx }))
    .sort((a, b) => b.index - a.index);

  const peakMonths = sortedMonths.slice(0, 3).map(m => m.month);
  const troughMonths = sortedMonths.slice(-3).map(m => m.month);

  // Seasonal amplitude
  const peakAvg = peakMonths.length > 0
    ? peakMonths.reduce((s, m) => s + (monthAverages[m] ?? 0), 0) / peakMonths.length
    : 0;
  const troughAvg = troughMonths.length > 0
    ? troughMonths.reduce((s, m) => s + (monthAverages[m] ?? 0), 0) / troughMonths.length
    : 0;
  const amplitude = overallAvg > 0 ? (peakAvg - troughAvg) / overallAvg : 0;

  return {
    orgId,
    isSeasonal: cv > 0.3,
    isHighlySeasonal: cv > 0.5,
    coefficientOfVariation: Math.round(cv * 100) / 100,
    seasonalAmplitude: Math.round(amplitude * 100) / 100,
    monthlyIndex,
    peakMonths,
    troughMonths,
    dataMonths: periods.length,
  };
}

/**
 * Get the seasonal-adjusted anomaly threshold multiplier for a given month.
 * For seasonal businesses, the threshold widens during peak/trough months.
 */
export function getSeasonalThresholdMultiplier(
  profile: SeasonalProfile,
  month: number
): number {
  if (!profile.isSeasonal) return 1.0;

  // For seasonal businesses, the threshold is the maximum of:
  // 1. The base threshold (1.0)
  // 2. The seasonal amplitude (how much swing exists)
  // This prevents flagging normal seasonal variations as anomalies
  const index = profile.monthlyIndex[month] ?? 1.0;

  // If this is a peak or trough month, widen threshold proportionally
  if (profile.peakMonths.includes(month) || profile.troughMonths.includes(month)) {
    return Math.max(1.0, 1 + profile.seasonalAmplitude);
  }

  // For non-peak/trough months, use a moderate multiplier
  return Math.max(1.0, 1 + (profile.seasonalAmplitude * 0.5));
}

/**
 * Check if a MoM revenue change is within seasonal expectations.
 * Returns true if the change is explainable by seasonal patterns.
 */
export function isSeasonallyExpected(
  profile: SeasonalProfile,
  currentMonth: number,
  priorMonth: number,
  actualChangePercent: number
): boolean {
  if (!profile.isSeasonal) return false;

  const currentIndex = profile.monthlyIndex[currentMonth] ?? 1.0;
  const priorIndex = profile.monthlyIndex[priorMonth] ?? 1.0;

  if (priorIndex <= 0) return false;

  // Expected change based on seasonal index
  const expectedChangePercent = ((currentIndex - priorIndex) / priorIndex) * 100;

  // Allow 50% tolerance around the expected seasonal change
  const tolerance = 50;
  return Math.abs(actualChangePercent - expectedChangePercent) <= tolerance;
}
