'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CircleDot,
  Shield,
  Activity,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
  ReferenceArea,
  ZAxis,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, chartAxisFormatter } from '@/lib/formatting/currency';
import { NumberLegend } from '@/components/data-primitives';
import type { Anomaly } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface AnomaliesClientProps {
  anomalies: Anomaly[];
  totalAccountsScanned: number;
  allDataPoints: Array<{
    accountName: string;
    period: string;
    label: string;
    amount: number;
    isAnomaly: boolean;
  }>;
  monthlyAnomalyCounts: Array<{
    period: string;
    label: string;
    count: number;
  }>;
  scatterBand?: {
    median: number;
    upper: number;
    lower: number;
  };
}

/* ================================================================== */
/*  Filter types                                                       */
/* ================================================================== */

type FilterMode = 'all' | 'critical' | 'revenue' | 'expenses';

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */


/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function AnomaliesClient({
  anomalies,
  totalAccountsScanned,
  allDataPoints,
  monthlyAnomalyCounts,
  scatterBand,
}: AnomaliesClientProps) {
  const [filter, setFilter] = useState<FilterMode>('all');

  const criticalCount = useMemo(
    () => anomalies.filter((a) => a.severity === 'critical').length,
    [anomalies],
  );
  const warningCount = useMemo(
    () => anomalies.filter((a) => a.severity === 'warning').length,
    [anomalies],
  );

  // Filtered anomalies
  const filtered = useMemo(() => {
    switch (filter) {
      case 'critical':
        return anomalies.filter((a) => a.severity === 'critical');
      case 'revenue':
        // Revenue accounts typically have codes starting with 2xx or 4xx
        return anomalies.filter(
          (a) =>
            a.accountCode.startsWith('2') || a.accountCode.startsWith('4'),
        );
      case 'expenses':
        // Expense accounts typically have codes starting with 3xx, 4xx, 5xx, 6xx
        return anomalies.filter(
          (a) =>
            a.accountCode.startsWith('3') ||
            a.accountCode.startsWith('5') ||
            a.accountCode.startsWith('6'),
        );
      default:
        return anomalies;
    }
  }, [anomalies, filter]);

  // Scatter chart data — index each point for X axis
  const scatterData = useMemo(() => {
    return allDataPoints.map((dp, i) => ({
      x: i,
      y: dp.amount,
      isAnomaly: dp.isAnomaly,
      name: dp.accountName,
      label: dp.label,
    }));
  }, [allDataPoints]);

  const normalPoints = useMemo(
    () => scatterData.filter((d) => !d.isAnomaly),
    [scatterData],
  );
  const anomalyPoints = useMemo(
    () => scatterData.filter((d) => d.isAnomaly),
    [scatterData],
  );

  // Empty state
  if (totalAccountsScanned === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Anomaly Detection
          </h1>
          <p className="text-muted-foreground">
            MAD-based statistical flagging of unusual financial activity
          </p>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            No financial data available. Connect your Xero account and sync data
            to enable anomaly detection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Anomaly Detection
        </h1>
        <p className="text-muted-foreground">
          MAD-based statistical flagging — identifies values more than 3 standard
          deviations from the median using robust z-scores
        </p>
      </div>

      <NumberLegend />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={cn(
            'rounded-xl border p-5',
            criticalCount > 0
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
              : 'bg-card',
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                criticalCount > 0
                  ? 'text-red-500'
                  : 'text-muted-foreground/50',
              )}
            />
            Critical Anomalies
          </div>
          <p
            className={cn(
              'text-2xl font-bold',
              criticalCount > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-foreground',
            )}
          >
            {criticalCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Z-score above 5 — requires investigation
          </p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-5',
            warningCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-card',
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Shield
              className={cn(
                'h-4 w-4',
                warningCount > 0
                  ? 'text-amber-500'
                  : 'text-muted-foreground/50',
              )}
            />
            Warnings
          </div>
          <p
            className={cn(
              'text-2xl font-bold',
              warningCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-foreground',
            )}
          >
            {warningCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Z-score 3-5 or zero-value anomalies
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Activity className="h-4 w-4" />
            Accounts Scanned
          </div>
          <p className="text-2xl font-bold">{totalAccountsScanned}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Across all account classes (last 12 months)
          </p>
        </div>
      </div>

      {/* Filter toggles */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'critical', label: 'Critical Only' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'expenses', label: 'Expenses' },
          ] as Array<{ key: FilterMode; label: string }>
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              filter === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground hover:bg-muted border-border',
            )}
          >
            {label}
            {key === 'critical' && criticalCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {criticalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Anomaly cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {filter === 'all'
              ? 'No anomalies detected — all values within expected ranges.'
              : 'No anomalies match this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.slice(0, 30).map((anomaly, i) => {
            const mad =
              anomaly.zScore !== 0 && anomaly.direction !== 'zero'
                ? Math.abs(
                    (0.6745 * (anomaly.amount - anomaly.median)) /
                      anomaly.zScore,
                  )
                : 0;
            const rangeUpper = anomaly.median + (3 * mad) / 0.6745;
            const rangeLower = anomaly.median - (3 * mad) / 0.6745;

            return (
              <div
                key={`${anomaly.accountId}-${anomaly.period}-${i}`}
                className={cn(
                  'rounded-xl border p-5 space-y-3',
                  anomaly.severity === 'critical'
                    ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                    : anomaly.severity === 'warning'
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'bg-card',
                )}
              >
                {/* Account name & code */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm leading-tight">
                      {anomaly.accountName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {anomaly.accountCode}
                    </p>
                  </div>
                  {/* Z-score badge */}
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
                      anomaly.severity === 'critical'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                    )}
                  >
                    {anomaly.direction === 'zero'
                      ? 'ZERO'
                      : `z=${Math.abs(anomaly.zScore).toFixed(1)}`}
                  </span>
                </div>

                {/* Period */}
                <p className="text-xs text-muted-foreground">{anomaly.label}</p>

                {/* Direction indicator */}
                <div className="flex items-center gap-2 text-sm">
                  {anomaly.direction === 'high' && (
                    <>
                      <TrendingUp className="h-4 w-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Spike up
                      </span>
                    </>
                  )}
                  {anomaly.direction === 'low' && (
                    <>
                      <TrendingDown className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        Drop down
                      </span>
                    </>
                  )}
                  {anomaly.direction === 'zero' && (
                    <>
                      <CircleDot className="h-4 w-4 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Zero / Missing
                      </span>
                    </>
                  )}
                </div>

                {/* Actual vs expected range */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual</span>
                    <span className="font-semibold">
                      {formatCurrency(anomaly.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Median</span>
                    <span>{formatCurrency(anomaly.median)}</span>
                  </div>
                  {anomaly.direction !== 'zero' && mad > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Expected range
                      </span>
                      <span className="text-xs">
                        {formatCurrencyCompact(rangeLower)} — {formatCurrencyCompact(rangeUpper)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scatter Plot: all values, anomalies highlighted */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">
            Value Distribution
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            All account values as dots — anomalies highlighted in red, band shows
            +/- 3 SD
          </p>
          <div className="h-[350px]">
            {allDataPoints.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 10, right: 10, bottom: 10, top: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    strokeOpacity={0.1}
                  />
                  <XAxis
                    dataKey="x"
                    type="number"
                    tick={false}
                    label={{
                      value: 'Data points (account-periods)',
                      position: 'insideBottom',
                      offset: -5,
                      style: { fill: '#6b7280', fontSize: 10 },
                    }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    tickFormatter={chartAxisFormatter()}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <ZAxis range={[20, 20]} />
                  {scatterBand && (
                    <ReferenceArea
                      y1={scatterBand.lower}
                      y2={scatterBand.upper}
                      fill="#10b981"
                      fillOpacity={0.08}
                      stroke="#10b981"
                      strokeOpacity={0.2}
                      strokeDasharray="3 3"
                    />
                  )}
                  {scatterBand && (
                    <ReferenceLine
                      y={scatterBand.median}
                      stroke="#6b7280"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  )}
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const d = payload[0]?.payload as {
                        name: string;
                        label: string;
                        y: number;
                        isAnomaly: boolean;
                      };
                      if (!d) return null;
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-muted-foreground">{d.label}</p>
                          <p className="font-medium mt-1">
                            {formatCurrency(d.y)}
                          </p>
                          {d.isAnomaly && (
                            <p className="text-red-500 font-medium text-xs mt-1">
                              Anomaly
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Scatter data={normalPoints} fill="#6b7280" fillOpacity={0.3}>
                    {normalPoints.map((_, i) => (
                      <Cell
                        key={i}
                        fill="#6b7280"
                        fillOpacity={0.3}
                      />
                    ))}
                  </Scatter>
                  <Scatter data={anomalyPoints} fill="#ef4444">
                    {anomalyPoints.map((_, i) => (
                      <Cell key={i} fill="#ef4444" fillOpacity={0.8} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No data points available
              </div>
            )}
          </div>
        </div>

        {/* Timeline: anomaly count per month */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">
            Anomaly Timeline
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Number of anomalies detected per month
          </p>
          <div className="h-[350px]">
            {monthlyAnomalyCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyAnomalyCounts}
                  margin={{ left: 10, right: 10, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    strokeOpacity={0.1}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <RechartsTooltip
                    formatter={(value) => [
                      `${Number(value ?? 0)} anomalies`,
                      'Count',
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {monthlyAnomalyCounts.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.count > 3
                            ? '#ef4444'
                            : entry.count > 0
                              ? '#f59e0b'
                              : '#10b981'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No timeline data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
