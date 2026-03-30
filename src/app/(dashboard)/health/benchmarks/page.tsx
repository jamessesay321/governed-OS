import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { BenchmarksClient } from './benchmarks-client';

export interface BenchmarkRow {
  metric: string;
  yours: number;
  industry: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
}

export default async function BenchmarksPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const fin = (financials ?? []) as NormalisedFinancial[];
  const accts = (accounts ?? []) as ChartOfAccount[];

  if (fin.length === 0 || accts.length === 0) {
    return <BenchmarksClient benchmarks={[]} hasData={false} />;
  }

  const periods = getAvailablePeriods(fin);
  const pnls = periods.map((p) => buildPnL(fin, accts, p));

  const latestPnl = pnls[0];
  const latestPeriod = periods[0];

  // Build balance sheet totals
  const accountMap = new Map(accts.map((a) => [a.id, a]));
  const latestFin = fin.filter((f) => f.period === latestPeriod);

  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const f of latestFin) {
    const acc = accountMap.get(f.account_id);
    if (!acc) continue;
    const cls = acc.class.toUpperCase();
    if (cls === 'ASSET') totalAssets += Number(f.amount);
    if (cls === 'LIABILITY') totalLiabilities += Number(f.amount);
  }

  // Current Ratio
  const currentRatio = totalLiabilities > 0
    ? Math.round((totalAssets / totalLiabilities) * 10) / 10
    : 0;

  // Gross Margin %
  const grossMargin = latestPnl.revenue > 0
    ? Math.round((latestPnl.grossProfit / latestPnl.revenue) * 1000) / 10
    : 0;

  // Net Profit Margin %
  const netMargin = latestPnl.revenue > 0
    ? Math.round((latestPnl.netProfit / latestPnl.revenue) * 1000) / 10
    : 0;

  // Expense Ratio %
  const expenseRatio = latestPnl.revenue > 0
    ? Math.round((latestPnl.expenses / latestPnl.revenue) * 1000) / 10
    : 0;

  // Revenue Growth % (latest vs ~6 months ago)
  const sixMonthsAgoIdx = Math.min(5, pnls.length - 1);
  const sixMonthAgoPnl = pnls[sixMonthsAgoIdx];
  const revenueGrowth = sixMonthAgoPnl.revenue > 0
    ? Math.round(((latestPnl.revenue - sixMonthAgoPnl.revenue) / sixMonthAgoPnl.revenue) * 1000) / 10
    : 0;

  // Compute trends by comparing latest to one period prior
  function trendFromTwo(latest: number, prior: number): 'up' | 'down' | 'flat' {
    if (latest > prior * 1.02) return 'up';
    if (latest < prior * 0.98) return 'down';
    return 'flat';
  }

  const priorPnl = pnls.length > 1 ? pnls[1] : latestPnl;
  const priorFin = fin.filter((f) => f.period === (periods[1] ?? latestPeriod));
  let priorAssets = 0, priorLiabilities = 0;
  for (const f of priorFin) {
    const acc = accountMap.get(f.account_id);
    if (!acc) continue;
    if (acc.class.toUpperCase() === 'ASSET') priorAssets += Number(f.amount);
    if (acc.class.toUpperCase() === 'LIABILITY') priorLiabilities += Number(f.amount);
  }
  const priorCurrentRatio = priorLiabilities > 0 ? priorAssets / priorLiabilities : 0;
  const priorGrossMargin = priorPnl.revenue > 0 ? (priorPnl.grossProfit / priorPnl.revenue) * 100 : 0;
  const priorNetMargin = priorPnl.revenue > 0 ? (priorPnl.netProfit / priorPnl.revenue) * 100 : 0;
  const priorExpenseRatio = priorPnl.revenue > 0 ? (priorPnl.expenses / priorPnl.revenue) * 100 : 0;

  // Industry benchmarks (reference constants - external data)
  const benchmarks: BenchmarkRow[] = [
    {
      metric: 'Current Ratio',
      yours: currentRatio,
      industry: 1.5,
      unit: 'x',
      trend: trendFromTwo(currentRatio, priorCurrentRatio),
    },
    {
      metric: 'Gross Margin',
      yours: grossMargin,
      industry: 48,
      unit: '%',
      trend: trendFromTwo(grossMargin, priorGrossMargin),
    },
    {
      metric: 'Net Profit Margin',
      yours: netMargin,
      industry: 14,
      unit: '%',
      trend: trendFromTwo(netMargin, priorNetMargin),
    },
    {
      metric: 'Expense Ratio',
      yours: expenseRatio,
      industry: 34,
      unit: '%',
      trend: trendFromTwo(expenseRatio, priorExpenseRatio),
    },
    {
      metric: 'Revenue Growth',
      yours: revenueGrowth,
      industry: 15,
      unit: '%',
      trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'flat',
    },
  ];

  return <BenchmarksClient benchmarks={benchmarks} hasData={true} />;
}
