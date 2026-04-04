import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import RevenueClient from './revenue-client';

export default async function RevenuePage() {
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

  /* ── Build P&L per period (sorted ascending for charting) ── */
  const availablePeriods = getAvailablePeriods(financials);
  const sortedPeriods = [...availablePeriods].sort();

  const periodRevenues = sortedPeriods.map((period) => {
    const pnl = buildPnL(financials, accounts, period);
    return { period, revenue: pnl.revenue };
  });

  /* ── Compute month-over-month growth rates ── */
  const periods = periodRevenues.map((item, idx) => {
    let growthPct = 0;
    if (idx > 0) {
      const prev = periodRevenues[idx - 1].revenue;
      growthPct = prev > 0
        ? Math.round(((item.revenue - prev) / prev) * 1000) / 10
        : 0;
    }
    return {
      period: item.period,
      revenue: item.revenue,
      growthPct,
    };
  });

  /* ── Revenue breakdown by account name (REVENUE class) ── */
  const revenueAccountMap = new Map<string, { value: number; accountId: string; accountCode: string }>();
  for (const period of sortedPeriods) {
    const pnl = buildPnL(financials, accounts, period);
    for (const section of pnl.sections) {
      if (section.class === 'REVENUE') {
        for (const row of section.rows) {
          const existing = revenueAccountMap.get(row.accountName);
          revenueAccountMap.set(row.accountName, {
            value: (existing?.value ?? 0) + row.amount,
            accountId: row.accountId,
            accountCode: row.accountCode,
          });
        }
      }
    }
  }

  const revenueByAccount = Array.from(revenueAccountMap.entries())
    .map(([name, data]) => ({
      name,
      value: Math.round(data.value * 100) / 100,
      accountId: data.accountId,
      accountCode: data.accountCode,
    }))
    .sort((a, b) => b.value - a.value);

  /* ── Fetch last sync time ── */
  const { data: syncLog } = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('org_id', orgId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  return (
    <RevenueClient
      orgId={orgId}
      connected={connected}
      periods={periods}
      revenueByAccount={revenueByAccount}
      lastSync={{ completedAt: syncLog?.completed_at ?? null }}
    />
  );
}
