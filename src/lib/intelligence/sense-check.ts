import type { PnLSummary } from '@/lib/financial/aggregate';

// ─── Types ───────────────────────────────────────────────────────────
export type FlagSeverity = 'info' | 'warning' | 'critical';
export type FlagMetric = 'revenue' | 'gross_margin' | 'expenses' | 'net_profit' | 'general';

export interface SenseCheckFlag {
  id: string;
  severity: FlagSeverity;
  /** Which KPI card this flag applies to (or 'general' for banner-level) */
  metric: FlagMetric;
  title: string;
  detail: string;
  /** Industry benchmark for inline comparison */
  benchmark?: { label: string; value: string };
}

export interface IndustryBenchmark {
  grossMarginRange: [number, number];
  netMarginRange: [number, number];
  label: string;
}

// ─── Industry Benchmarks ────────────────────────────────────────────
// Source: IBISWorld UK, ONS, SBA sector benchmarks (2024)
const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  fashion:        { grossMarginRange: [45, 60], netMarginRange: [5, 12],  label: 'Fashion / Apparel' },
  apparel:        { grossMarginRange: [45, 60], netMarginRange: [5, 12],  label: 'Fashion / Apparel' },
  retail:         { grossMarginRange: [25, 50], netMarginRange: [2, 8],   label: 'Retail' },
  ecommerce:      { grossMarginRange: [40, 55], netMarginRange: [5, 12],  label: 'E-Commerce' },
  saas:           { grossMarginRange: [70, 85], netMarginRange: [10, 25], label: 'SaaS' },
  software:       { grossMarginRange: [70, 85], netMarginRange: [10, 25], label: 'Software' },
  subscription:   { grossMarginRange: [65, 80], netMarginRange: [8, 20],  label: 'Subscription' },
  services:       { grossMarginRange: [30, 60], netMarginRange: [8, 15],  label: 'Professional Services' },
  consulting:     { grossMarginRange: [40, 65], netMarginRange: [10, 20], label: 'Consulting' },
  agency:         { grossMarginRange: [35, 55], netMarginRange: [8, 15],  label: 'Creative Agency' },
  manufacturing:  { grossMarginRange: [25, 40], netMarginRange: [3, 10],  label: 'Manufacturing' },
  construction:   { grossMarginRange: [15, 30], netMarginRange: [2, 8],   label: 'Construction' },
  hospitality:    { grossMarginRange: [55, 70], netMarginRange: [3, 10],  label: 'Hospitality' },
  food:           { grossMarginRange: [55, 70], netMarginRange: [3, 10],  label: 'Food & Beverage' },
  restaurant:     { grossMarginRange: [55, 70], netMarginRange: [3, 10],  label: 'Restaurant' },
  healthcare:     { grossMarginRange: [40, 60], netMarginRange: [5, 15],  label: 'Healthcare' },
  education:      { grossMarginRange: [50, 70], netMarginRange: [5, 15],  label: 'Education' },
  logistics:      { grossMarginRange: [15, 30], netMarginRange: [2, 8],   label: 'Logistics' },
  media:          { grossMarginRange: [40, 60], netMarginRange: [5, 15],  label: 'Media' },
  beauty:         { grossMarginRange: [50, 65], netMarginRange: [8, 15],  label: 'Beauty & Cosmetics' },
};

const DEFAULT_BENCHMARK: IndustryBenchmark = {
  grossMarginRange: [30, 50],
  netMarginRange: [5, 12],
  label: 'UK SME Average',
};

/**
 * Look up the best matching industry benchmark for a given industry string.
 * Fuzzy-matches against known keywords.
 * DETERMINISTIC — pure function.
 */
export function getIndustryBenchmark(industry: string): IndustryBenchmark {
  if (!industry) return DEFAULT_BENCHMARK;
  const lower = industry.toLowerCase();
  for (const [key, benchmark] of Object.entries(INDUSTRY_BENCHMARKS)) {
    if (lower.includes(key)) return benchmark;
  }
  return DEFAULT_BENCHMARK;
}

/**
 * Run sense-checks on P&L data and return intelligence flags.
 *
 * This is the business context layer that was missing — it checks whether
 * the numbers MAKE SENSE for this specific business, not just whether they
 * are mathematically correct.
 *
 * DETERMINISTIC — pure function, no side effects, no DB calls.
 *
 * @param currentPnl  - The P&L for the selected period
 * @param previousPnl - The P&L for the prior period (for trend checks)
 * @param allPnls     - All available P&Ls sorted descending (for multi-period analysis)
 * @param industry    - The business industry (from onboarding)
 * @param selectedPeriod - The currently selected period string (YYYY-MM-DD)
 */
