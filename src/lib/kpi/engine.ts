import { createServiceClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { fetchFinanceCosts, adjustNetProfitForFinanceCosts } from '@/lib/financial/finance-costs';
import { roundCurrency } from '@/lib/financial/normalise';
import { getKPIsForBusinessType, emptyKPIInputData } from './definitions';
import { parseLineItems, getPeriodDateRange } from '@/lib/intelligence/line-item-parser';
import { calculateIndustryKPIs } from '@/lib/intelligence/industry-kpis';
import type { BusinessType, KPIFormat, KPICategory, KPIImportance } from './definitions';
import type {
  NormalisedFinancial,
  ChartOfAccount,
  KPISnapshot,
  TrendDirection,
  Benchmark,
} from '@/types';

export type CalculatedKPI = {
  key: string;
  label: string;
  description: string;
  /** One-liner a non-finance business owner can immediately understand */
  plainEnglish: string;
  value: number | null;
  formatted_value: string;
  format: KPIFormat;
  trend_direction: TrendDirection;
  trend_percentage: number;
  benchmark_value: number | null;
  benchmark_status: 'green' | 'amber' | 'red' | 'none';
  higher_is_better: boolean;
  /** Category grouping for table display */
  category: KPICategory;
  /** Importance level for prioritisation */
  importance: KPIImportance;
  /** Default target value for pass/fail comparison */
  default_target: number | null;
};

/**
 * Format a KPI value for display.
 * DETERMINISTIC — pure function.
 */
export function formatKPIValue(value: number | null, format: KPIFormat): string {
  if (value === null) return 'N/A';

  switch (format) {
    case 'currency':
      // Values are in pence, display in pounds
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value / 100);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'months':
      return `${value} mo`;
    case 'ratio':
      return `${value.toFixed(1)}x`;
    case 'days':
      return `${value} days`;
    case 'number':
      return new Intl.NumberFormat('en-GB').format(value);
    default:
      return String(value);
  }
}

/**
 * Determine benchmark status based on value vs benchmark percentiles.
 * DETERMINISTIC — pure function.
 */
function getBenchmarkStatus(
  value: number | null,
  benchmark: Benchmark | null,
  higherIsBetter: boolean
): { status: 'green' | 'amber' | 'red' | 'none'; benchmarkValue: number | null } {
  if (value === null || !benchmark) {
    return { status: 'none', benchmarkValue: null };
  }

  const p25 = benchmark.percentiles.p25 ?? 0;
  const p50 = benchmark.percentiles.p50 ?? 0;
  const p75 = benchmark.percentiles.p75 ?? 0;

  if (higherIsBetter) {
    if (value >= p75) return { status: 'green', benchmarkValue: p50 };
    if (value >= p25) return { status: 'amber', benchmarkValue: p50 };
    return { status: 'red', benchmarkValue: p50 };
  } else {
    if (value <= p25) return { status: 'green', benchmarkValue: p50 };
    if (value <= p75) return { status: 'amber', benchmarkValue: p50 };
    return { status: 'red', benchmarkValue: p50 };
  }
}

/**
 * Calculate trend direction and percentage between two values.
 * DETERMINISTIC — pure function.
 */
function calculateTrend(
  current: number | null,
  previous: number | null
): { direction: TrendDirection; percentage: number } {
  if (current === null || previous === null || previous === 0) {
    return { direction: 'flat', percentage: 0 };
  }

  const change = current - previous;
  const pct = roundCurrency((change / Math.abs(previous)) * 100);

  if (Math.abs(pct) < 0.5) return { direction: 'flat', percentage: 0 };
  return {
    direction: change > 0 ? 'up' : 'down',
    percentage: pct,
  };
}

/**
 * Calculate all relevant KPIs for an organisation in a given period.
 * All financial math is DETERMINISTIC — pure TypeScript.
 */
