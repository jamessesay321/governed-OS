/**
 * Universal Health Check
 *
 * The 5-10 metrics every business gets checked on regardless of industry.
 * All math is deterministic TypeScript; the LLM is only used for the
 * plain-English summary at the end.
 */

import { callLLMCached } from '@/lib/ai/cache';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getCompanyContextPrefix } from '@/lib/skills/company-skill';
import { governedOutput, xeroFinancialsSource } from '@/lib/governance/checkpoint';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthCheckResult {
  orgId: string;
  checkedAt: string;
  overallScore: number; // 0-100
  metrics: HealthMetric[];
  alerts: HealthAlert[];
  summary: string;
}

export interface HealthMetric {
  name: string;
  category: 'revenue' | 'profitability' | 'cash' | 'efficiency' | 'risk';
  value: number;
  unit: 'currency' | 'percentage' | 'days' | 'ratio';
  status: 'healthy' | 'watch' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  benchmark?: string;
  explanation: string;
}

export interface HealthAlert {
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  message: string;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(value: number, base: number): number {
  if (base === 0) return 0;
  return Math.round(((value / base) * 100 + Number.EPSILON) * 100) / 100;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

type Status = HealthMetric['status'];
type Trend = HealthMetric['trend'];

function scoreBucket(status: Status): number {
  switch (status) {
    case 'healthy':  return 100;
    case 'watch':    return 70;
    case 'warning':  return 40;
    case 'critical': return 10;
  }
}

function determineTrend(current: number, previous: number | null): Trend {
  if (previous === null) return 'stable';
  const delta = current - previous;
  const threshold = Math.abs(previous) * 0.02; // 2% change threshold
  if (delta > threshold) return 'improving';
  if (delta < -threshold) return 'declining';
  return 'stable';
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Run a comprehensive health check on the organisation's financials.
 */
export async function runHealthCheck(orgId: string): Promise<HealthCheckResult> {
  const supabase = await createUntypedServiceClient();

  // Fetch financial data
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const fins = (financials ?? []) as NormalisedFinancial[];
  const accs = (accounts ?? []) as ChartOfAccount[];

  const periods = getAvailablePeriods(fins);

  if (periods.length === 0) {
    const result: HealthCheckResult = {
      orgId,
      checkedAt: new Date().toISOString(),
      overallScore: 0,
      metrics: [],
      alerts: [{
        severity: 'info',
        metric: 'data',
        message: 'No financial data available.',
        recommendation: 'Connect your accounting system (e.g. Xero) and sync data to enable health checks.',
      }],
      summary: 'No financial data available to perform a health check. Connect your accounting system to get started.',
    };
    return result;
  }

  // Take up to 6 most recent periods
  const recentPeriods = periods.slice(0, 6);
  const pnls = recentPeriods.map((p) => buildPnL(fins, accs, p));

  const current = pnls[0];
  const previous = pnls.length > 1 ? pnls[1] : null;

  const metrics: HealthMetric[] = [];
  const alerts: HealthAlert[] = [];

  // -----------------------------------------------------------------------
  // 1. Revenue Growth Rate (MoM)
  // -----------------------------------------------------------------------
  if (previous) {
    const revenueGrowthMoM = pct(current.revenue - previous.revenue, Math.abs(previous.revenue));
    const revGrowthStatus: Status =
      revenueGrowthMoM > 5 ? 'healthy' :
      revenueGrowthMoM >= 0 ? 'watch' :
      revenueGrowthMoM >= -10 ? 'warning' : 'critical';

    metrics.push({
      name: 'Revenue Growth (MoM)',
      category: 'revenue',
      value: revenueGrowthMoM,
      unit: 'percentage',
      status: revGrowthStatus,
      trend: revenueGrowthMoM > 0 ? 'improving' : revenueGrowthMoM < -2 ? 'declining' : 'stable',
      benchmark: '3-8% MoM for growth-stage',
      explanation: `Revenue ${revenueGrowthMoM >= 0 ? 'grew' : 'declined'} ${Math.abs(revenueGrowthMoM).toFixed(1)}% from the previous month.`,
    });

    if (revGrowthStatus === 'warning' || revGrowthStatus === 'critical') {
      alerts.push({
        severity: revGrowthStatus === 'critical' ? 'critical' : 'warning',
        metric: 'Revenue Growth (MoM)',
        message: `Revenue declined ${Math.abs(revenueGrowthMoM).toFixed(1)}% month-on-month.`,
        recommendation: 'Investigate whether this is seasonal or indicative of a structural issue. Review pipeline and customer churn.',
      });
    }
  }

  // YoY growth if we have 12+ months
  if (pnls.length >= 12 || (recentPeriods.length >= 2 && periods.length >= 12)) {
    // Find the same month last year
    const currentMonth = current.period;
    const yearAgoMonth = `${parseInt(currentMonth.slice(0, 4)) - 1}${currentMonth.slice(4)}`;
    const yearAgoPnl = pnls.find((p) => p.period === yearAgoMonth) ??
      (periods.includes(yearAgoMonth) ? buildPnL(fins, accs, yearAgoMonth) : null);

    if (yearAgoPnl) {
      const yoyGrowth = pct(current.revenue - yearAgoPnl.revenue, Math.abs(yearAgoPnl.revenue));
      metrics.push({
        name: 'Revenue Growth (YoY)',
        category: 'revenue',
        value: yoyGrowth,
        unit: 'percentage',
        status: yoyGrowth > 10 ? 'healthy' : yoyGrowth >= 0 ? 'watch' : 'warning',
        trend: yoyGrowth > 0 ? 'improving' : 'declining',
        benchmark: '10-30% YoY for healthy growth',
        explanation: `Revenue ${yoyGrowth >= 0 ? 'grew' : 'declined'} ${Math.abs(yoyGrowth).toFixed(1)}% year-on-year.`,
      });
    }
  }

  // -----------------------------------------------------------------------
  // 2. Gross Margin (and trend)
  // -----------------------------------------------------------------------
  const grossMargin = pct(current.grossProfit, current.revenue);
  const prevGrossMargin = previous ? pct(previous.grossProfit, previous.revenue) : null;
  const grossMarginStatus: Status =
    grossMargin > 50 ? 'healthy' :
    grossMargin > 30 ? 'watch' :
    grossMargin > 15 ? 'warning' : 'critical';

  metrics.push({
    name: 'Gross Margin',
    category: 'profitability',
    value: grossMargin,
    unit: 'percentage',
    status: grossMarginStatus,
    trend: determineTrend(grossMargin, prevGrossMargin),
    benchmark: '40-70% for services, 20-50% for product businesses',
    explanation: `Gross margin is ${grossMargin.toFixed(1)}%, meaning ${grossMargin.toFixed(0)}p of every £1 of revenue is retained after direct costs.`,
  });

  if (grossMarginStatus === 'warning' || grossMarginStatus === 'critical') {
    alerts.push({
      severity: grossMarginStatus === 'critical' ? 'critical' : 'warning',
      metric: 'Gross Margin',
      message: `Gross margin at ${grossMargin.toFixed(1)}% is below healthy levels.`,
      recommendation: 'Review pricing strategy and direct cost control. Consider whether cost of sales includes items that should be overhead.',
    });
  }

  // -----------------------------------------------------------------------
  // 3. Operating Margin
  // -----------------------------------------------------------------------
  const opMargin = pct(current.netProfit, current.revenue);
  const prevOpMargin = previous ? pct(previous.netProfit, previous.revenue) : null;
  const opMarginStatus: Status =
    opMargin > 15 ? 'healthy' :
    opMargin > 5 ? 'watch' :
    opMargin > 0 ? 'warning' : 'critical';

  metrics.push({
    name: 'Operating Margin',
    category: 'profitability',
    value: opMargin,
    unit: 'percentage',
    status: opMarginStatus,
    trend: determineTrend(opMargin, prevOpMargin),
    benchmark: '10-25% for healthy businesses',
    explanation: `Operating margin is ${opMargin.toFixed(1)}%. ${opMargin < 0 ? 'The business is currently loss-making.' : `£${(current.netProfit).toLocaleString('en-GB', { minimumFractionDigits: 2 })} net profit on £${current.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })} revenue.`}`,
  });

  if (opMarginStatus === 'critical') {
    alerts.push({
      severity: 'critical',
      metric: 'Operating Margin',
      message: `The business is loss-making with a ${opMargin.toFixed(1)}% operating margin.`,
      recommendation: 'Urgent review of cost base needed. Identify largest expense categories and assess which can be reduced.',
    });
  }

  // -----------------------------------------------------------------------
  // 4. Expense Ratio (total expenses / revenue)
  // -----------------------------------------------------------------------
  const totalExpenses = Math.abs(current.costOfSales) + Math.abs(current.expenses);
  const expenseRatio = pct(totalExpenses, current.revenue);
  const prevExpenseRatio = previous
    ? pct(Math.abs(previous.costOfSales) + Math.abs(previous.expenses), previous.revenue)
    : null;
  const expRatioStatus: Status =
    expenseRatio < 80 ? 'healthy' :
    expenseRatio < 95 ? 'watch' :
    expenseRatio < 105 ? 'warning' : 'critical';

  metrics.push({
    name: 'Expense Ratio',
    category: 'efficiency',
    value: expenseRatio,
    unit: 'percentage',
    status: expRatioStatus,
    trend: determineTrend(-expenseRatio, prevExpenseRatio !== null ? -prevExpenseRatio : null), // lower is better
    benchmark: '<85% for profitable businesses',
    explanation: `Total expenses are ${expenseRatio.toFixed(1)}% of revenue. ${expenseRatio > 100 ? 'Spending more than earning.' : ''}`,
  });

  // -----------------------------------------------------------------------
  // 5. Cost Growth vs Revenue Growth
  // -----------------------------------------------------------------------
  if (previous) {
    const revGrowth = pct(current.revenue - previous.revenue, Math.abs(previous.revenue));
    const prevTotalExpenses = Math.abs(previous.costOfSales) + Math.abs(previous.expenses);
    const costGrowth = pct(totalExpenses - prevTotalExpenses, Math.abs(prevTotalExpenses));
    const costGap = costGrowth - revGrowth;

    const costGrowthStatus: Status =
      costGap < -5 ? 'healthy' :  // costs growing slower than revenue
      costGap < 5 ? 'watch' :
      costGap < 15 ? 'warning' : 'critical';

    metrics.push({
      name: 'Cost Growth vs Revenue Growth',
      category: 'efficiency',
      value: costGap,
      unit: 'percentage',
      status: costGrowthStatus,
      trend: costGap < 0 ? 'improving' : costGap > 5 ? 'declining' : 'stable',
      benchmark: 'Costs should grow slower than revenue',
      explanation: `Costs grew ${costGrowth.toFixed(1)}% vs revenue growth of ${revGrowth.toFixed(1)}%. ${costGap > 0 ? 'Costs are scaling faster than revenue.' : 'Good cost discipline.'}`,
    });

    if (costGrowthStatus === 'warning' || costGrowthStatus === 'critical') {
      alerts.push({
        severity: 'warning',
        metric: 'Cost Growth vs Revenue Growth',
        message: `Costs are growing ${costGap.toFixed(1)} percentage points faster than revenue.`,
        recommendation: 'Review whether cost increases are investments (expected to pay back) or structural inflation. Identify the top 3 cost drivers.',
      });
    }
  }

  // -----------------------------------------------------------------------
  // 6. Burn Rate (if expenses > revenue)
  // -----------------------------------------------------------------------
  if (current.netProfit < 0) {
    const monthlyBurn = Math.abs(current.netProfit);
    metrics.push({
      name: 'Monthly Burn Rate',
      category: 'cash',
      value: monthlyBurn,
      unit: 'currency',
      status: monthlyBurn > current.revenue * 0.5 ? 'critical' : 'warning',
      trend: previous && previous.netProfit < 0
        ? (Math.abs(current.netProfit) < Math.abs(previous.netProfit) ? 'improving' : 'declining')
        : 'stable',
      explanation: `Burning £${monthlyBurn.toLocaleString('en-GB', { minimumFractionDigits: 2 })} per month. The business is spending more than it earns.`,
    });

    alerts.push({
      severity: monthlyBurn > current.revenue ? 'critical' : 'warning',
      metric: 'Burn Rate',
      message: `Monthly burn of £${monthlyBurn.toLocaleString('en-GB', { minimumFractionDigits: 0 })}.`,
      recommendation: 'Calculate runway (cash reserves / burn rate). Identify path to breakeven or plan next funding.',
    });
  }

  // -----------------------------------------------------------------------
  // 7. Margin Stability (std dev of gross margin over available months)
  // -----------------------------------------------------------------------
  if (pnls.length >= 3) {
    const margins = pnls.map((p) => (p.revenue > 0 ? (p.grossProfit / p.revenue) * 100 : 0));
    const marginStdDev = stddev(margins);
    const stabilityStatus: Status =
      marginStdDev < 3 ? 'healthy' :
      marginStdDev < 7 ? 'watch' :
      marginStdDev < 15 ? 'warning' : 'critical';

    metrics.push({
      name: 'Margin Stability',
      category: 'risk',
      value: marginStdDev,
      unit: 'percentage',
      status: stabilityStatus,
      trend: 'stable',
      benchmark: '<5% standard deviation is stable',
      explanation: `Gross margin standard deviation of ${marginStdDev.toFixed(1)}% over ${pnls.length} months. ${marginStdDev > 7 ? 'Significant volatility in margins.' : 'Margins are reasonably stable.'}`,
    });

    if (stabilityStatus === 'warning' || stabilityStatus === 'critical') {
      alerts.push({
        severity: 'warning',
        metric: 'Margin Stability',
        message: `Gross margins are volatile (${marginStdDev.toFixed(1)}% std dev).`,
        recommendation: 'Investigate what drives margin swings — pricing changes, mix shifts, or one-off cost items.',
      });
    }
  }

  // -----------------------------------------------------------------------
  // 8. Revenue Concentration (proxy: check if one account dominates)
  // -----------------------------------------------------------------------
  const revenueSection = current.sections.find((s) => s.class === 'REVENUE');
  if (revenueSection && revenueSection.rows.length > 1) {
    const totalRev = revenueSection.total;
    const sorted = [...revenueSection.rows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    const topAccount = sorted[0];
    const topAccountPct = pct(Math.abs(topAccount.amount), Math.abs(totalRev));

    const concentrationStatus: Status =
      topAccountPct < 40 ? 'healthy' :
      topAccountPct < 60 ? 'watch' :
      topAccountPct < 80 ? 'warning' : 'critical';

    metrics.push({
      name: 'Revenue Concentration',
      category: 'risk',
      value: topAccountPct,
      unit: 'percentage',
      status: concentrationStatus,
      trend: 'stable',
      benchmark: 'No single revenue stream >50%',
      explanation: `Largest revenue line ("${topAccount.accountName}") represents ${topAccountPct.toFixed(0)}% of total revenue.`,
    });

    if (concentrationStatus === 'warning' || concentrationStatus === 'critical') {
      alerts.push({
        severity: 'warning',
        metric: 'Revenue Concentration',
        message: `"${topAccount.accountName}" accounts for ${topAccountPct.toFixed(0)}% of revenue.`,
        recommendation: 'High concentration risk. Explore diversification or ensure key customer retention strategies are in place.',
      });
    }
  }

  // -----------------------------------------------------------------------
  // Calculate overall health score (weighted average)
  // -----------------------------------------------------------------------
  const overallScore = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + scoreBucket(m.status), 0) / metrics.length)
    : 0;