export function runSenseChecks(
  currentPnl: PnLSummary,
  previousPnl: PnLSummary | null,
  allPnls: PnLSummary[],
  industry: string,
  selectedPeriod: string,
): SenseCheckFlag[] {
  const flags: SenseCheckFlag[] = [];
  const benchmark = getIndustryBenchmark(industry);
  const grossMargin = currentPnl.revenue > 0
    ? (currentPnl.grossProfit / currentPnl.revenue) * 100
    : 0;
  const netMargin = currentPnl.revenue > 0
    ? (currentPnl.netProfit / currentPnl.revenue) * 100
    : 0;

  // ── 1. Partial Month Detection ──────────────────────────────────
  const today = new Date();
  const periodDate = new Date(selectedPeriod);
  const isCurrentMonth =
    periodDate.getFullYear() === today.getFullYear() &&
    periodDate.getMonth() === today.getMonth();
  const dayOfMonth = today.getDate();

  if (isCurrentMonth && dayOfMonth < 25) {
    const pctThrough = Math.round((dayOfMonth / 30) * 100);
    flags.push({
      id: 'partial_month',
      severity: 'warning',
      metric: 'general',
      title: 'Partial month data',
      detail: `Only ${dayOfMonth} days of data (~${pctThrough}% of month). Figures will change as more transactions are recorded. Compare to prior complete months for trends.`,
    });
  }

  // ── 2. Gross Margin vs Industry Benchmark ───────────────────────
  const [gmLow, gmHigh] = benchmark.grossMarginRange;

  if (currentPnl.revenue > 0) {
    if (grossMargin > gmHigh + 15) {
      // Way above range — likely data issue or very unusual business model
      flags.push({
        id: 'margin_anomaly_high',
        severity: 'critical',
        metric: 'gross_margin',
        title: 'Gross margin unusually high',
        detail: `${grossMargin.toFixed(1)}% is significantly above the ${benchmark.label} range of ${gmLow}–${gmHigh}%. This may indicate missing cost of sales data, misclassified expenses, or an unusual revenue mix.`,
        benchmark: {
          label: `${benchmark.label} typical`,
          value: `${gmLow}–${gmHigh}%`,
        },
      });
    } else if (grossMargin > gmHigh) {
      flags.push({
        id: 'margin_above_benchmark',
        severity: 'info',
        metric: 'gross_margin',
        title: 'Gross margin above industry range',
        detail: `${grossMargin.toFixed(1)}% is above the ${benchmark.label} range of ${gmLow}–${gmHigh}%. Strong performance — or worth checking COGS is fully captured.`,
        benchmark: {
          label: `${benchmark.label} typical`,
          value: `${gmLow}–${gmHigh}%`,
        },
      });
    } else if (grossMargin < gmLow) {
      flags.push({
        id: 'margin_below_benchmark',
        severity: 'warning',
        metric: 'gross_margin',
        title: 'Gross margin below industry range',
        detail: `${grossMargin.toFixed(1)}% is below the ${benchmark.label} range of ${gmLow}–${gmHigh}%. This may indicate pricing pressure, rising input costs, or product mix shift.`,
        benchmark: {
          label: `${benchmark.label} typical`,
          value: `${gmLow}–${gmHigh}%`,
        },
      });
    } else {
      // Within range — positive signal
      flags.push({
        id: 'margin_within_benchmark',
        severity: 'info',
        metric: 'gross_margin',
        title: 'Gross margin within industry range',
        detail: `${grossMargin.toFixed(1)}% sits within the ${benchmark.label} range of ${gmLow}–${gmHigh}%.`,
        benchmark: {
          label: `${benchmark.label} typical`,
          value: `${gmLow}–${gmHigh}%`,
        },
      });
    }
  }

  // ── 3. COGS Zero Check ──────────────────────────────────────────
  if (currentPnl.revenue > 0 && currentPnl.costOfSales === 0) {
    flags.push({
      id: 'cogs_zero',
      severity: 'critical',
      metric: 'gross_margin',
      title: 'No cost of sales recorded',
      detail: 'Revenue is positive but Cost of Sales is zero. This means gross margin is 100%, which is almost never correct. Check that direct costs are properly classified in your accounting software.',
    });
  }

  // ── 4. Revenue Volatility ──────────────────────────────────────
  if (previousPnl && previousPnl.revenue > 0 && currentPnl.revenue > 0) {
    const revenueChange =
      ((currentPnl.revenue - previousPnl.revenue) / previousPnl.revenue) * 100;

    if (revenueChange > 50) {
      flags.push({
        id: 'revenue_spike',
        severity: 'warning',
        metric: 'revenue',
        title: 'Significant revenue increase',
        detail: `Revenue up ${revenueChange.toFixed(0)}% vs prior period. Verify this reflects genuine growth, not a one-off (grant, asset sale, or timing difference).`,
      });
    } else if (revenueChange < -30) {
      flags.push({
        id: 'revenue_drop',
        severity: 'warning',
        metric: 'revenue',
        title: 'Significant revenue decline',
        detail: `Revenue down ${Math.abs(revenueChange).toFixed(0)}% vs prior period. Check for seasonal patterns, lost clients, or delayed invoicing.`,
      });
    }
  }

  // ── 5. Net Margin Check ─────────────────────────────────────────
  if (currentPnl.revenue > 0) {
    const [nmLow] = benchmark.netMarginRange;
    if (netMargin < 0) {
      flags.push({
        id: 'net_loss',
        severity: 'critical',
        metric: 'net_profit',
        title: 'Net loss this period',
        detail: `Net margin is ${netMargin.toFixed(1)}%. The business made a loss this period. Check whether this is seasonal, a one-off, or a structural issue.`,
        benchmark: {
          label: `${benchmark.label} typical net margin`,
          value: `${benchmark.netMarginRange[0]}–${benchmark.netMarginRange[1]}%`,
        },
      });
    } else if (netMargin < nmLow && netMargin >= 0) {
      flags.push({
        id: 'net_margin_thin',
        severity: 'warning',
        metric: 'net_profit',
        title: 'Thin net margin',
        detail: `Net margin at ${netMargin.toFixed(1)}% is below the ${benchmark.label} range of ${benchmark.netMarginRange[0]}–${benchmark.netMarginRange[1]}%. Limited buffer for unexpected costs.`,
        benchmark: {
          label: `${benchmark.label} typical`,
          value: `${benchmark.netMarginRange[0]}–${benchmark.netMarginRange[1]}%`,
        },
      });
    }
  }

  // ── 6. OpEx Ratio Check ─────────────────────────────────────────
  if (currentPnl.revenue > 0) {
    const opexRatio = (currentPnl.expenses / currentPnl.revenue) * 100;
    if (opexRatio > 60) {
      flags.push({
        id: 'opex_high',
        severity: 'warning',
        metric: 'expenses',
        title: 'High operating expenses',
        detail: `Operating expenses are ${opexRatio.toFixed(0)}% of revenue. Above 60% leaves little room for profit after COGS. Review largest expense categories for savings.`,
      });
    }
  }

  // ── 7. Multi-Period Declining Trend ─────────────────────────────
  if (allPnls.length >= 3) {
    const last3 = allPnls.slice(0, 3);
    const revenueDeclines = last3.every(
      (p, i) => i === 0 || p.revenue >= last3[i - 1].revenue
    );
    // Since allPnls is sorted descending, consecutive declines means
    // each later period (earlier month) has higher revenue
    const isConsecutiveDecline = last3.length >= 3 &&
      last3[0].revenue < last3[1].revenue &&
      last3[1].revenue < last3[2].revenue;

    if (isConsecutiveDecline && last3[0].revenue > 0) {
      const totalDecline =
        ((last3[0].revenue - last3[2].revenue) / last3[2].revenue) * 100;
      flags.push({
        id: 'revenue_declining_trend',
        severity: 'warning',
        metric: 'revenue',
        title: '3-month declining revenue trend',
        detail: `Revenue has declined for 3 consecutive months (${Math.abs(totalDecline).toFixed(0)}% total drop). Investigate root cause — seasonality, churn, or market shift.`,
      });
    }

    // Margin compression check
    const marginTrend = last3.map((p) =>
      p.revenue > 0 ? (p.grossProfit / p.revenue) * 100 : 0
    );
    const isMarginCompressing =
      marginTrend[0] < marginTrend[1] && marginTrend[1] < marginTrend[2];
    if (isMarginCompressing && marginTrend[0] > 0) {
      flags.push({
        id: 'margin_compression',
        severity: 'warning',
        metric: 'gross_margin',
        title: 'Margin compression trend',
        detail: `Gross margin has declined for 3 consecutive months (${marginTrend[2].toFixed(1)}% → ${marginTrend[0].toFixed(1)}%). Input costs may be rising faster than prices.`,
      });
    }
  }

  return flags;
}

/**
 * Filter flags to only those relevant to a specific KPI card metric.
 * DETERMINISTIC — pure function.
 */
export function getFlagsForMetric(
  flags: SenseCheckFlag[],
  metric: FlagMetric
): SenseCheckFlag[] {
  return flags.filter((f) => f.metric === metric);
}

/**
 * Get the highest severity level from a set of flags.
 * DETERMINISTIC — pure function.
 */
export function getHighestSeverity(flags: SenseCheckFlag[]): FlagSeverity | null {
  if (flags.length === 0) return null;
  if (flags.some((f) => f.severity === 'critical')) return 'critical';
  if (flags.some((f) => f.severity === 'warning')) return 'warning';
  return 'info';
}
