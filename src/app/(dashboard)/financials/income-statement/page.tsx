import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { IncomeStatementClient } from './income-statement-client';

export default async function IncomeStatementPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  // Check connection
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

  const finData = (financials ?? []) as NormalisedFinancial[];
  const accData = (accounts ?? []) as ChartOfAccount[];
  const periods = getAvailablePeriods(finData);
  const connected = !!xeroConn;

  // Build P&L for each period
  const pnlByPeriod = periods.map((p) => {
    const pnl = buildPnL(finData, accData, p);
    return {
      period: p,
      // Normalise cost/expense section amounts to positive for P&L display.
      // Revenue rows stay as-is (positive). Cost/Expense/Overhead rows are
      // stored as negative by Xero — take absolute value for the P&L table.
      sections: pnl.sections.map((s) => {
        const isCostSection = ['DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'].includes(s.class);
        return {
          label: s.label,
          class: s.class,
          total: isCostSection ? Math.abs(s.total) : s.total,
          rows: s.rows.map((r) => ({
            name: r.accountName,
            code: r.accountCode,
            amount: isCostSection ? Math.abs(r.amount) : r.amount,
          })),
        };
      }),
      revenue: pnl.revenue,
      costOfSales: pnl.costOfSales,
      grossProfit: pnl.grossProfit,
      expenses: pnl.expenses,
      netProfit: pnl.netProfit,
    };
  });

  return (
    <IncomeStatementClient
      connected={connected}
      periods={pnlByPeriod}
    />
  );
}
