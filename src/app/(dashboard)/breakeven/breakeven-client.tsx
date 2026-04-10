'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Target,
  TrendingUp,
  Scissors,
  Landmark,
  Banknote,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, formatPercent, chartAxisFormatter } from '@/lib/formatting/currency';
import { ExportButton } from '@/components/shared/export-button';
import { NumberLegend } from '@/components/data-primitives';
import type { BreakevenPageData } from './page';
import type { ActionLever } from '@/lib/financial/normalised-ebitda';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface BreakevenClientProps {
  data: BreakevenPageData;
}

/* ================================================================== */
/*  Lever icons                                                        */
/* ================================================================== */

const leverIcons: Record<string, React.ReactNode> = {
  'revenue-growth': <TrendingUp className="h-5 w-5 text-emerald-500" />,
  'cost-reduction': <Scissors className="h-5 w-5 text-amber-500" />,
  'debt-refinancing': <Landmark className="h-5 w-5 text-blue-500" />,
  'pricing': <Banknote className="h-5 w-5 text-violet-500" />,
  'volume': <Package className="h-5 w-5 text-cyan-500" />,
};

/* ================================================================== */
/*  Bridge bar colours                                                 */
/* ================================================================== */

function bridgeBarColor(type: string): string {
  switch (type) {
    case 'revenue':
      return '#10b981'; // emerald-500
    case 'cost':
      return '#ef4444'; // red-500
    case 'addback':
      return '#3b82f6'; // blue-500
    case 'total':
      return '#8b5cf6'; // violet-500
    default:
      return '#6b7280';
  }
}

/* ================================================================== */
/*  Sensitivity cell colour                                            */
/* ================================================================== */