  // -----------------------------------------------------------------------
  // Generate plain-English summary via LLM
  // -----------------------------------------------------------------------
  let summary = `Health score: ${overallScore}/100. ${metrics.filter((m) => m.status === 'healthy').length} metrics healthy, ${metrics.filter((m) => m.status === 'warning' || m.status === 'critical').length} need attention.`;

  try {
    const metricsJson = metrics.map((m) => ({
      name: m.name,
      value: m.value,
      unit: m.unit,
      status: m.status,
      trend: m.trend,
    }));

    const companyContext = await getCompanyContextPrefix(orgId);
    const llmResult = await callLLMCached({
      systemPrompt: `${companyContext ? companyContext + '\n\n' : ''}You are a financial health analyst. Given the health metrics below, write a 2-3 sentence plain English summary for a business owner. Be direct, specific, and actionable. Use £ currency. Do NOT use JSON — respond with plain text only.`,
      userMessage: `Organisation health score: ${overallScore}/100\n\nMetrics:\n${JSON.stringify(metricsJson, null, 2)}\n\nAlerts:\n${alerts.map((a) => `[${a.severity}] ${a.message}`).join('\n')}`,
      orgId,
      temperature: 0.3,
      model: 'haiku',
      maxTokens: 512,
      cacheSystemPrompt: true,
    });
    summary = llmResult.response.trim();

    // Governance checkpoint — audit trail for health summaries
    await governedOutput({
      orgId,
      outputType: 'health_summary',
      content: summary,
      modelTier: 'haiku',
      modelId: 'claude-haiku-4-20250414',
      dataSources: [
        xeroFinancialsSource(recentPeriods[0]),
        { type: 'health_metrics', reference: `${metrics.length} metrics, score ${overallScore}/100` },
      ],
      tokensUsed: llmResult.tokensUsed,
      cached: false,
    });
  } catch (err) {
    console.error('[analysis/health-check] LLM summary failed, using fallback:', err);
  }

  // -----------------------------------------------------------------------
  // Save to health_checks table
  // -----------------------------------------------------------------------
  const result: HealthCheckResult = {
    orgId,
    checkedAt: new Date().toISOString(),
    overallScore,
    metrics,
    alerts,
    summary,
  };

  const { error: insertError } = await supabase
    .from('health_checks')
    .insert({
      org_id: orgId,
      overall_score: overallScore,
      metrics: metrics as unknown as Record<string, unknown>[],
      alerts: alerts as unknown as Record<string, unknown>[],
      summary,
      checked_at: result.checkedAt,
    });

  if (insertError) {
    console.error('[analysis/health-check] Failed to save health check:', insertError.message);
  }

  return result;
}
