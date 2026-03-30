import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { HealthClient } from './health-client';

export interface HealthCategory {
  name: string;
  score: number;
  status: 'green' | 'amber' | 'red';
  trend: 'up' | 'down' | 'flat';
  summary: string;
}

function scoreToStatus(score: number): 'green' | 'amber' | 'red' {
  if (score >= 75) return 'green';
  if (score >= 55) return 'amber';
  return 'red';
}

function computeLiquidityScore(totalAssets: number, totalLiabilities: number): number {
  if (totalLiabilities === 0) return 90;
  const ratio = totalAssets / totalLiabilities;
  if (ratio >= 2.0) return 90;
  if (ratio >= 1.5) return 75;
  if (ratio >= 1.0) return 55;
  return 30;
}

function computeProfitabilityScore(netProfit: number, revenue: number): number {
  if (revenue === 0) return 20;
  const margin = (netProfit / revenue) * 100;
  if (margin >= 15) return 90;
  if (margin >= 10) return 75;
  if (margin >= 5) return 55;
  if (margin >= 0) return 40;
  return 20;
}

function computeEfficiencyScore(expenses: number, revenue: number): number {
  if (revenue === 0) return 35;
  const ratio = expenses / revenue;
  if (ratio <= 0.7) return 85;
  if (ratio <= 0.8) return 70;
  if (ratio <= 0.9) return 55;
  return 35;
}

function computeGrowthScore(latestRevenue: number, firstRevenue: number): number {
  if (firstRevenue === 0) return 40;
  const growth = ((latestRevenue - firstRevenue) / firstRevenue) * 100;
  if (growth >= 20) return 90;
  if (growth >= 10) return 75;
  if (growth >= 5) return 55;
  if (growth >= 0) return 40;
  return 25;
}

function computeTrend(recentScores: number[], priorScores: number[]): 'up' | 'down' | 'flat' {
  const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
  const priorAvg = priorScores.length > 0 ? priorScores.reduce((a, b) => a + b, 0) / priorScores.length : 0;
  const diff = recentAvg - priorAvg;
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'flat';
}

