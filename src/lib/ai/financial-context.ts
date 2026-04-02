import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, buildSemanticPnL } from '@/lib/financial/aggregate';
import { roundCurrency } from '@/lib/financial/normalise';
import { CATEGORY_META, type StandardCategory } from '@/lib/financial/taxonomy';
import type { NormalisedFinancial, ChartOfAccount, AccountMapping } from '@/types';

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

export type CategoryBreakdown = {
  category: string;
  label: string;
  amount: number;
  section: string;
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
  /** Semantic category breakdown for the latest period (when mappings exist) */
  categoryBreakdown?: CategoryBreakdown[];
  /** 0-1 coverage of accounts with semantic mappings */
  mappingCoverage?: number;
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
  const untypedDb = await createUntypedServiceClient();

  // Fetch normalised financials, accounts, and mappings in parallel
  const [financialsResult, accountsResult, mappingsResult] = await Promise.all([
    supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId)
      .gte('period', basePeriodStart)
      .lte('period', basePeriodEnd),
    supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('org_id', orgId),
    untypedDb
      .from('account_mappings')
      .select('*')
      .eq('org_id', orgId),
  ]);

  if (financialsResult.error) throw new Error(`Failed to fetch financials: ${financialsResult.error.message}`);
  if (accountsResult.error) throw new Error(`Failed to fetch accounts: ${accountsResult.error.message}`);

  const fins = (financialsResult.data ?? []) as NormalisedFinancial[];
  const accs = (accountsResult.data ?? []) as ChartOfAccount[];
  const mappings = (mappingsResult.data ?? []) as AccountMapping[];

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

  // Build semantic category breakdown for latest period if mappings exist
  let categoryBreakdown: CategoryBreakdown[] | undefined;
  let mappingCoverage: number | undefined;

  if (mappings.length > 0 && periods.length > 0) {
    const latestPeriod = periods[periods.length - 1];
    const semanticPnL = buildSemanticPnL(fins, accs, mappings, latestPeriod);
    mappingCoverage = semanticPnL.mappingCoverage;

    // Aggregate by standard category
    const catTotals = new Map<string, { amount: number; section: string }>();
    for (const section of semanticPnL.sections) {
      for (const row of section.rows) {
        const existing = catTotals.get(row.standardCategory);
        if (existing) {
          existing.amount += row.amount;
        } else {
          catTotals.set(row.standardCategory, {
            amount: row.amount,
            section: section.label,
          });
        }
      }
    }

    categoryBreakdown = [...catTotals.entries()]
      .map(([cat, data]) => ({
        category: cat,
        label: CATEGORY_META[cat as StandardCategory]?.label ?? cat,
        amount: roundCurrency(data.amount),
        section: data.section,
      }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
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
    categoryBreakdown,
    mappingCoverage,
  };
}
