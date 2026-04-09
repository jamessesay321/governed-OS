import { createServiceClient } from '@/lib/supabase/server';
import { buildPnL } from '@/lib/financial/aggregate';
import { roundCurrency } from '@/lib/financial/normalise';
import type { FinanceCostsResult } from '@/lib/financial/finance-costs';
import type { NormalisedFinancial, ChartOfAccount, BudgetLine } from '@/types';

export type VarianceLine = {
  category: string;
  budget_pence: number;
  actual_pence: number;
  variance_pence: number;
  variance_percentage: number;
  direction: 'favourable' | 'adverse' | 'on_target';
  is_material: boolean;
};

export type CompareMode = 'budget' | 'prev_month' | 'prev_quarter' | 'prev_year';

export type VarianceReport = {
  period: string;
  compareMode: CompareMode;
  comparePeriod: string | null;
  lines: VarianceLine[];
  total_budget_pence: number;
  total_actual_pence: number;
  total_variance_pence: number;
  material_variances: VarianceLine[];
};

/**
 * Materiality thresholds for flagging variances.
 * A variance is material if it exceeds EITHER threshold.
 */
const MATERIALITY_PERCENTAGE = 0.1; // 10%
const MATERIALITY_ABSOLUTE_PENCE = 500000; // £5,000

/**
 * Offset a YYYY-MM-01 period string by a number of months.
 */
