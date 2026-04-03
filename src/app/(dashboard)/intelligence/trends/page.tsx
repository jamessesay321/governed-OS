import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { formatCurrencyCompact } from '@/lib/formatting/currency';
import { TrendsClient } from './trends-client';

export interface TrendItem {
  title: string;
  detail: string;
  direction: 'up' | 'down' | 'flat';
}

function formatCurrency(amount: number): string {
  return formatCurrencyCompact(amount);
}

function computeDirection(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return last > 0 ? 'up' : last < 0 ? 'down' : 'flat';
  const change = ((last - first) / Math.abs(first)) * 100;
  if (change > 3) return 'up';
  if (change < -3) return 'down';
  return 'flat';
}

export default async function TrendsPage() {
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
    return <TrendsClient trends={[]} hasData={false} />;
  }

  const periods = getAvailablePeriods(fin);

  if (periods.length < 2) {
    return <TrendsClient trends={[]} hasData={true} />;
  }

  // Build P&L for each period (periods are sorted newest first, reverse for chronological)
  const chronologicalPeriods = [...periods].reverse();
  const pnls = chronologicalPeriods.map((p) => buildPnL(fin, accts, p));

  const trends: TrendItem[] = [];

  // Revenue trend
  const revenues = pnls.map((p) => p.revenue);
  const revenueDirection = computeDirection(revenues);
  const firstRevenue = revenues[0];
  const lastRevenue = revenues[revenues.length - 1];
  const revenueChange = firstRevenue > 0
    ? (((lastRevenue - firstRevenue) / firstRevenue) * 100).toFixed(1)
    : '0';

  trends.push({
    title: revenueDirection === 'up'
      ? 'Revenue Growing'
      : revenueDirection === 'down'
      ? 'Revenue Declining'
      : 'Revenue Stable',
    detail: `Revenue moved from ${formatCurrency(firstRevenue)} to ${formatCurrency(lastRevenue)} over ${pnls.length} periods (${revenueChange}% change).`,
    direction: revenueDirection,
  });

  // Gross margin trend
  const grossMargins = pnls.map((p) =>
    p.revenue > 0 ? (p.grossProfit / p.revenue) * 100 : 0
  );
  const gmDirection = computeDirection(grossMargins);
  const firstGM = grossMargins[0];
  const lastGM = grossMargins[grossMargins.length - 1];

  trends.push({
    title: gmDirection === 'up'
      ? 'Gross Margin Expanding'
      : gmDirection === 'down'
      ? 'Gross Margin Compressing'
      : 'Gross Margin Stable',
    detail: `Gross margin moved from ${firstGM.toFixed(1)}% to ${lastGM.toFixed(1)}% over ${pnls.length} periods.`,
    direction: gmDirection,
  });

  // Expense trend (relative to revenue)
  const expenseRatios = pnls.map((p) =>
    p.revenue > 0 ? (p.expenses / p.revenue) * 100 : 0
  );
  const expDirection = computeDirection(expenseRatios);
  const firstExp = expenseRatios[0];
  const lastExp = expenseRatios[expenseRatios.length - 1];

  // For expenses, "up" direction means growing faster (bad), so flip labelling
  trends.push({
    title: expDirection === 'up'
      ? 'Expense Ratio Growing'
      : expDirection === 'down'
      ? 'Expense Ratio Improving'
      : 'Expense Ratio Stable',
    detail: `Expenses as a share of revenue went from ${firstExp.toFixed(1)}% to ${lastExp.toFixed(1)}% over ${pnls.length} periods.`,
    direction: expDirection === 'up' ? 'down' : expDirection === 'down' ? 'up' : 'flat',
  });

  // Net profit trend
  const netProfits = pnls.map((p) => p.netProfit);
  const npDirection = computeDirection(netProfits);
  const firstNP = netProfits[0];
  const lastNP = netProfits[netProfits.length - 1];

  trends.push({
    title: npDirection === 'up'
      ? 'Net Profit Improving'
      : npDirection === 'down'
      ? 'Net Profit Declining'
      : 'Net Profit Stable',
    detail: `Net profit moved from ${formatCurrency(firstNP)} to ${formatCurrency(lastNP)} over ${pnls.length} periods.`,
    direction: npDirection,
  });

  return <TrendsClient trends={trends} hasData={true} />;
}
