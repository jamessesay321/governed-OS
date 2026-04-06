'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatKPIValue } from '@/lib/kpi/format';
import type { CalculatedKPI } from '@/lib/kpi/format';
import { AIReasoning } from '@/components/ui/ai-reasoning';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import type { KPISnapshot } from '@/types';

interface KPIDetailProps {
  kpi: CalculatedKPI;
  history: KPISnapshot[];
  period?: string;
  onClose?: () => void;
}

export function KPIDetail({ kpi, history, period, onClose }: KPIDetailProps) {
  const { openDrill } = useDrillDown();
  const chartData = history.map((snap) => ({
    period: snap.period.slice(0, 7), // YYYY-MM
    value: snap.value,
  }));

  const statusColor =
    kpi.benchmark_status === 'green'
      ? '#16a34a'
      : kpi.benchmark_status === 'red'
      ? '#dc2626'
      : '#2563eb';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{kpi.label}</CardTitle>
            <CardDescription>{kpi.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {kpi.benchmark_status !== 'none' && (
              <Badge
                variant="outline"
                className={
                  kpi.benchmark_status === 'green'
                    ? 'border-green-500 text-green-700'
                    : kpi.benchmark_status === 'amber'
                    ? 'border-yellow-500 text-yellow-700'
                    : 'border-red-500 text-red-700'
                }
              >
                vs benchmark: {kpi.benchmark_status}
              </Badge>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current value + trend */}
        <div className="flex items-baseline gap-4">
          <button
            type="button"
            className="text-4xl font-bold hover:underline hover:text-primary cursor-pointer transition-colors"
            title="Drill into this KPI"
            onClick={() =>
              openDrill({
                type: 'kpi',
                kpiKey: kpi.key,
                label: kpi.label,
                value: kpi.value ?? 0,
                formattedValue: kpi.formatted_value,
                period: period ?? '',
              })
            }
          >
            {kpi.formatted_value}
          </button>
          <span
            className={`text-sm font-medium ${
              kpi.trend_direction === 'up'
                ? 'text-green-600'
                : kpi.trend_direction === 'down'
                ? 'text-red-600'
                : 'text-muted-foreground'
            }`}
          >
            {kpi.trend_direction === 'up' ? '\u2191' : kpi.trend_direction === 'down' ? '\u2193' : '\u2192'}{' '}
            {Math.abs(kpi.trend_percentage).toFixed(1)}% vs prior period
          </span>
        </div>

        {/* Historical chart */}
        {chartData.length >= 2 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`kpi-gradient-${kpi.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={statusColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => formatKPIValue(v, kpi.format)}
                  width={80}
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    formatKPIValue(Number(value ?? 0), kpi.format),
                    kpi.label,
                  ]}
                />
                {kpi.benchmark_value !== null && (
                  <ReferenceLine
                    y={kpi.benchmark_value}
                    stroke="#9ca3af"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Benchmark',
                      position: 'right',
                      fill: '#9ca3af',
                      fontSize: 11,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={statusColor}
                  fill={`url(#kpi-gradient-${kpi.key})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length < 2 && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Not enough historical data for a chart yet.
          </div>
        )}

        {/* Benchmark info */}
        {kpi.benchmark_value !== null && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-medium">Sector benchmark (median):</span>{' '}
            {formatKPIValue(kpi.benchmark_value, kpi.format)}
            <span className="ml-2 text-muted-foreground">
              &middot; {kpi.higher_is_better ? 'Higher is better' : 'Lower is better'}
            </span>
          </div>
        )}

        {/* AI Reasoning */}
        <AIReasoning
          reasoning={`${kpi.label} is currently ${kpi.formatted_value}, ${
            kpi.trend_direction === 'up' ? 'up' : kpi.trend_direction === 'down' ? 'down' : 'flat'
          } ${Math.abs(kpi.trend_percentage).toFixed(1)}% vs prior period.${
            kpi.benchmark_value !== null
              ? ` Compared to the sector benchmark of ${formatKPIValue(kpi.benchmark_value, kpi.format)}, your performance is ${kpi.benchmark_status}.`
              : ''
          } ${kpi.higher_is_better ? 'For this metric, higher values indicate stronger performance.' : 'For this metric, lower values indicate stronger performance.'}`}
          dataSources={[
            'Xero financial data (current period)',
            'Historical KPI snapshots',
            ...(kpi.benchmark_value !== null ? ['Industry benchmark dataset'] : []),
          ]}
          confidence={kpi.benchmark_status === 'green' ? 'high' : kpi.benchmark_status === 'red' ? 'low' : 'medium'}
          triggerLabel="Why this KPI result?"
        />
      </CardContent>
    </Card>
  );
}
