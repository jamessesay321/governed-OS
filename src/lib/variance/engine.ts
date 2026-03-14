import { createServiceClient } from '@/lib/supabase/server';
import { buildPnL } from '@/lib/financial/aggregate';
import { roundCurrency } from '@/lib/financial/normalise';
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

export type VarianceReport = {
  period: string;
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
 * Calculate budget vs actual variances for a period.
 * All math is DETERMINISTIC — pure TypeScript.
 */
export async function calculateVariances(
  orgId: string,
  period: string
): Promise<VarianceReport> {
  const supabase = await createServiceClient();

  // Fetch budget lines for the period
  const { data: budgetData, error: budgetError } = await supabase
    .from('budget_lines' as any)
    .select('*')
    .eq('org_id', orgId)
    .eq('period', period);

  if (budgetError) throw new Error(`Failed to fetch budget: ${budgetError.message}`);

  const budgetLines = (budgetData ?? []) as unknown as BudgetLine[];

  // Fetch actuals from normalised financials
  const { data: financials, error: finError } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId)
    .eq('period', period);

  if (finError) throw new Error(`Failed to fetch actuals: ${finError.message}`);

  const { data: accounts, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  if (accError) throw new Error(`Failed to fetch accounts: ${accError.message}`);

  const fins = (financials ?? []) as NormalisedFinancial[];
  const accs = (accounts ?? []) as ChartOfAccount[];

  // Build P&L to get actuals by category
  const pnl = buildPnL(fins, accs, period);

  // Map P&L sections to budget categories
  const actualsByCategory = new Map<string, number>();
  actualsByCategory.set('revenue', Math.round(pnl.revenue * 100));
  actualsByCategory.set('cost_of_sales', Math.round(pnl.costOfSales * 100));
  actualsByCategory.set('operating_expenses', Math.round(pnl.expenses * 100));
  actualsByCategory.set('net_profit', Math.round(pnl.netProfit * 100));
  actualsByCategory.set('gross_profit', Math.round(pnl.grossProfit * 100));

  // Also add individual P&L section rows for more granular matching
  for (const section of pnl.sections) {
    for (const row of section.rows) {
      const key = row.accountName.toLowerCase().replace(/\s+/g, '_');
      actualsByCategory.set(key, Math.round(row.amount * 100));
    }
  }

  // Build variance lines
  const lines: VarianceLine[] = [];

  for (const budget of budgetLines) {
    const actualPence = actualsByCategory.get(budget.category) ?? 0;
    const variancePence = actualPence - budget.amount_pence;

    // Determine if the variance is favourable or adverse
    const isRevenueCategory = budget.category === 'revenue' || budget.category === 'gross_profit' || budget.category === 'net_profit';
    const direction = variancePence === 0
      ? 'on_target' as const
      : (isRevenueCategory ? variancePence > 0 : variancePence < 0)
        ? 'favourable' as const
        : 'adverse' as const;

    const variancePercentage = budget.amount_pence !== 0
      ? roundCurrency((variancePence / Math.abs(budget.amount_pence)) * 100) / 100
      : 0;

    const isMaterial =
      Math.abs(variancePercentage) >= MATERIALITY_PERCENTAGE ||
      Math.abs(variancePence) >= MATERIALITY_ABSOLUTE_PENCE;

    lines.push({
      category: budget.category,
      budget_pence: budget.amount_pence,
      actual_pence: actualPence,
      variance_pence: variancePence,
      variance_percentage: variancePercentage,
      direction,
      is_material: isMaterial,
    });
  }

  const totalBudget = lines.reduce((s, l) => s + l.budget_pence, 0);
  const totalActual = lines.reduce((s, l) => s + l.actual_pence, 0);

  return {
    period,
    lines,
    total_budget_pence: totalBudget,
    total_actual_pence: totalActual,
    total_variance_pence: totalActual - totalBudget,
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
  lines: { category: string; period: string; amount_pence: number }[]
): Promise<number> {
  const supabase = await createServiceClient();
  let upserted = 0;

  for (const line of lines) {
    const { error } = await supabase.from('budget_lines' as any).upsert(
      {
        org_id: orgId,
        category: line.category,
        period: line.period,
        amount_pence: line.amount_pence,
      },
      { onConflict: 'org_id,category,period' }
    );

    if (!error) upserted++;
  }

  return upserted;
}
