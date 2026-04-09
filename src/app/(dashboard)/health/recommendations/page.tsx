import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { fetchFinanceCosts, adjustNetProfitForFinanceCosts } from '@/lib/financial/finance-costs';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { RecommendationsClient } from './recommendations-client';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  iconName: 'shield' | 'trending-down' | 'dollar-sign' | 'bar-chart' | 'lightbulb';
  action: string;
  actionHref: string;
}

export default async function RecommendationsPage() {
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
    return <RecommendationsClient recommendations={[]} hasData={false} />;
  }

  const periods = getAvailablePeriods(fin);
  const financeCosts = await fetchFinanceCosts(orgId);
  const pnls = periods.map((p) => {
    const pnl = buildPnL(fin, accts, p);
    return {
      ...pnl,
      netProfit: adjustNetProfitForFinanceCosts(pnl.netProfit, financeCosts),
    };
  });
  const latestPnl = pnls[0];
  const latestPeriod = periods[0];

  // Balance sheet totals
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

  // Compute metrics
  const grossMarginPct = latestPnl.revenue > 0
    ? (latestPnl.grossProfit / latestPnl.revenue) * 100
    : 0;
  const currentRatio = totalLiabilities > 0
    ? totalAssets / totalLiabilities
    : 999;
  const expenseToRevenue = latestPnl.revenue > 0
    ? latestPnl.expenses / latestPnl.revenue
    : 0;
  const netMarginPct = latestPnl.revenue > 0
    ? (latestPnl.netProfit / latestPnl.revenue) * 100
    : 0;

  // Revenue trend
  const firstPnl = pnls[pnls.length - 1];
  const revenueDecline = pnls.length > 1 && latestPnl.revenue < firstPnl.revenue;

  // Generate recommendations based on actual data
  const recommendations: Recommendation[] = [];

  if (grossMarginPct < 50) {
    recommendations.push({
      id: 'improve-margins',
      title: 'Investigate Margin Compression',
      description: `Your gross margin is ${grossMarginPct.toFixed(1)}%, which is below 50%. Review supplier contracts, pricing strategy, and cost of goods to identify opportunities for improvement.`,
      impact: grossMarginPct < 30 ? 'high' : 'medium',
      category: 'Profitability',
      iconName: 'trending-down',
      action: 'Analyse Margins',
      actionHref: '/financials',
    });
  }

  if (currentRatio < 1.5) {
    recommendations.push({
      id: 'improve-liquidity',
      title: 'Strengthen Liquidity Position',
      description: `Your current ratio is ${currentRatio.toFixed(1)}x, below the recommended 1.5x threshold. Consider improving cash collection, reducing short-term liabilities, or building cash reserves.`,
      impact: currentRatio < 1.0 ? 'high' : 'medium',
      category: 'Liquidity',
      iconName: 'shield',
      action: 'Review Cash Position',
      actionHref: '/financials',
    });
  }

  if (expenseToRevenue > 0.85) {
    recommendations.push({
      id: 'reduce-costs',
      title: 'Reduce Operating Costs',
      description: `Operating expenses represent ${(expenseToRevenue * 100).toFixed(1)}% of revenue, above the 85% threshold. Audit discretionary spending and identify areas for cost optimisation.`,
      impact: expenseToRevenue > 0.95 ? 'high' : 'medium',
      category: 'Efficiency',
      iconName: 'dollar-sign',
      action: 'View Expense Breakdown',
      actionHref: '/financials',
    });
  }

  if (revenueDecline) {
    const declinePct = firstPnl.revenue > 0
      ? (((firstPnl.revenue - latestPnl.revenue) / firstPnl.revenue) * 100).toFixed(1)
      : '0';
    recommendations.push({
      id: 'growth-strategy',
      title: 'Reverse Revenue Decline',
      description: `Revenue has declined ${declinePct}% from ${firstPnl.period} to ${latestPnl.period}. Explore new customer acquisition channels, upselling opportunities, or product expansion to restore growth.`,
      impact: 'high',
      category: 'Growth',
      iconName: 'bar-chart',
      action: 'View Growth KPIs',
      actionHref: '/kpis',
    });
  }

  if (netMarginPct < 10) {
    recommendations.push({
      id: 'profitability-focus',
      title: 'Improve Net Profitability',
      description: `Net profit margin is ${netMarginPct.toFixed(1)}%, below the 10% target. Focus on a combination of revenue growth and cost management to improve bottom-line performance.`,
      impact: netMarginPct < 0 ? 'high' : 'medium',
      category: 'Profitability',
      iconName: 'lightbulb',
      action: 'Explore Scenarios',
      actionHref: '/scenarios',
    });
  }

  // If no issues detected, add a positive recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'maintain-performance',
      title: 'Maintain Strong Performance',
      description: 'Your financial metrics are within healthy ranges. Continue monitoring key ratios and maintain current cost discipline.',
      impact: 'low',
      category: 'General',
      iconName: 'lightbulb',
      action: 'View Dashboard',
      actionHref: '/dashboard',
    });
  }

  return <RecommendationsClient recommendations={recommendations} hasData={true} />;
}