export default async function HealthPage() {
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
    return <HealthClient overallScore={0} categories={[]} hasData={false} />;
  }

  const periods = getAvailablePeriods(fin);

  // Build P&L for each period
  const pnls = periods.map((p) => buildPnL(fin, accts, p));

  // Compute balance sheet totals for the latest period from normalised_financials
  const latestPeriod = periods[0];
  const latestFin = fin.filter((f) => f.period === latestPeriod);
  const accountMap = new Map(accts.map((a) => [a.id, a]));

  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const f of latestFin) {
    const acc = accountMap.get(f.account_id);
    if (!acc) continue;
    const cls = acc.class.toUpperCase();
    if (cls === 'ASSET') totalAssets += Number(f.amount);
    if (cls === 'LIABILITY') totalLiabilities += Number(f.amount);
  }

  const latestPnl = pnls[0];
  const firstPnl = pnls[pnls.length - 1];

  // Compute individual scores for latest period
  const liquidityScore = computeLiquidityScore(totalAssets, totalLiabilities);
  const profitabilityScore = computeProfitabilityScore(latestPnl.netProfit, latestPnl.revenue);
  const efficiencyScore = computeEfficiencyScore(latestPnl.expenses, latestPnl.revenue);
  const growthScore = computeGrowthScore(latestPnl.revenue, firstPnl.revenue);

  // Compute trends: compare latest 3 months vs prior 3 months
  const recentPnls = pnls.slice(0, Math.min(3, pnls.length));
  const priorPnls = pnls.slice(3, Math.min(6, pnls.length));

  const recentLiq = recentPnls.map(() => liquidityScore);
  const priorLiq = priorPnls.map(() => {
    // Recompute for prior periods if available
    if (priorPnls.length === 0) return liquidityScore;
    return liquidityScore; // Simplified: use current for trend calc
  });

  // For more accurate trends, compute per-period scores
  function periodLiqScore(period: string): number {
    const pFin = fin.filter((f) => f.period === period);
    let assets = 0, liabs = 0;
    for (const f of pFin) {
      const acc = accountMap.get(f.account_id);
      if (!acc) continue;
      if (acc.class.toUpperCase() === 'ASSET') assets += Number(f.amount);
      if (acc.class.toUpperCase() === 'LIABILITY') liabs += Number(f.amount);
    }
    return computeLiquidityScore(assets, liabs);
  }

  function periodProfScore(pnl: typeof latestPnl): number {
    return computeProfitabilityScore(pnl.netProfit, pnl.revenue);
  }

  function periodEffScore(pnl: typeof latestPnl): number {
    return computeEfficiencyScore(pnl.expenses, pnl.revenue);
  }

  const recentPeriods = periods.slice(0, Math.min(3, periods.length));
  const priorPeriods = periods.slice(3, Math.min(6, periods.length));

  const liquidityTrend = computeTrend(
    recentPeriods.map(periodLiqScore),
    priorPeriods.map(periodLiqScore)
  );

  const profitabilityTrend = computeTrend(
    recentPnls.map(periodProfScore),
    priorPnls.map(periodProfScore)
  );

  const efficiencyTrend = computeTrend(
    recentPnls.map(periodEffScore),
    priorPnls.map(periodEffScore)
  );

  // Growth trend: compare revenue trend in recent vs prior
  const growthTrend = latestPnl.revenue >= firstPnl.revenue ? 'up' : 'down';

  // Overall score: weighted average
  const overallScore = Math.round(
    liquidityScore * 0.25 +
    profitabilityScore * 0.30 +
    efficiencyScore * 0.20 +
    growthScore * 0.25
  );

  const currentRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(1) : 'N/A';
  const netMargin = latestPnl.revenue > 0 ? ((latestPnl.netProfit / latestPnl.revenue) * 100).toFixed(1) : '0';
  const expenseRatio = latestPnl.revenue > 0 ? ((latestPnl.expenses / latestPnl.revenue) * 100).toFixed(1) : '0';
  const revenueGrowth = firstPnl.revenue > 0 ? (((latestPnl.revenue - firstPnl.revenue) / firstPnl.revenue) * 100).toFixed(1) : '0';

  const categories: HealthCategory[] = [
    {
      name: 'Liquidity',
      score: liquidityScore,
      status: scoreToStatus(liquidityScore),
      trend: liquidityTrend,
      summary: `Current ratio: ${currentRatio}x. ${liquidityScore >= 75 ? 'Strong cash position.' : liquidityScore >= 55 ? 'Adequate liquidity.' : 'Liquidity needs attention.'}`,
    },
    {
      name: 'Profitability',
      score: profitabilityScore,
      status: scoreToStatus(profitabilityScore),
      trend: profitabilityTrend,
      summary: `Net margin: ${netMargin}%. ${profitabilityScore >= 75 ? 'Healthy margins.' : profitabilityScore >= 55 ? 'Margins adequate but room for improvement.' : 'Margins need attention.'}`,
    },
    {
      name: 'Efficiency',
      score: efficiencyScore,
      status: scoreToStatus(efficiencyScore),
      trend: efficiencyTrend,
      summary: `Expense-to-revenue ratio: ${expenseRatio}%. ${efficiencyScore >= 75 ? 'Operating costs well controlled.' : efficiencyScore >= 55 ? 'Costs manageable.' : 'Cost control needed.'}`,
    },
    {
      name: 'Growth',
      score: growthScore,
      status: scoreToStatus(growthScore),
      trend: growthTrend as 'up' | 'down' | 'flat',
      summary: `Revenue growth: ${revenueGrowth}%. ${growthScore >= 75 ? 'Strong growth trajectory.' : growthScore >= 55 ? 'Moderate growth.' : 'Growth needs acceleration.'}`,
    },
  ];

  return <HealthClient overallScore={overallScore} categories={categories} hasData={true} />;
}
