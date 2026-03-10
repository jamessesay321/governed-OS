import { createServiceClient } from '@/lib/supabase/server';
import type { PeriodProjection } from './calculations';
import type { SegmentEconomics } from './unit-economics';

/**
 * Persist model snapshots (immutable) for a model version.
 */
export async function persistModelSnapshots(
  orgId: string,
  modelVersionId: string,
  scenarioId: string,
  projections: PeriodProjection[]
): Promise<number> {
  const supabase = await createServiceClient();

  const rows = projections.map((p) => ({
    org_id: orgId,
    model_version_id: modelVersionId,
    scenario_id: scenarioId,
    period: p.period,
    revenue: p.revenue,
    cost_of_sales: p.costOfSales,
    gross_profit: p.grossProfit,
    gross_margin_pct: p.grossMarginPct,
    operating_expenses: p.operatingExpenses,
    net_profit: p.netProfit,
    net_margin_pct: p.netMarginPct,
    cash_in: p.cashIn,
    cash_out: p.cashOut,
    net_cash_flow: p.netCashFlow,
    closing_cash: p.closingCash,
    burn_rate: p.burnRate,
    runway_months: p.runwayMonths,
    is_break_even: p.isBreakEven,
  }));

  const { error } = await supabase.from('model_snapshots').insert(rows);

  if (error) {
    throw new Error(`Failed to persist model snapshots: ${error.message}`);
  }

  return rows.length;
}

/**
 * Persist unit economics snapshots (immutable) for a model version.
 */
export async function persistUnitEconomicsSnapshots(
  orgId: string,
  modelVersionId: string,
  scenarioId: string,
  period: string,
  economics: SegmentEconomics[]
): Promise<number> {
  const supabase = await createServiceClient();

  const rows = economics.map((e) => ({
    org_id: orgId,
    model_version_id: modelVersionId,
    scenario_id: scenarioId,
    period,
    segment_key: e.segmentKey,
    segment_label: e.segmentLabel,
    units_sold: e.unitsSold,
    revenue_per_unit: e.revenuePerUnit,
    variable_cost_per_unit: e.variableCostPerUnit,
    contribution_per_unit: e.contributionPerUnit,
    contribution_margin_pct: e.contributionMarginPct,
    total_revenue: e.totalRevenue,
    total_variable_cost: e.totalVariableCost,
    total_contribution: e.totalContribution,
    cac: e.cac,
    ltv: e.ltv,
    ltv_cac_ratio: e.ltvCacRatio,
  }));

  const { error } = await supabase.from('unit_economics_snapshots').insert(rows);

  if (error) {
    throw new Error(`Failed to persist unit economics snapshots: ${error.message}`);
  }

  return rows.length;
}

/**
 * Persist forecast snapshots (immutable) for comparing actuals vs forecasts.
 */
export async function persistForecastSnapshots(
  orgId: string,
  modelVersionId: string,
  scenarioId: string,
  forecasts: Array<{
    period: string;
    metricKey: string;
    metricLabel: string;
    forecastValue: number;
    actualValue?: number | null;
  }>
): Promise<number> {
  const supabase = await createServiceClient();

  const rows = forecasts.map((f) => {
    const variance = f.actualValue != null ? f.actualValue - f.forecastValue : null;
    const variancePct = variance != null && f.forecastValue !== 0
      ? Math.round((variance / f.forecastValue) * 10000) / 10000
      : null;

    return {
      org_id: orgId,
      model_version_id: modelVersionId,
      scenario_id: scenarioId,
      period: f.period,
      metric_key: f.metricKey,
      metric_label: f.metricLabel,
      forecast_value: f.forecastValue,
      actual_value: f.actualValue ?? null,
      variance,
      variance_pct: variancePct,
    };
  });

  const { error } = await supabase.from('forecast_snapshots').insert(rows);

  if (error) {
    throw new Error(`Failed to persist forecast snapshots: ${error.message}`);
  }

  return rows.length;
}

/**
 * Get latest model snapshots for a scenario.
 */
export async function getLatestModelSnapshots(orgId: string, scenarioId: string) {
  const supabase = await createServiceClient();

  // Get latest model version
  const { data: modelVersion, error: mvError } = await supabase
    .from('model_versions')
    .select('id')
    .eq('org_id', orgId)
    .eq('scenario_id', scenarioId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (mvError || !modelVersion) {
    return { snapshots: [], modelVersionId: null };
  }

  const { data: snapshots, error: snapError } = await supabase
    .from('model_snapshots')
    .select('*')
    .eq('org_id', orgId)
    .eq('model_version_id', modelVersion.id)
    .order('period', { ascending: true });

  if (snapError) {
    throw new Error(`Failed to fetch model snapshots: ${snapError.message}`);
  }

  return { snapshots: snapshots ?? [], modelVersionId: modelVersion.id };
}