function offsetPeriod(period: string, months: number): string {
  const d = new Date(period + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Build a category→pence map from a P&L for a given period.
 * When financeCosts is provided, net_profit is adjusted to include interest expense.
 */
function buildCategoryMap(
  financials: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  period: string,
  financeCosts?: FinanceCostsResult
): Map<string, number> {
  const pnl = buildPnL(financials, accounts, period);
  const map = new Map<string, number>();
  map.set('revenue', Math.round(pnl.revenue * 100));
  map.set('cost_of_sales', Math.round(pnl.costOfSales * 100));
  map.set('operating_expenses', Math.round(pnl.expenses * 100));

  // Adjust net profit for finance costs if debt exists
  const monthlyInterest = financeCosts?.totalMonthlyInterest ?? 0;
  const adjustedNetProfit = pnl.netProfit - monthlyInterest;
  map.set('net_profit', Math.round(adjustedNetProfit * 100));
  map.set('gross_profit', Math.round(pnl.grossProfit * 100));

  // Add finance costs as its own category for variance tracking
  if (monthlyInterest > 0) {
    map.set('finance_costs', Math.round(monthlyInterest * 100));
  }

  for (const section of pnl.sections) {
    for (const row of section.rows) {
      const key = row.accountName.toLowerCase().replace(/\s+/g, '_');
      map.set(key, Math.round(row.amount * 100));
    }
  }
  return map;
}

/**
 * Calculate variances for a period.
 * Supports 4 compare modes: budget, prev_month, prev_quarter, prev_year.
 * All math is DETERMINISTIC — pure TypeScript.
 */
export async function calculateVariances(
  orgId: string,
  period: string,
  compareMode: CompareMode = 'budget'
): Promise<VarianceReport> {
  const supabase = await createServiceClient();
  // Import dynamically to avoid circular deps in some environments
  const { fetchFinanceCosts } = await import('@/lib/financial/finance-costs');
  const financeCosts = await fetchFinanceCosts(orgId);

  // Fetch chart of accounts (needed for all modes)
  const { data: accounts, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  if (accError) throw new Error(`Failed to fetch accounts: ${accError.message}`);
  const accs = (accounts ?? []) as ChartOfAccount[];

  // Determine comparison period for period-over-period modes
  const comparePeriod = compareMode === 'prev_month'
    ? offsetPeriod(period, -1)
    : compareMode === 'prev_quarter'
      ? offsetPeriod(period, -3)
      : compareMode === 'prev_year'
        ? offsetPeriod(period, -12)
        : null;

  // Fetch actuals for the current period
  const { data: financials, error: finError } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId)
    .eq('period', period);

  if (finError) throw new Error(`Failed to fetch actuals: ${finError.message}`);
  const fins = (financials ?? []) as NormalisedFinancial[];

  // Build current period actuals
  const actualsByCategory = buildCategoryMap(fins, accs, period, financeCosts);

  // Build comparison baseline depending on mode
  let baselineByCategory: Map<string, number>;
  const REVENUE_CATEGORIES = new Set(['revenue', 'gross_profit', 'net_profit']);

  if (compareMode === 'budget') {
    // Budget mode: baseline from budget_lines table
    const { data: budgetData, error: budgetError } = await supabase
      .from('budget_lines' as any)
      .select('*')
      .eq('org_id', orgId)
      .eq('period', period);

    if (budgetError) throw new Error(`Failed to fetch budget: ${budgetError.message}`);
    const budgetLines = (budgetData ?? []) as unknown as BudgetLine[];

    baselineByCategory = new Map<string, number>();
    for (const b of budgetLines) {
      baselineByCategory.set(b.category, b.budgeted_amount);
    }
  } else {
    // Period-over-period: baseline from prior period actuals
    const { data: priorFins, error: priorError } = await supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId)
      .eq('period', comparePeriod!);

    if (priorError) throw new Error(`Failed to fetch prior period: ${priorError.message}`);
    const priorData = (priorFins ?? []) as NormalisedFinancial[];

    baselineByCategory = buildCategoryMap(priorData, accs, comparePeriod!, financeCosts);
  }

  // Build variance lines from whichever baseline categories exist
  // For budget mode: iterate budget categories. For period modes: union of both category sets.
  const allCategories = new Set([...baselineByCategory.keys(), ...actualsByCategory.keys()]);
  const lines: VarianceLine[] = [];

  for (const category of allCategories) {
    const actualPence = actualsByCategory.get(category) ?? 0;
    const baselinePence = baselineByCategory.get(category) ?? 0;

    // Skip categories with zero on both sides
    if (actualPence === 0 && baselinePence === 0) continue;

    const variancePence = actualPence - baselinePence;

    const isRevenueCategory = REVENUE_CATEGORIES.has(category);
    const direction = variancePence === 0
      ? 'on_target' as const
      : (isRevenueCategory ? variancePence > 0 : variancePence < 0)
        ? 'favourable' as const
        : 'adverse' as const;

    const variancePercentage = baselinePence !== 0
      ? roundCurrency((variancePence / Math.abs(baselinePence)) * 100) / 100
      : 0;

    const isMaterial =
      Math.abs(variancePercentage) >= MATERIALITY_PERCENTAGE ||
      Math.abs(variancePence) >= MATERIALITY_ABSOLUTE_PENCE;

    lines.push({
      category,
      budget_pence: baselinePence,
      actual_pence: actualPence,
      variance_pence: variancePence,
      variance_percentage: variancePercentage,
      direction,
      is_material: isMaterial,
    });
  }

  const totalBaseline = lines.reduce((s, l) => s + l.budget_pence, 0);
  const totalActual = lines.reduce((s, l) => s + l.actual_pence, 0);

  return {
    period,
    compareMode,
    comparePeriod,
    lines,
    total_budget_pence: totalBaseline,
    total_actual_pence: totalActual,
    total_variance_pence: totalActual - totalBaseline,
    material_variances: lines.filter((l) => l.is_material),
  };
}

/**
 * Get budget lines for an organisation.
 */
export async function getBudgetLines(
  orgId: string,
  period?: string
): Promise<BudgetLine[]> {
  const supabase = await createServiceClient();

  let query = supabase
    .from('budget_lines' as any)
    .select('*')
    .eq('org_id', orgId)
    .order('category', { ascending: true });

  if (period) {
    query = query.eq('period', period);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch budget lines: ${error.message}`);
  return (data ?? []) as unknown as BudgetLine[];
}

/**
 * Upsert budget lines for an organisation.
 */
export async function upsertBudgetLines(
  orgId: string,
  lines: { category: string; period: string; budgeted_amount: number }[]
): Promise<number> {
  const supabase = await createServiceClient();
  let upserted = 0;

  for (const line of lines) {
    const { error } = await supabase.from('budget_lines' as any).upsert(
      {
        org_id: orgId,
        category: line.category,
        period: line.period,
        budgeted_amount: line.budgeted_amount,
      },
      { onConflict: 'org_id,category,period' }
    );

    if (!error) upserted++;
  }

  return upserted;
}