function sensitivityCellColor(months: number | null): string {
  if (months === null) return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400';
  if (months === 0) return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
  if (months <= 6) return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400';
  if (months <= 12) return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400';
  if (months <= 24) return 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400';
  return 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400';
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function BreakevenClient({ data }: BreakevenClientProps) {
  const {
    result,
    levers,
    sensitivityMatrix,
    hasData,
    periodRange,
    overheadBreakdown,
    bridgeSteps,
    averageOrderValue,
  } = data;

  // Build export data for ExportButton
  const exportData = useMemo(() => {
    if (!hasData) return [];
    return [
      {
        metric: 'Revenue',
        actual: result.revenue,
        normalised: result.revenue,
      },
      {
        metric: 'Direct Costs',
        actual: result.directCosts,
        normalised: result.directCosts,
      },
      {
        metric: 'Gross Profit',
        actual: result.revenue - result.directCosts,
        normalised: result.revenue - result.directCosts,
      },
      {
        metric: 'Overheads (ex. interest)',
        actual: result.overheads - result.interestAddback,
        normalised: result.overheads - result.interestAddback,
      },
      {
        metric: 'EBITDA',
        actual: result.ebitda,
        normalised: result.ebitda,
      },
      {
        metric: 'Interest Expense',
        actual: result.actualInterestExpense,
        normalised: result.normalisedInterestExpense,
      },
      {
        metric: 'Net Profit',
        actual: result.actualNetProfit,
        normalised: result.normalisedNetProfit,
      },
      {
        metric: 'Breakeven Revenue (monthly)',
        actual: result.breakEvenRevenue,
        normalised: result.breakEvenRevenue,
      },
    ];
  }, [result, hasData]);

  // Build bridge chart data for waterfall
  const bridgeChartData = useMemo(() => {
    return bridgeSteps.map((step, i) => {
      if (step.type === 'total' || step.type === 'revenue') {
        return {
          label: step.label,
          invisible: 0,
          value: step.value,
          type: step.type,
        };
      }
      // For intermediate steps, show the bar floating from cumulative
      return {
        label: step.label,
        invisible: Math.max(0, step.value > 0 ? step.cumulative - step.value : step.cumulative),
        value: Math.abs(step.value),
        type: step.type,
      };
    });
  }, [bridgeSteps]);

  // Sensitivity matrix: unique revenue growth and cost reduction labels
  const revenueGrowthLabels = useMemo(
    () => [...new Set(sensitivityMatrix.map((s) => s.revenueGrowthLabel))],
    [sensitivityMatrix],
  );
  const costReductionLabels = useMemo(
    () => [...new Set(sensitivityMatrix.map((s) => s.costReductionLabel))],
    [sensitivityMatrix],
  );

  // Breakeven gauge percentage
  const gaugePercent = useMemo(() => {
    if (result.breakEvenRevenue <= 0) return 100;
    return Math.min(100, (result.currentMonthlyRevenue / result.breakEvenRevenue) * 100);
  }, [result]);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-lg font-medium">No financial data available</p>
        <p className="text-sm">Connect your accounting system to see breakeven analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Breakeven & Normalised Profitability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trailing 12 months: {periodRange}
          </p>
        </div>
        <ExportButton
          data={exportData}
          filename="breakeven-analysis"
          title="Breakeven & Normalised Profitability"
          subtitle={periodRange}
        />
      </div>

      <NumberLegend />

      {/* ── Top KPI Cards ───────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          label="EBITDA"
          value={formatCurrencyCompact(result.ebitda)}
          detail={`${formatPercent(result.ebitdaMargin)} margin`}
          positive={result.ebitda >= 0}
        />
        <KPICard
          label="Breakeven Revenue"
          value={`${formatCurrencyCompact(result.breakEvenRevenue)}/mo`}
          detail={`Current: ${formatCurrencyCompact(result.currentMonthlyRevenue)}/mo`}
          positive={result.currentMonthlyRevenue >= result.breakEvenRevenue}
        />
        <KPICard
          label="Interest Overpayment"
          value={`${formatCurrencyCompact(Math.max(0, result.interestDelta))}/yr`}
          detail={`${formatPercent(result.actualWeightedRate * 100)} vs ${formatPercent(result.benchmarkRate * 100)} benchmark`}
          positive={result.interestDelta <= 0}
        />
        <KPICard
          label="Months to Breakeven"
          value={
            result.monthsToBreakEven !== null
              ? result.monthsToBreakEven === 0
                ? 'Now'
                : `${result.monthsToBreakEven} months`
              : '> 5 years'
          }
          detail={
            result.monthsToBreakEven === 0
              ? 'Operating above breakeven'
              : `Gap: ${formatCurrencyCompact(result.revenueGapToBreakEven)}/mo`
          }
          positive={result.monthsToBreakEven !== null && result.monthsToBreakEven <= 12}
        />
      </div>

      {/* ── EBITDA Bridge ───────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">EBITDA Bridge</h2>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={bridgeChartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={chartAxisFormatter()}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <RechartsTooltip
                formatter={(value: unknown) => formatCurrency(Number(value ?? 0))}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              {/* Invisible spacer bar */}
              <Bar dataKey="invisible" stackId="bridge" fill="transparent" />
              {/* Visible value bar */}
              <Bar dataKey="value" stackId="bridge" radius={[4, 4, 0, 0]}>
                {bridgeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={bridgeBarColor(entry.type)} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Interest comparison card */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">Actual Interest Cost</div>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrencyCompact(result.actualInterestExpense)}/yr
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Weighted avg rate: {formatPercent(result.actualWeightedRate * 100)} on {formatCurrencyCompact(result.totalDebtBalance)} debt
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">Normalised Interest Cost</div>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrencyCompact(result.normalisedInterestExpense)}/yr
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Benchmark rate: {formatPercent(result.benchmarkRate * 100)} (BoE base + SME margin)
            </div>
            {result.interestDelta > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <ArrowDownRight className="h-3 w-3" />
                {formatCurrencyCompact(result.interestDelta)}/yr savings opportunity from refinancing
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Normalised P&L ──────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Normalised P&L Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Line Item</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actual</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Normalised</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Delta</th>
              </tr>
            </thead>
            <tbody>
              <PLRow
                label="Revenue"
                actual={result.revenue}
                normalised={result.revenue}
              />
              <PLRow
                label="Cost of Sales"
                actual={-result.directCosts}
                normalised={-result.directCosts}
              />
              <PLRow
                label="Gross Profit"
                actual={result.revenue - result.directCosts}
                normalised={result.revenue - result.directCosts}
                isBold
              />
              <PLRow
                label="Overheads (ex. interest & D&A)"
                actual={-(result.overheads - result.interestAddback - result.depreciationAddback)}
                normalised={-(result.overheads - result.interestAddback - result.depreciationAddback)}
              />
              <PLRow
                label="EBITDA"
                actual={result.ebitda}
                normalised={result.ebitda}
                isBold
              />
              <PLRow
                label="Depreciation & Amortisation"
                actual={-result.depreciationAddback}
                normalised={-result.depreciationAddback}
              />
              <PLRow
                label={`Interest Expense (${formatPercent(result.actualWeightedRate * 100)} actual vs ${formatPercent(result.benchmarkRate * 100)} benchmark)`}
                actual={-result.actualInterestExpense}
                normalised={-result.normalisedInterestExpense}
                isHighlighted
              />
              <PLRow
                label="Net Profit"
                actual={result.actualNetProfit}
                normalised={result.normalisedNetProfit}
                isBold
              />
              <tr className="border-t">
                <td className="py-3 px-4 text-xs text-muted-foreground">Net Margin</td>
                <td className="text-right py-3 px-4 text-xs text-muted-foreground">
                  {result.revenue > 0 ? formatPercent((result.actualNetProfit / result.revenue) * 100) : '-'}
                </td>
                <td className="text-right py-3 px-4 text-xs text-muted-foreground">
                  {formatPercent(result.normalisedNetMargin)}
                </td>
                <td className="text-right py-3 px-4 text-xs text-muted-foreground">
                  {result.revenue > 0
                    ? formatPercent(result.normalisedNetMargin - (result.actualNetProfit / result.revenue) * 100)
                    : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Breakeven Gauge ─────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Breakeven Progress</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gauge */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="16"
                />
                {/* Progress arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke={gaugePercent >= 100 ? '#10b981' : gaugePercent >= 70 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${(gaugePercent / 100) * 534} 534`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{gaugePercent.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">of breakeven</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {formatCurrencyCompact(result.currentMonthlyRevenue)}/mo current
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrencyCompact(result.breakEvenRevenue)}/mo needed
              </p>
            </div>
          </div>

          {/* Breakeven stats */}
          <div className="space-y-4">
            <StatRow
              label="Monthly Revenue"
              value={formatCurrencyCompact(result.currentMonthlyRevenue)}
            />
            <StatRow
              label="Breakeven Revenue"
              value={`${formatCurrencyCompact(result.breakEvenRevenue)}/mo`}
            />
            <StatRow
              label="Revenue Gap"
              value={formatCurrencyCompact(result.revenueGapToBreakEven)}
              negative={result.revenueGapToBreakEven > 0}
            />
            <StatRow
              label="Monthly Fixed Costs"
              value={formatCurrencyCompact(result.monthlyFixedCosts)}
            />
            <StatRow
              label="Variable Cost Ratio"
              value={formatPercent(result.monthlyVariableCostRatio * 100)}
            />
            <StatRow
              label="Contribution Margin"
              value={formatPercent((1 - result.monthlyVariableCostRatio) * 100)}
            />
          </div>
        </div>
      </div>

      {/* ── 5 Action Levers ─────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">5 Levers to Breakeven</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {levers.map((lever) => (
            <LeverCard key={lever.id} lever={lever} />
          ))}
        </div>
      </div>

      {/* ── Sensitivity Matrix ──────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Sensitivity Analysis</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Months to breakeven under different revenue growth and cost reduction scenarios
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground border-b">
                  Revenue Growth {'\u2192'}
                  <br />
                  Cost Cut {'\u2193'}
                </th>
                {revenueGrowthLabels.map((label) => (
                  <th
                    key={label}
                    className="py-2 px-3 text-center font-medium text-muted-foreground border-b"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costReductionLabels.map((costLabel) => (
                <tr key={costLabel}>
                  <td className="py-2 px-3 font-medium text-muted-foreground border-r">
                    {costLabel}
                  </td>
                  {revenueGrowthLabels.map((revLabel) => {
                    const scenario = sensitivityMatrix.find(
                      (s) =>
                        s.revenueGrowthLabel === revLabel &&
                        s.costReductionLabel === costLabel,
                    );
                    const months = scenario?.monthsToBreakEven ?? null;
                    return (
                      <td
                        key={revLabel}
                        className={cn(
                          'py-2 px-3 text-center font-medium border-r last:border-r-0',
                          sensitivityCellColor(months),
                        )}
                      >
                        {months === null ? '60+' : months === 0 ? 'Now' : `${months}mo`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950/40 inline-block" />
            Now / {'<'}6mo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-950/20 inline-block" />
            6-12mo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-50 dark:bg-orange-950/20 inline-block" />
            12-24mo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/40 inline-block" />
            {'>'} 24mo / unreachable
          </span>
        </div>
      </div>

      {/* ── Top Overhead Categories ─────────────────────────────── */}
      {overheadBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Overhead Breakdown (Annual)</h2>
          <div className="space-y-2">
            {overheadBreakdown.slice(0, 10).map((cat, i) => {
              const pctOfTotal = result.overheads > 0 ? (cat.amount / result.overheads) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-48 truncate text-sm text-muted-foreground">
                    {cat.name}
                    {cat.isInterest && (
                      <span className="ml-1 text-[10px] text-amber-500 font-medium">INTEREST</span>
                    )}
                    {cat.isDepreciation && (
                      <span className="ml-1 text-[10px] text-blue-500 font-medium">D&A</span>
                    )}
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        cat.isInterest
                          ? 'bg-amber-500'
                          : cat.isDepreciation
                            ? 'bg-blue-500'
                            : 'bg-primary/60',
                      )}
                      style={{ width: `${Math.min(100, pctOfTotal)}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium">
                    {formatCurrencyCompact(cat.amount)}
                  </div>
                  <div className="w-12 text-right text-xs text-muted-foreground">
                    {formatPercent(pctOfTotal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function KPICard({
  label,
  value,
  detail,
  positive,
}: {
  label: string;
  value: string;
  detail: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          'text-2xl font-bold mt-1',
          positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{detail}</div>
    </div>
  );
}

function PLRow({
  label,
  actual,
  normalised,
  isBold = false,
  isHighlighted = false,
}: {
  label: string;
  actual: number;
  normalised: number;
  isBold?: boolean;
  isHighlighted?: boolean;
}) {
  const delta = normalised - actual;
  return (
    <tr
      className={cn(
        'border-b last:border-b-0',
        isHighlighted && 'bg-amber-50/50 dark:bg-amber-950/20',
        isBold && 'font-semibold',
      )}
    >
      <td className={cn('py-3 px-4 text-sm', isHighlighted && 'text-amber-700 dark:text-amber-400')}>
        {label}
      </td>
      <td className={cn('text-right py-3 px-4 text-sm', actual < 0 ? 'text-red-600 dark:text-red-400' : '')}>
        {formatCurrencyCompact(actual)}
      </td>
      <td className={cn('text-right py-3 px-4 text-sm', normalised < 0 ? 'text-red-600 dark:text-red-400' : '')}>
        {formatCurrencyCompact(normalised)}
      </td>
      <td
        className={cn(
          'text-right py-3 px-4 text-sm',
          delta > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : delta < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground',
        )}
      >
        {Math.abs(delta) > 0.5 ? (
          <span className="flex items-center justify-end gap-1">
            {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {formatCurrencyCompact(Math.abs(delta))}
          </span>
        ) : (
          '-'
        )}
      </td>
    </tr>
  );
}

function StatRow({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', negative && 'text-red-600 dark:text-red-400')}>
        {value}
      </span>
    </div>
  );
}

function LeverCard({ lever }: { lever: ActionLever }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        {leverIcons[lever.id] ?? <Target className="h-5 w-5 text-muted-foreground" />}
        <span className="text-sm font-semibold">{lever.title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{lever.description}</p>
      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
        {lever.impact}
      </p>
    </div>
  );
}
