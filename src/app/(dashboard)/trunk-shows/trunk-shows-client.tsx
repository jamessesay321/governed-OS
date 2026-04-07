'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Plane,
  CalendarDays,
  TrendingUp,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from 'recharts';
import { formatCurrency } from '@/lib/formatting/currency';
import type {
  TrunkShowPeriodSummary,
  TrunkShowCategorySummary,
} from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface TrunkShowsClientProps {
  periodSummaries: TrunkShowPeriodSummary[];
  categorySummaries: TrunkShowCategorySummary[];
  categoryTotals: Record<string, number>;
  totalTrunkShowSpend: number;
  averagePerEvent: number;
  largestMonthLabel: string;
  largestMonthTotal: number;
  spendAsPctOfRevenue: number;
  totalRevenue: number;
  roiData: Array<{
    label: string;
    trunkShowSpend: number;
    revenue: number;
    hasTrunkShow: boolean;
  }>;
  periods: string[];
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const CATEGORY_COLORS: Record<string, string> = {
  'Travel': '#7c3aed',
  'Food & Drink': '#f59e0b',
  'Purchases': '#06b6d4',
  'Freelance Workers': '#10b981',
  'Shipping': '#ef4444',
};

const PIE_COLORS = ['#7c3aed', '#f59e0b', '#06b6d4', '#10b981', '#ef4444'];

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */

function fmtCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `£${(amount / 1_000).toFixed(0)}k`;
  return formatCurrency(amount);
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `£${(value / 1_000).toFixed(0)}k`;
  return `£${value}`;
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function TrunkShowsClient({
  periodSummaries,
  categorySummaries,
  categoryTotals,
  totalTrunkShowSpend,
  averagePerEvent,
  largestMonthLabel,
  largestMonthTotal,
  spendAsPctOfRevenue,
  totalRevenue,
  roiData,
}: TrunkShowsClientProps) {
  const hasData = periodSummaries.length > 0 && totalTrunkShowSpend > 0;

  // Monthly spend bar data
  const monthlySpendData = useMemo(() => {
    return periodSummaries.map((p) => ({
      label: p.label,
      total: Math.round(p.total),
    }));
  }, [periodSummaries]);

  // Cost breakdown pie data
  const pieData = useMemo(() => {
    return categorySummaries
      .filter((c) => c.total > 0)
      .map((c) => ({ name: c.name, value: Math.round(c.total) }));
  }, [categorySummaries]);

  // Trend line data
  const trendData = useMemo(() => {
    let cumulative = 0;
    return periodSummaries.map((p) => {
      cumulative += p.total;
      return {
        label: p.label,
        monthly: Math.round(p.total),
        cumulative: Math.round(cumulative),
      };
    });
  }, [periodSummaries]);

  // ROI hint: trunk show spend vs revenue
  const roiChartData = useMemo(() => {
    return roiData.map((d) => ({
      ...d,
      trunkShowSpend: d.trunkShowSpend,
      revenue: d.revenue,
    }));
  }, [roiData]);

  // Stacked bar by category over time
  const stackedData = useMemo(() => {
    const catNames = Object.keys(categoryTotals).filter((c) => categoryTotals[c] > 0);
    return periodSummaries.map((p) => {
      const row: Record<string, number | string> = { label: p.label };
      for (const cat of catNames) {
        row[cat] = Math.round(p.byCategory[cat] ?? 0);
      }
      return row;
    });
  }, [periodSummaries, categoryTotals]);

  const stackedCategoryNames = useMemo(() => {
    return Object.keys(categoryTotals).filter((c) => categoryTotals[c] > 0);
  }, [categoryTotals]);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trunk Show Analysis</h1>
          <p className="text-muted-foreground">
            Expenses, ROI indicators, and cost breakdown for trunk show events
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-semibold">No Trunk Show Data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No trunk show expenses found. These appear once trunk show accounts (570-574) have transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trunk Show Analysis</h1>
        <p className="text-muted-foreground">
          Expenses, ROI indicators, and cost breakdown for trunk show events
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trunk Show Spend */}
        <div className={cn(
          'rounded-xl border p-5',
          'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Plane className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Total Trunk Show Spend
          </div>
          <p className="text-2xl font-bold">{fmtCompact(totalTrunkShowSpend)}</p>
          <p className="text-xs mt-1 text-muted-foreground">
            Across {periodSummaries.filter((p) => p.total > 0).length} active months
          </p>
        </div>

        {/* Average Per Event Month */}
        <div className={cn(
          'rounded-xl border p-5',
          'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Average Per Event Month
          </div>
          <p className="text-2xl font-bold">{fmtCompact(averagePerEvent)}</p>
          <p className="text-xs mt-1 text-muted-foreground">
            Based on months with activity
          </p>
        </div>

        {/* Largest Month */}
        <div className={cn(
          'rounded-xl border p-5',
          'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Largest Month
          </div>
          <p className="text-2xl font-bold">{fmtCompact(largestMonthTotal)}</p>
          <p className="text-xs mt-1 text-muted-foreground">
            {largestMonthLabel}
          </p>
        </div>

        {/* Spend as % of Revenue */}
        <div className={cn(
          'rounded-xl border p-5',
          spendAsPctOfRevenue > 5
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : spendAsPctOfRevenue > 2
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            % of Revenue
          </div>
          <p className={cn(
            'text-2xl font-bold',
            spendAsPctOfRevenue > 5
              ? 'text-red-600 dark:text-red-400'
              : spendAsPctOfRevenue > 2
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400',
          )}>
            {spendAsPctOfRevenue.toFixed(1)}%
          </p>
          <p className="text-xs mt-1 text-muted-foreground">
            of {fmtCompact(totalRevenue)} total revenue
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trunk Show Spend (Bar) */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Trunk Show Spend</h2>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySpendData} margin={{ left: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickFormatter={fmtAxis}
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                />
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Spend']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Breakdown Pie */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Cost Breakdown</h2>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${(name ?? '')} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={CATEGORY_COLORS[entry.name] ?? PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Cost']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend Line: Spend Over Time */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Trunk Show Spend Trend</h2>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                className="fill-gray-500 dark:fill-gray-400"
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fontSize: 10 }}
                className="fill-gray-500 dark:fill-gray-400"
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  name === 'cumulative' ? 'Cumulative' : 'Monthly',
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="monthly"
                name="Monthly Spend"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ fill: '#7c3aed', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Cumulative Spend"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROI Hint: Trunk Show Months vs Revenue */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">ROI Indicator: Spend vs Revenue by Month</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Months with trunk show activity are highlighted. Compare spend investment against revenue performance.
        </p>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={roiChartData} margin={{ left: 10, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                className="fill-gray-500 dark:fill-gray-400"
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                yAxisId="revenue"
                tickFormatter={fmtAxis}
                tick={{ fontSize: 10 }}
                className="fill-gray-500 dark:fill-gray-400"
                orientation="left"
              />
              <YAxis
                yAxisId="spend"
                tickFormatter={fmtAxis}
                tick={{ fontSize: 10 }}
                className="fill-gray-500 dark:fill-gray-400"
                orientation="right"
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  name === 'revenue' ? 'Revenue' : 'Trunk Show Spend',
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Bar
                yAxisId="spend"
                dataKey="trunkShowSpend"
                name="Trunk Show Spend"
                fill="#7c3aed"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Detail Table */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Expense Category Detail</h2>
        <div className="space-y-3">
          {categorySummaries.map((cat, i) => (
            <div key={cat.name} className="flex items-center gap-4">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[cat.name] ?? PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <div className="w-40 text-sm font-medium">{cat.name}</div>
              <div className="flex-1">
                <div className="h-5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(cat.pct, 100)}%`,
                      backgroundColor: CATEGORY_COLORS[cat.name] ?? PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                </div>
              </div>
              <div className="w-16 text-right text-sm font-medium">
                {cat.pct.toFixed(1)}%
              </div>
              <div className="w-24 text-right text-sm text-muted-foreground">
                {fmtCompact(cat.total)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
