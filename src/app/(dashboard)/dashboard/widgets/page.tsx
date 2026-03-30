import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import WidgetsClient from './widgets-client';

/* ─── expense category colour palette ─── */
const EXPENSE_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
  '#94a3b8',
];

export default async function DashboardWidgetsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  /* ─── 1. Check Xero connection ─── */
  const { data: connections } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .limit(1);

  const connected = (connections?.length ?? 0) > 0;

  /* ─── 2. Fetch normalised financials ─── */
  const { data: rawFinancials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(id, code, name, type, class, status)')
    .eq('org_id', orgId);

  const financials: NormalisedFinancial[] = (rawFinancials ?? []).map((r) => ({
    id: r.id,
    org_id: r.org_id,
    period: r.period,
    account_id: r.account_id,
    amount: Number(r.amount),
    transaction_count: r.transaction_count,
    source: r.source,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  /* ─── 3. Fetch chart of accounts ─── */
  const { data: rawAccounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const accounts: ChartOfAccount[] = (rawAccounts ?? []) as ChartOfAccount[];
  const periods = getAvailablePeriods(financials);

  if (periods.length === 0) {
    return (
      <WidgetsClient
        connected={connected}
        revenueTrend={[]}
        pnlSummary={[]}
        cashTrend={[]}
        expenseBreakdown={[]}
        kpis={[]}
      />
    );
  }

  /* ─── 4. Build P&L for latest period and last 6 ─── */
  const last6 = periods.slice(0, 6).reverse(); // chronological
  const latestPeriod = periods[0];
  const latestPnL = buildPnL(financials, accounts, latestPeriod);

  // Previous period for growth calc
  const prevPnL =
    periods.length > 1 ? buildPnL(financials, accounts, periods[1]) : null;

  /* ─── 5. Revenue trend (6 months) ─── */
  const revenueTrend = last6.map((period) => {
    const pnl = buildPnL(financials, accounts, period);
    return { period, revenue: pnl.revenue };
  });

  /* ─── 6. P&L summary for latest month ─── */
  const pnlSummary = [
    { name: 'Revenue', value: latestPnL.revenue },
    { name: 'COGS', value: latestPnL.costOfSales },
    { name: 'Gross Profit', value: latestPnL.grossProfit },
    { name: 'Expenses', value: latestPnL.expenses },
    { name: 'Net Profit', value: latestPnL.netProfit },
  ];

  /* ─── 7. Expense breakdown by account name ─── */
  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  const expenseMap = new Map<string, number>();
  const latestFinancials = financials.filter((f) => f.period === latestPeriod);
  for (const fin of latestFinancials) {
    const account = accountMap.get(fin.account_id);
    if (!account) continue;
    const cls = account.class.toUpperCase();
    if (cls === 'EXPENSE' || cls === 'OVERHEADS') {
      const existing = expenseMap.get(account.name) ?? 0;
      expenseMap.set(account.name, existing + Math.abs(Number(fin.amount)));
    }
  }

  const totalExpenses = Array.from(expenseMap.values()).reduce(
    (s, v) => s + v,
    0
  );

  const expenseBreakdown = Array.from(expenseMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], i) => ({
      name,
      value: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    }));

  /* ─── 8. Cash position trend ─── */
  const cashTrend = last6.map((period) => {
    const periodFins = financials.filter((f) => f.period === period);
    let periodCash = 0;
    for (const fin of periodFins) {
      const account = accountMap.get(fin.account_id);
      if (!account) continue;
      const cls = account.class.toUpperCase();
      const accType = account.type.toUpperCase();
      if (
        cls === 'ASSET' &&
        (accType.includes('BANK') || accType.includes('CASH'))
      ) {
        periodCash += Number(fin.amount);
      }
    }
    return { period, cash: periodCash };
  });

  /* ─── 9. KPIs ─── */
  const grossMarginPct =
    latestPnL.revenue > 0
      ? Math.round((latestPnL.grossProfit / latestPnL.revenue) * 100)
      : 0;

  const revenueGrowthPct =
    prevPnL && prevPnL.revenue > 0
      ? Math.round(
          ((latestPnL.revenue - prevPnL.revenue) / prevPnL.revenue) * 100
        )
      : 0;

  const netMarginPct =
    latestPnL.revenue > 0
      ? Math.round((latestPnL.netProfit / latestPnL.revenue) * 100)
      : 0;

  const kpis = [
    {
      label: 'Gross Margin',
      value: `${grossMarginPct}%`,
      color: 'bg-emerald-500/15 text-emerald-600',
    },
    {
      label: 'Revenue Growth',
      value: `${revenueGrowthPct >= 0 ? '+' : ''}${revenueGrowthPct}%`,
      color: 'bg-indigo-500/15 text-indigo-600',
    },
    {
      label: 'Net Margin',
      value: `${netMarginPct}%`,
      color:
        netMarginPct >= 0
          ? 'bg-blue-500/15 text-blue-600'
          : 'bg-rose-500/15 text-rose-600',
    },
  ];

  return (
    <WidgetsClient
      connected={connected}
      revenueTrend={revenueTrend}
      pnlSummary={pnlSummary}
      cashTrend={cashTrend}
      expenseBreakdown={expenseBreakdown}
      kpis={kpis}
    />
  );
}
