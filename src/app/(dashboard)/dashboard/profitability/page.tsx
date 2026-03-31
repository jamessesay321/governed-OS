import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import ProfitabilityClient from './profitability-client';

export default async function ProfitabilityPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  /* ── Check Xero connection ── */
  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle();

  const connected = !!xeroConn;

  /* ── Fetch financial data ── */
  const { data: financialsRaw } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accountsRaw } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const financials = (financialsRaw ?? []) as NormalisedFinancial[];
  const accounts = (accountsRaw ?? []) as ChartOfAccount[];

  /* ── Build P&L per period ── */
  const availablePeriods = getAvailablePeriods(financials);
  // Sort ascending for charting (oldest first)
  const sortedPeriods = [...availablePeriods].sort();

  const periods = sortedPeriods.map((period) => {
    const pnl = buildPnL(financials, accounts, period);
    const grossMargin = pnl.revenue > 0
      ? (pnl.grossProfit / pnl.revenue) * 100
      : 0;
    const operatingMargin = pnl.revenue > 0
      ? (pnl.netProfit / pnl.revenue) * 100
      : 0;

    return {
      period,
      revenue: pnl.revenue,
      grossMargin: Math.round(grossMargin * 10) / 10,
      operatingMargin: Math.round(operatingMargin * 10) / 10,
      netProfit: pnl.netProfit,
      expenses: pnl.expenses,
    };
  });

  /* ── Expense breakdown by account name (EXPENSE + OVERHEADS) ── */
  const expenseMap = new Map<string, number>();
  for (const period of sortedPeriods) {
    const pnl = buildPnL(financials, accounts, period);
    for (const section of pnl.sections) {
      if (section.class === 'EXPENSE' || section.class === 'OVERHEADS') {
        for (const row of section.rows) {
          expenseMap.set(
            row.accountName,
            (expenseMap.get(row.accountName) ?? 0) + row.amount,
          );
        }
      }
    }
  }

  // row.amount in sections is still raw Xero sign (negative for costs)
  // so use absolute value for pie chart display
  const expenseBreakdown = Array.from(expenseMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(Math.abs(value) * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  return (
    <ProfitabilityClient
      connected={connected}
      periods={periods}
      expenseBreakdown={expenseBreakdown}
    />
  );
}
