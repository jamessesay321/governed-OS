import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { ForecastAccuracyClient } from './forecast-accuracy-client';

// ── Exported Types ──

export interface MonthComparison {
  period: string;
  label: string;
  actualRevenue: number;
  forecastRevenue: number;
  actualCosts: number;
  forecastCosts: number;
  revenueVariance: number;
  costVariance: number;
  revenueMAPE: number;
  costMAPE: number;
}

export interface AccuracyMetrics {
  overallAccuracy: number;
  revenueAccuracy: number;
  costAccuracy: number;
  revenueMAPE: number;
  costMAPE: number;
  bestMonth: { period: string; label: string; accuracy: number } | null;
  worstMonth: { period: string; label: string; accuracy: number } | null;
}

// ── Helpers ──

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function trailingAverage(values: number[], index: number, window: number): number | null {
  if (index < window) return null;
  let sum = 0;
  for (let i = index - window; i < index; i++) {
    sum += values[i];
  }
  return sum / window;
}

function mape(actuals: number[], forecasts: number[]): number {
  if (actuals.length === 0) return 0;
  let totalError = 0;
  let count = 0;
  for (let i = 0; i < actuals.length; i++) {
    const actual = actuals[i];
    const forecast = forecasts[i];
    if (Math.abs(actual) > 0) {
      totalError += Math.abs(actual - forecast) / Math.abs(actual);
      count++;
    }
  }
  return count > 0 ? (totalError / count) * 100 : 0;
}

// ── Page ──

export default async function ForecastAccuracyPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // 1. Fetch chart_of_accounts to classify accounts
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, class')
    .eq('org_id', orgId);

  const classMap = new Map<string, string>();
  for (const a of (coaData ?? []) as unknown as Array<{ id: string; class: string }>) {
    classMap.set(a.id, (a.class ?? '').toUpperCase());
  }

  // 2. Fetch normalised_financials for REVENUE and EXPENSE classes over last 15 months
  //    (need 15 to have 3-month trailing average starting from month 4)
  const { data: rawFinancials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .order('period', { ascending: true })
    .limit(10000);

  const financials = (rawFinancials ?? []) as unknown as Array<{
    period: string;
    amount: number;
    account_id: string;
  }>;

  // 3. Aggregate revenue and costs by period
  const periodData = new Map<string, { revenue: number; costs: number }>();
  for (const row of financials) {
    const cls = classMap.get(row.account_id) ?? '';
    if (!periodData.has(row.period)) {
      periodData.set(row.period, { revenue: 0, costs: 0 });
    }
    const pd = periodData.get(row.period)!;
    if (cls === 'REVENUE' || cls === 'OTHERINCOME') {
      pd.revenue += Number(row.amount);
    } else if (
      cls === 'EXPENSE' ||
      cls === 'OVERHEADS' ||
      cls === 'DIRECTCOSTS'
    ) {
      pd.costs += Number(row.amount);
    }
  }

  // Sort periods chronologically
  const allPeriods = Array.from(periodData.keys()).sort();

  // Build parallel arrays
  const revenues: number[] = allPeriods.map((p) => periodData.get(p)!.revenue);
  const costs: number[] = allPeriods.map((p) => Math.abs(periodData.get(p)!.costs));

  // 4. Compute 3-month trailing average forecast vs actual for each month
  const TRAILING_WINDOW = 3;
  const comparisons: MonthComparison[] = [];

  for (let i = TRAILING_WINDOW; i < allPeriods.length; i++) {
    const period = allPeriods[i];
    const actualRevenue = revenues[i];
    const actualCosts = costs[i];

    const forecastRevenue = trailingAverage(revenues, i, TRAILING_WINDOW)!;
    const forecastCosts = trailingAverage(costs, i, TRAILING_WINDOW)!;

    const revenueVariance = actualRevenue - forecastRevenue;
    const costVariance = actualCosts - forecastCosts;

    const revMAPE =
      Math.abs(actualRevenue) > 0
        ? (Math.abs(actualRevenue - forecastRevenue) / Math.abs(actualRevenue)) * 100
        : 0;
    const costMAPE =
      Math.abs(actualCosts) > 0
        ? (Math.abs(actualCosts - forecastCosts) / Math.abs(actualCosts)) * 100
        : 0;

    comparisons.push({
      period,
      label: monthLabel(period),
      actualRevenue,
      forecastRevenue,
      actualCosts,
      forecastCosts,
      revenueVariance,
      costVariance,
      revenueMAPE: revMAPE,
      costMAPE: costMAPE,
    });
  }

  // Limit to last 12 months of comparisons
  const last12 = comparisons.slice(-12);

  // 5. Compute accuracy metrics
  const revActuals = last12.map((c) => c.actualRevenue);
  const revForecasts = last12.map((c) => c.forecastRevenue);
  const costActuals = last12.map((c) => c.actualCosts);
  const costForecasts = last12.map((c) => c.forecastCosts);

  const revenueMAPE = mape(revActuals, revForecasts);
  const costMAPE = mape(costActuals, costForecasts);

  const revenueAccuracy = Math.max(0, 100 - revenueMAPE);
  const costAccuracy = Math.max(0, 100 - costMAPE);

  // Weighted average: revenue 60%, costs 40%
  const overallAccuracy = revenueAccuracy * 0.6 + costAccuracy * 0.4;

  // 6. Identify best/worst predicted months (by combined accuracy)
  let bestMonth: { period: string; label: string; accuracy: number } | null = null;
  let worstMonth: { period: string; label: string; accuracy: number } | null = null;

  for (const c of last12) {
    const combinedMAPE = (c.revenueMAPE + c.costMAPE) / 2;
    const monthAccuracy = Math.max(0, 100 - combinedMAPE);

    if (!bestMonth || monthAccuracy > bestMonth.accuracy) {
      bestMonth = { period: c.period, label: c.label, accuracy: monthAccuracy };
    }
    if (!worstMonth || monthAccuracy < worstMonth.accuracy) {
      worstMonth = { period: c.period, label: c.label, accuracy: monthAccuracy };
    }
  }

  const metrics: AccuracyMetrics = {
    overallAccuracy,
    revenueAccuracy,
    costAccuracy,
    revenueMAPE,
    costMAPE,
    bestMonth,
    worstMonth,
  };

  return (
    <ForecastAccuracyClient
      comparisons={last12}
      metrics={metrics}
    />
  );
}