export async function calculateKPIs(
  orgId: string,
  period: string,
  businessType: BusinessType = 'universal'
): Promise<CalculatedKPI[]> {
  const supabase = await createServiceClient();

  // Fetch normalised financials
  const { data: financials, error: finError } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  if (finError) throw new Error(`Failed to fetch financials: ${finError.message}`);

  const { data: accounts, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  if (accError) throw new Error(`Failed to fetch accounts: ${accError.message}`);

  const fins = (financials ?? []) as NormalisedFinancial[];
  const accs = (accounts ?? []) as ChartOfAccount[];

  // Fetch finance costs — net profit MUST include interest for businesses with debt
  const financeCosts = await fetchFinanceCosts(orgId);

  // Build P&L for current and previous period
  const periods = getAvailablePeriods(fins);
  const currentPnL = buildPnL(fins, accs, period);
  const currentNetProfit = adjustNetProfitForFinanceCosts(currentPnL.netProfit, financeCosts);

  const periodIdx = periods.indexOf(period);
  const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
  const previousPnL = previousPeriod ? buildPnL(fins, accs, previousPeriod) : null;
  const previousNetProfit = previousPnL
    ? adjustNetProfitForFinanceCosts(previousPnL.netProfit, financeCosts)
    : null;

  // Build KPI input data from P&L (net profit adjusted for finance costs)
  const currentData = {
    ...emptyKPIInputData(),
    revenue: Math.round(currentPnL.revenue * 100),
    previous_revenue: previousPnL ? Math.round(previousPnL.revenue * 100) : 0,
    cost_of_sales: Math.round(currentPnL.costOfSales * 100),
    operating_expenses: Math.round(currentPnL.expenses * 100),
    gross_profit: Math.round(currentPnL.grossProfit * 100),
    net_profit: Math.round(currentNetProfit * 100),
    monthly_burn_rate: currentNetProfit < 0 ? Math.round(Math.abs(currentNetProfit) * 100) : 0,
  };

  const previousData = previousPnL
    ? {
        ...emptyKPIInputData(),
        revenue: Math.round(previousPnL.revenue * 100),
        cost_of_sales: Math.round(previousPnL.costOfSales * 100),
        operating_expenses: Math.round(previousPnL.expenses * 100),
        gross_profit: Math.round(previousPnL.grossProfit * 100),
        net_profit: Math.round((previousNetProfit ?? previousPnL.netProfit) * 100),
      }
    : null;

  // Fetch benchmarks for sector
  const { data: benchmarks } = await supabase
    .from('benchmarks' as any)
    .select('*')
    .or(`sector.eq.${businessType},sector.eq.universal`);

  const benchmarkMap = new Map<string, Benchmark>();
  for (const b of (benchmarks ?? []) as unknown as Benchmark[]) {
    benchmarkMap.set(b.metric_key, b);
  }

  // Calculate all KPIs
  const definitions = getKPIsForBusinessType(businessType);
  const results: CalculatedKPI[] = [];

  for (const def of definitions) {
    const currentValue = def.formula(currentData);
    const previousValue = previousData ? def.formula(previousData) : null;

    const trend = calculateTrend(currentValue, previousValue);
    const benchmark = benchmarkMap.get(def.key) ?? null;
    const benchmarkResult = getBenchmarkStatus(currentValue, benchmark, def.higher_is_better);

    results.push({
      key: def.key,
      label: def.label,
      description: def.description,
      plainEnglish: def.plainEnglish,
      value: currentValue,
      formatted_value: formatKPIValue(currentValue, def.format),
      format: def.format,
      trend_direction: trend.direction,
      trend_percentage: trend.percentage,
      benchmark_value: benchmarkResult.benchmarkValue,
      benchmark_status: benchmarkResult.status,
      higher_is_better: def.higher_is_better,
      category: def.category,
      importance: def.importance,
      default_target: def.default_target,
    });
  }

  // ─── Product Intelligence KPIs (best-effort) ─────────────────────
  try {
    const { data: orgData } = await supabase
      .from('organisations' as any)
      .select('industry')
      .eq('id', orgId)
      .single();

    const industry = ((orgData as unknown as Record<string, unknown>)?.industry as string) ?? '';
    const { startDate, endDate } = getPeriodDateRange(period);
    const productResult = await parseLineItems(orgId, startDate, endDate, industry);

    if (productResult.totalRevenue > 0) {
      const productKPIs = calculateIndustryKPIs(productResult, industry);

      for (const pk of productKPIs) {
        // Skip product mix KPIs from the main engine output (they show in the product dashboard)
        if (pk.key.startsWith('product_mix_')) continue;

        results.push({
          key: pk.key,
          label: pk.label,
          description: pk.description,
          plainEnglish: pk.plainEnglish,
          value: pk.value,
          formatted_value: pk.formattedValue,
          format: pk.format as KPIFormat,
          trend_direction: 'flat',
          trend_percentage: 0,
          benchmark_value: null,
          benchmark_status: 'none',
          higher_is_better: pk.higherIsBetter,
          category: 'profitability',
          importance: 'medium',
          default_target: null,
        });
      }
    }
  } catch {
    // Product intelligence is optional — graceful degradation
  }

  return results;
}

/**
 * Persist calculated KPIs as snapshots for historical tracking.
 */
export async function persistKPISnapshots(
  orgId: string,
  period: string,
  kpis: CalculatedKPI[]
): Promise<number> {
  const supabase = await createServiceClient();
  let stored = 0;

  for (const kpi of kpis) {
    if (kpi.value === null) continue;

    const { error } = await supabase.from('kpi_snapshots' as any).upsert(
      {
        org_id: orgId,
        kpi_type: kpi.key,
        value: kpi.value,
        period,
        trend_direction: kpi.trend_direction,
        trend_percentage: kpi.trend_percentage,
        benchmark_value: kpi.benchmark_value,
      },
      { onConflict: 'org_id,kpi_type,period' }
    );

    if (!error) stored++;
  }

  return stored;
}

/**
 * Get historical KPI snapshots for sparkline charts.
 */
export async function getKPIHistory(
  orgId: string,
  kpiType: string,
  limit = 12
): Promise<KPISnapshot[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('kpi_snapshots' as any)
    .select('*')
    .eq('org_id', orgId)
    .eq('kpi_type', kpiType)
    .order('period', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch KPI history: ${error.message}`);
  return (data ?? []) as unknown as KPISnapshot[];
}
