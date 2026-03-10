import { createServiceClient } from '@/lib/supabase/server';
import { buildPnL } from '@/lib/financial/aggregate';
import { roundCurrency } from '@/lib/financial/normalise';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

export type PeriodSummary = {
  period: string;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

export type TopAccount = {
  name: string;
  code: string;
  amount: number;
};

export type FinancialContext = {
  periodSummaries: PeriodSummary[];
  avgMonthlyRevenue: number;
  revenueGrowthRate: number;
  avgGrossMargin: number;
  avgNetMargin: number;
  topRevenueAccounts: TopAccount[];
  topExpenseAccounts: TopAccount[];
  currentAssumptions: { key: string; label: string; value: number; category: string }[];
};

/**
 * Build structured financial context from Xero actuals for the base period window.
 * Used to ground LLM interpretations in real financial data.
 */
export async function buildFinancialContext(
  orgId: string,
  basePeriodStart: string,
  basePeriodEnd: string,
  currentAssumptionSetId?: string
): Promise<FinancialContext> {
  const supabase = await createServiceClient();

  // Fetch normalised financials for the period range
  const { data: financials, error: finError } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId)
    .gte('period', basePeriodStart)
    .lte('period', basePeriodEnd);

  if (finError) throw new Error(`Failed to fetch financials: ${finError.message}`);

  // Fetch chart of accounts
  const { data: accounts, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  if (accError) throw new Error(`Failed to fetch accounts: ${accError.message}`);

  const fins = (financials ?? []) as NormalisedFinancial[];
  const accs = (accounts ?? []) as ChartOfAccount[];

  // Get unique periods sorted ascending
  const periods = [...new Set(fins.map((f) => f.period))].sort();

  // Build P&L for each period
  const periodSummaries: PeriodSummary[] = periods.map((period) => {
    const pnl = buildPnL(fins, accs, period);
    return {
      period,
      revenue: pnl.revenue,
      costOfSales: pnl.costOfSales,
      grossProfit: pnl.grossProfit,
      expenses: pnl.expenses,
      netProfit: pnl.netProfit,
    };
  });

  // Calculate averages
  const avgMonthlyRevenue = periodSummaries.length > 0
    ? roundCurrency(periodSummaries.reduce((s, p) => s + p.revenue, 0) / periodSummaries.length)
    : 0;

  // Revenue growth rate (average month-over-month)
  let revenueGrowthRate = 0;
  if (periodSummaries.length >= 2) {
    const growthRates: number[] = [];
    for (let i = 1; i < periodSummaries.length; i++) {
      const prev = periodSummaries[i - 1].revenue;
      if (prev > 0) {
        growthRates.push((periodSummaries[i].revenue - prev) / prev);
      }
    }
    if (growthRates.length > 0) {
      revenueGrowthRate = roundCurrency(
        (growthRates.reduce((s, r) => s + r, 0) / growthRates.length) * 10000
      ) / 10000;
    }
  }

  // Average margins
  const avgGrossMargin = avgMonthlyRevenue > 0
    ? roundCurrency(
        (periodSummaries.reduce((s, p) => s + p.grossProfit, 0) /
          periodSummaries.reduce((s, p) => s + p.revenue, 0)) * 10000
      ) / 10000
    : 0;

  const avgNetMargin = avgMonthlyRevenue > 0
    ? roundCurrency(
        (periodSummaries.reduce((s, p) => s + p.netProfit, 0) /
          periodSummaries.reduce((s, p) => s + p.revenue, 0)) * 10000
      ) / 10000
    : 0;

  // Top revenue and expense accounts (aggregated across all periods)
  const accountTotals = new Map<string, { name: string; code: string; class: string; amount: number }>();
  for (const fin of fins) {
    const acc = accs.find((a) => a.id === fin.account_id);
    if (!acc) continue;
    const existing = accountTotals.get(acc.id);
    if (existing) {
      existing.amount += Number(fin.amount);
    } else {
      accountTotals.set(acc.id, {
        name: acc.name,
        code: acc.code,
        class: acc.class.toUpperCase(),
        amount: Number(fin.amount),
      });
    }
  }

  const topRevenueAccounts = [...accountTotals.values()]
    .filter((a) => a.class === 'REVENUE')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(({ name, code, amount }) => ({ name, code, amount: roundCurrency(amount) }));

  const topExpenseAccounts = [...accountTotals.values()]
    .filter((a) => ['DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'].includes(a.class))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(({ name, code, amount }) => ({ name, code, amount: roundCurrency(amount) }));

  // Fetch current assumptions if provided
  let currentAssumptions: FinancialContext['currentAssumptions'] = [];
  if (currentAssumptionSetId) {
    const { data: assumptions } = await supabase
      .from('assumption_values')
      .select('key, label, value, category')
      .eq('assumption_set_id', currentAssumptionSetId)
      .eq('org_id', orgId);

    if (assumptions) {
      currentAssumptions = assumptions.map((a) => ({
        key: a.key,
        label: a.label,
        value: Number(a.value),
        category: a.category,
      }));
    }
  }

  return {
    periodSummaries,
    avgMonthlyRevenue,
    revenueGrowthRate,
    avgGrossMargin,
    avgNetMargin,
    topRevenueAccounts,
    topExpenseAccounts,
    currentAssumptions,
  };
}
