import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { BudgetClient } from './budget-client';

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
        availablePeriods={[]}
        periodPnLs={[]}
        budgetByCategory={{}}
        budgetByCategoryPeriod={{}}
      />
    );
  }

  // Build P&L per period (pass all to client for filtering)
  type PeriodPnLData = {
    period: string;
    accountsByClass: Record<string, Record<string, number>>;
  };

  const periodPnLs: PeriodPnLData[] = periods.map((p) => {
    const pnl = buildPnL(finData, accData, p);
    const accountsByClass: Record<string, Record<string, number>> = {};
    for (const section of pnl.sections) {
      const accMap: Record<string, number> = {};
      for (const row of section.rows) {
        accMap[row.accountName] = (accMap[row.accountName] ?? 0) + row.amount;
      }
      accountsByClass[section.class] = accMap;
    }
    return { period: p, accountsByClass };
  });

  // Build budget lookups
  // Total budget per category (across all periods)
  const budgetByCategory: Record<string, number> = {};
  // Budget per category per period: `${category}_${period}` -> amount
  const budgetByCategoryPeriod: Record<string, number> = {};
  for (const bl of (budgetLines ?? [])) {
    const cat = bl.category;
    const amt = Number(bl.budgeted_amount ?? 0);
    budgetByCategory[cat] = (budgetByCategory[cat] ?? 0) + amt;
    budgetByCategoryPeriod[`${cat}_${bl.period}`] = (budgetByCategoryPeriod[`${cat}_${bl.period}`] ?? 0) + amt;
  }

  return (
    <BudgetClient
      connected={connected}
      hasBudget={hasBudget}
      availablePeriods={periods}
      periodPnLs={periodPnLs}
      budgetByCategory={budgetByCategory}
      budgetByCategoryPeriod={budgetByCategoryPeriod}
    />
  );
}
