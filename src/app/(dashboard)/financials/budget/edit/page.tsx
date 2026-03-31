import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial } from '@/types';
import { BudgetEditClient } from './budget-edit-client';

export default async function BudgetEditPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  // Fetch chart of accounts (P&L accounts only)
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, type, class')
    .eq('org_id', orgId)
    .order('code');

  // Fetch normalised financials to get available periods
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const periods = getAvailablePeriods((financials ?? []) as NormalisedFinancial[]);

  // Fetch existing budget lines
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('org_id', orgId);

  // Filter to P&L account classes
  const pnlAccounts = (accounts ?? [])
    .filter((a) => ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'].includes(a.class.toUpperCase()))
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      class: a.class.toUpperCase(),
    }));

  // Build existing budget lookup: `${account_code}_${period}` -> budgeted_amount
  const existingBudgets: Record<string, number> = {};
  for (const bl of (budgetLines ?? [])) {
    const key = `${bl.category}_${bl.period}`;
    existingBudgets[key] = Number(bl.budgeted_amount ?? 0);
  }

  return (
    <BudgetEditClient
      orgId={orgId}
      accounts={pnlAccounts}
      periods={periods}
      existingBudgets={existingBudgets}
    />
  );
}
