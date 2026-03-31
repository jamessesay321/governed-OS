import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { BudgetClient } from './budget-client';

type BudgetRow = {
  category: string;
  budget: number;
  actual: number;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  header?: boolean;
  favorableWhenUnder?: boolean;
};

export default async function BudgetPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle();

  // Fetch normalised financials
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId)
    .order('period', { ascending: false });

  // Fetch chart of accounts
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  // Fetch budget lines
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('org_id', orgId);

  const connected = !!xeroConn;
  const finData = (financials ?? []) as NormalisedFinancial[];
  const accData = (accounts ?? []) as ChartOfAccount[];
  const periods = getAvailablePeriods(finData);
  const hasBudget = (budgetLines ?? []).length > 0;

  if (!connected || periods.length === 0) {
    return (
      <BudgetClient
        connected={connected}
        hasBudget={false}
        periodLabel=""
        rows={[]}
        availablePeriods={[]}
      />
    );
  }

  // Build aggregated actuals across all periods
  // Sum P&L for all available periods to get YTD actuals
  const allPnLs = periods.map((p) => buildPnL(finData, accData, p));

  // Build budget lookup: category -> total budget (sum across periods)
  const budgetByCategory = new Map<string, number>();
  for (const bl of (budgetLines ?? [])) {
    const existing = budgetByCategory.get(bl.category) ?? 0;
    budgetByCategory.set(bl.category, existing + Number(bl.budgeted_amount ?? 0));
  }

  // Aggregate actuals by account name across all periods
  const actualsByClass = new Map<string, Map<string, number>>();
  for (const pnl of allPnLs) {
    for (const section of pnl.sections) {
      if (!actualsByClass.has(section.class)) {
        actualsByClass.set(section.class, new Map());
      }
      const accMap = actualsByClass.get(section.class)!;
      for (const row of section.rows) {
        const existing = accMap.get(row.accountName) ?? 0;
        accMap.set(row.accountName, existing + row.amount);
      }
    }
  }

  // Build display rows
  const rows: BudgetRow[] = [];

  // Revenue section
  const revenueAccounts = actualsByClass.get('REVENUE') ?? new Map();
  rows.push({ category: 'Revenue', budget: 0, actual: 0, header: true });
  let totalRevenueBudget = 0;
  let totalRevenueActual = 0;
  for (const [name, actual] of Array.from(revenueAccounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const budget = budgetByCategory.get(name) ?? 0;
    totalRevenueBudget += budget;
    totalRevenueActual += actual;
    rows.push({ category: name, budget, actual, indent: true, favorableWhenUnder: false });
  }
  rows.push({ category: 'Total Revenue', budget: totalRevenueBudget, actual: totalRevenueActual, bold: true, separator: true, favorableWhenUnder: false });

  // Cost of Sales section
  const cosAccounts = actualsByClass.get('DIRECTCOSTS') ?? new Map();
  rows.push({ category: 'Cost of Sales', budget: 0, actual: 0, header: true });
  let totalCosBudget = 0;
  let totalCosActual = 0;
  for (const [name, actual] of Array.from(cosAccounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const budget = budgetByCategory.get(name) ?? 0;
    totalCosBudget += budget;
    totalCosActual += actual;
    rows.push({ category: name, budget, actual, indent: true, favorableWhenUnder: true });
  }
  rows.push({ category: 'Total Cost of Sales', budget: totalCosBudget, actual: totalCosActual, bold: true, separator: true, favorableWhenUnder: true });

  // Gross Profit
  const grossProfitBudget = totalRevenueBudget - totalCosBudget;
  const grossProfitActual = totalRevenueActual - totalCosActual;
  rows.push({ category: 'Gross Profit', budget: grossProfitBudget, actual: grossProfitActual, bold: true, separator: true, favorableWhenUnder: false });

  // Operating Expenses section
  const expenseAccounts = actualsByClass.get('EXPENSE') ?? new Map();
  const overheadAccounts = actualsByClass.get('OVERHEADS') ?? new Map();
  rows.push({ category: 'Operating Expenses', budget: 0, actual: 0, header: true });
  let totalExpBudget = 0;
  let totalExpActual = 0;

  // Combine expenses and overheads
  const allExpenses = new Map<string, number>();
  for (const [name, amount] of expenseAccounts) allExpenses.set(name, (allExpenses.get(name) ?? 0) + amount);
  for (const [name, amount] of overheadAccounts) allExpenses.set(name, (allExpenses.get(name) ?? 0) + amount);

  for (const [name, actual] of Array.from(allExpenses.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const budget = budgetByCategory.get(name) ?? 0;
    totalExpBudget += budget;
    totalExpActual += actual;
    rows.push({ category: name, budget, actual, indent: true, favorableWhenUnder: true });
  }
  rows.push({ category: 'Total Operating Expenses', budget: totalExpBudget, actual: totalExpActual, bold: true, separator: true, favorableWhenUnder: true });

  // Net Profit
  const netProfitBudget = grossProfitBudget - totalExpBudget;
  const netProfitActual = grossProfitActual - totalExpActual;
  rows.push({ category: 'Net Profit', budget: netProfitBudget, actual: netProfitActual, bold: true, separator: true, favorableWhenUnder: false });

  // Period label
  const sortedPeriods = [...periods].sort();
  const first = new Date(sortedPeriods[0]);
  const last = new Date(sortedPeriods[sortedPeriods.length - 1]);
  const periodLabel = `${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} \u2013 ${last.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

  return (
    <BudgetClient
      connected={connected}
      hasBudget={hasBudget}
      periodLabel={periodLabel}
      rows={rows}
      availablePeriods={periods}
    />
  );
}
