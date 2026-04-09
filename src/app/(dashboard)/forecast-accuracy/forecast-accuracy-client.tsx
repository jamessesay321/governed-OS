'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  BarChart3,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
  BarChart,
  LineChart,
} from 'recharts';
import { formatCurrency, formatPercent, chartAxisFormatter } from '@/lib/formatting/currency';
import type { MonthComparison, AccuracyMetrics } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface ForecastAccuracyClientProps {
  comparisons: MonthComparison[];
  metrics: AccuracyMetrics;
}

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */

const fmtAxis = chartAxisFormatter();

function accuracyColor(accuracy: number): string {
  if (accuracy >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (accuracy >= 75) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function accuracyBg(accuracy: number): string {
  if (accuracy >= 90) return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
  if (accuracy >= 75) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
  return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
}

function accuracyRingColor(accuracy: number): string {
  if (accuracy >= 90) return '#10b981';
  if (accuracy >= 75) return '#f59e0b';
  return '#ef4444';
}

/* ================================================================== */
/*  Accuracy Gauge (SVG ring)                                          */
/* ================================================================== */

function AccuracyGauge({ value, size = 160 }: { value: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (progress / 100) * circumference;
  const color = accuracyRingColor(value);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold', accuracyColor(value))}>
          {formatPercent(value)}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">Overall</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Client Component                                                   */
/* ================================================================== */

export function ForecastAccuracyClient({
  comparisons,
  metrics,
}: ForecastAccuracyClientProps) {
  // Chart data: Revenue actual vs forecast
  const revenueChartData = useMemo(
    () =>
      comparisons.map((c) => ({
        label: c.label,
        actual: Math.round(c.actualRevenue),
        forecast: Math.round(c.forecastRevenue),
      })),
    [comparisons],
  );

  // Chart data: Cost actual vs forecast
  const costChartData = useMemo(
    () =>
      comparisons.map((c) => ({
        label: c.label,
        actual: Math.round(c.actualCosts),
        forecast: Math.round(c.forecastCosts),
      })),
    [comparisons],
  );

  // Variance waterfall data
  const varianceData = useMemo(
    () =>
      comparisons.map((c) => ({
        label: c.label,
        revenueVariance: Math.round(c.revenueVariance),
        costVariance: Math.round(-c.costVariance), // Negative cost variance is favourable
      })),
    [comparisons],
  );

  // MAPE trend data
  const mapeTrendData = useMemo(
    () =>
      comparisons.map((c) => ({
        label: c.label,
        revenueMAPE: Number(c.revenueMAPE.toFixed(1)),
        costMAPE: Number(c.costMAPE.toFixed(1)),
        combinedMAPE: Number(((c.revenueMAPE + c.costMAPE) / 2).toFixed(1)),
      })),
    [comparisons],
  );

  const hasData = comparisons.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast Accuracy</h1>
          <p className="text-muted-foreground">
            Track how well forecasts predict actual financial outcomes
          </p>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Insufficient Data</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Forecast accuracy requires at least 4 months of financial data to compute
            3-month trailing averages. Continue syncing your accounting data and check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forecast Accuracy</h1>
        <p className="text-muted-foreground">
          Track how well forecasts predict actual financial outcomes over the last{' '}
          {comparisons.length} months
        </p>
      </div>

      {/* ── Accuracy Score + Summary Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Overall Accuracy Gauge */}
        <div
          className={cn(
            'rounded-xl border p-6 flex flex-col items-center justify-center lg:col-span-1',
            accuracyBg(metrics.overallAccuracy),
          )}
        >
          <AccuracyGauge value={metrics.overallAccuracy} />
          <p className="text-sm font-medium mt-3">Forecast Accuracy</p>
          <p className="text-xs text-muted-foreground">Weighted: 60% revenue, 40% cost</p>
        </div>

        {/* Summary Cards */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Accuracy */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Revenue Accuracy
            </div>
            <p className={cn('text-2xl font-bold', accuracyColor(metrics.revenueAccuracy))}>
              {formatPercent(metrics.revenueAccuracy)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MAPE: {formatPercent(metrics.revenueMAPE)}
            </p>
          </div>

          {/* Cost Accuracy */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <TrendingDown className="h-4 w-4 text-blue-500" />
              Cost Accuracy
            </div>
            <p className={cn('text-2xl font-bold', accuracyColor(metrics.costAccuracy))}>
              {formatPercent(metrics.costAccuracy)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MAPE: {formatPercent(metrics.costMAPE)}
            </p>
          </div>

          {/* Best Month */}
          <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Award className="h-4 w-4 text-emerald-500" />
              Best Predicted Month
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.bestMonth?.label ?? 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.bestMonth ? `${formatPercent(metrics.bestMonth.accuracy)} accuracy` : 'No data'}
            </p>
          </div>

          {/* Worst Month */}
          <div className="rounded-xl border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Worst Predicted Month
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {metrics.worstMonth?.label ?? 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.worstMonth ? `${formatPercent(metrics.worstMonth.accuracy)} accuracy` : 'No data'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Revenue: Actual vs Forecast Chart ── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1">Revenue: Actual vs Forecast</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Bars show actual revenue; line shows 3-month trailing average forecast
        </p>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={revenueChartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                width={80}
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  (name ?? '') === 'actual' ? 'Actual Revenue' : 'Forecast Revenue',
                ]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--popover)',
                  color: 'var(--popover-foreground)',
                }}
              />
              <Legend
                formatter={(value) =>
                  (value ?? '') === 'actual' ? 'Actual Revenue' : 'Forecast Revenue'
                }
              />
              <Bar
                dataKey="actual"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={24}
                name="actual"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1' }}
                name="forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Costs: Actual vs Forecast Chart ── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1">Costs: Actual vs Forecast</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Bars show actual costs; line shows 3-month trailing average forecast
        </p>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={costChartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                width={80}
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  (name ?? '') === 'actual' ? 'Actual Costs' : 'Forecast Costs',
                ]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--popover)',
                  color: 'var(--popover-foreground)',
                }}
              />
              <Legend
                formatter={(value) =>
                  (value ?? '') === 'actual' ? 'Actual Costs' : 'Forecast Costs'
                }
              />
              <Bar
                dataKey="actual"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
                barSize={24}
                name="actual"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#8b5cf6' }}
                name="forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Variance Waterfall ── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1">Forecast Variance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Monthly difference between actual and forecast. Positive = actual exceeded forecast.
        </p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={varianceData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                width={80}
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  (name ?? '') === 'revenueVariance' ? 'Revenue Variance' : 'Cost Savings',
                ]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--popover)',
                  color: 'var(--popover-foreground)',
                }}
              />
              <Legend
                formatter={(value) =>
                  (value ?? '') === 'revenueVariance' ? 'Revenue Variance' : 'Cost Savings'
                }
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
              <Bar dataKey="revenueVariance" name="revenueVariance" barSize={16}>
                {varianceData.map((entry, index) => (
                  <Cell
                    key={`rev-${index}`}
                    fill={entry.revenueVariance >= 0 ? '#10b981' : '#ef4444'}
                    radius={4}
                  />
                ))}
              </Bar>
              <Bar dataKey="costVariance" name="costVariance" barSize={16}>
                {varianceData.map((entry, index) => (
                  <Cell
                    key={`cost-${index}`}
                    fill={entry.costVariance >= 0 ? '#3b82f6' : '#f97316'}
                    radius={4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Accuracy Trend (MAPE over time) ── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1">Accuracy Trend</h2>
        <p className="text-sm text-muted-foreground mb-4">
          MAPE (Mean Absolute Percentage Error) per month. Lower is better.
        </p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mapeTrendData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v: number) => formatPercent(v)}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                width={50}
              />
              <RechartsTooltip
                formatter={(value, name) => {
                  const label =
                    (name ?? '') === 'revenueMAPE'
                      ? 'Revenue MAPE'
                      : (name ?? '') === 'costMAPE'
                        ? 'Cost MAPE'
                        : 'Combined MAPE';
                  return [formatPercent(Number(value ?? 0)), label];
                }}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--popover)',
                  color: 'var(--popover-foreground)',
                }}
              />
              <Legend
                formatter={(value) =>
                  (value ?? '') === 'revenueMAPE'
                    ? 'Revenue MAPE'
                    : (value ?? '') === 'costMAPE'
                      ? 'Cost MAPE'
                      : 'Combined MAPE'
                }
              />
              <ReferenceLine y={10} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Excellent (<10%)', position: 'right', style: { fontSize: 10 } }} />
              <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Acceptable (<25%)', position: 'right', style: { fontSize: 10 } }} />
              <Line
                type="monotone"
                dataKey="revenueMAPE"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
                name="revenueMAPE"
              />
              <Line
                type="monotone"
                dataKey="costMAPE"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f97316' }}
                name="costMAPE"
              />
              <Line
                type="monotone"
                dataKey="combinedMAPE"
                stroke="#6366f1"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#6366f1' }}
                name="combinedMAPE"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Detailed Table ── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1">Monthly Detail</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Per-month breakdown of actual vs forecast with variance and accuracy
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground sticky left-0 bg-card">
                  Period
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Actual Revenue
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Forecast Revenue
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Rev Variance
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Actual Costs
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Forecast Costs
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Cost Variance
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Rev MAPE
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Cost MAPE
                </th>
                <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                  Accuracy
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => {
                const combinedMAPE = (c.revenueMAPE + c.costMAPE) / 2;
                const accuracy = Math.max(0, 100 - combinedMAPE);
                return (
                  <tr key={c.period} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium sticky left-0 bg-card">
                      {c.label}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatCurrency(c.actualRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {formatCurrency(c.forecastRevenue)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 px-3 text-right font-medium',
                        c.revenueVariance >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {c.revenueVariance >= 0 ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {formatCurrency(Math.abs(c.revenueVariance))}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatCurrency(c.actualCosts)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {formatCurrency(c.forecastCosts)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 px-3 text-right font-medium',
                        c.costVariance <= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {c.costVariance <= 0 ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronUp className="h-3 w-3" />
                        )}
                        {formatCurrency(Math.abs(c.costVariance))}
                      </span>
                    </td>
                    <td className={cn('py-2.5 px-3 text-right', accuracyColor(100 - c.revenueMAPE))}>
                      {formatPercent(c.revenueMAPE)}
                    </td>
                    <td className={cn('py-2.5 px-3 text-right', accuracyColor(100 - c.costMAPE))}>
                      {formatPercent(c.costMAPE)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                          accuracy >= 90
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : accuracy >= 75
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300',
                        )}
                      >
                        {formatPercent(accuracy)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
