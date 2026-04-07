'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
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
} from 'recharts';
import { formatCurrency } from '@/lib/formatting/currency';
import type { RevenueAccount, RevenuePeriodSummary } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface RevenueClientProps {
  periodSummaries: RevenuePeriodSummary[];
  categoryTotals: Record<string, number>;
  topAccounts: RevenueAccount[];
  totalRevenue: number;
  topCategoryName: string;
  topCategoryPct: number;
  momGrowth: number;
  yoyGrowth: number | null;
  lastPeriodTotal: number;
  periods: string[];
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
];

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

export function RevenueClient({
  periodSummaries,
  categoryTotals,
  topAccounts,
  totalRevenue,
  topCategoryName,
  topCategoryPct,
  momGrowth,
  yoyGrowth,
  lastPeriodTotal,
}: RevenueClientProps) {
  const [showAccounts, setShowAccounts] = useState(false);

  // Pie chart data
  const pieData = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [categoryTotals]);

  // Revenue trend bar chart
  const trendData = useMemo(() => {
    return periodSummaries.map((p) => ({
      label: p.label,
      total: Math.round(p.total),
    }));
  }, [periodSummaries]);

  // Growth rate line chart
  const growthData = useMemo(() => {
    return periodSummaries.map((p, i) => {
      const prev = i > 0 ? periodSummaries[i - 1].total : 0;
      const growth = prev > 0 ? ((p.total - prev) / prev) * 100 : 0;
      return { label: p.label, growth: Math.round(growth * 10) / 10 };
    }).slice(1);
  }, [periodSummaries]);

  // Stacked bar by category (top 5 categories + other)
  const stackedData = useMemo(() => {
    const topCats = Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name]) => name);

    return periodSummaries.map((p) => {
      const row: Record<string, number | string> = { label: p.label };
      let otherTotal = 0;
      for (const [cat, amount] of Object.entries(p.byCategory)) {
        if (topCats.includes(cat)) {
          row[cat] = Math.round(amount);
        } else {
          otherTotal += amount;
        }
      }
      if (otherTotal > 0) row['Other'] = Math.round(otherTotal);
      return row;
    });
  }, [periodSummaries, categoryTotals]);

  const stackedCategories = useMemo(() => {
    const cats = Object.entries(categoryTotals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name]) => name);
    const hasOther = Object.keys(categoryTotals).length > 6;
    if (hasOther) cats.push('Other');
    return cats;
  }, [categoryTotals]);

  // Concentration risk
  const concentrationRisk = topCategoryPct > 50 ? 'high' : topCategoryPct > 30 ? 'medium' : 'low';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue Breakdown</h1>
        <p className="text-muted-foreground">
          Revenue streams, mix analysis, and growth trends
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" />
            Total Revenue (12mo)
          </div>
          <p className="text-2xl font-bold">{fmtCompact(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {Object.keys(categoryTotals).filter((k) => categoryTotals[k] > 0).length} revenue streams
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            {momGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            Latest Month
          </div>
          <p className="text-2xl font-bold">{fmtCompact(lastPeriodTotal)}</p>
          <p className={cn('text-xs mt-1 font-medium', momGrowth >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {momGrowth >= 0 ? '+' : ''}{momGrowth.toFixed(1)}% MoM
            {yoyGrowth !== null && (
              <span className="text-muted-foreground font-normal">
                {' · '}{yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}% YoY
              </span>
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <PieChartIcon className="h-4 w-4" />
            Top Stream
          </div>
          <p className="text-2xl font-bold">{topCategoryPct.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {topCategoryName}
          </p>
        </div>

        <div className={cn(
          'rounded-xl border p-5',
          concentrationRisk === 'high' ? 'bg-red-50 border-red-200'
            : concentrationRisk === 'medium' ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            {concentrationRisk === 'high' ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            Concentration Risk
          </div>
          <p className={cn(
            'text-2xl font-bold capitalize',
            concentrationRisk === 'high' ? 'text-red-600'
              : concentrationRisk === 'medium' ? 'text-amber-600'
                : 'text-emerald-600'
          )}>
            {concentrationRisk}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {concentrationRisk === 'high'
              ? 'Top stream exceeds 50% — diversify'
              : concentrationRisk === 'medium'
                ? 'Top stream 30-50% — monitor'
                : 'Well diversified revenue'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category (Pie) */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Mix</h2>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${(name ?? '').length > 18 ? (name ?? '').substring(0, 18) + '…' : (name ?? '')} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend (Bar) */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h2>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue by Category (Stacked Bar) */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Revenue Mix Over Time</h2>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData} margin={{ left: 10, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <RechartsTooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0))]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              {stackedCategories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="rev" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth Rate */}
      {growthData.length > 2 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Month-over-Month Growth Rate</h2>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ left: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <RechartsTooltip
                  formatter={(value) => [`${Number(value ?? 0)}%`, 'Growth']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="growth"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Accounts Table */}
      <div className="rounded-xl border bg-card p-6">
        <button
          onClick={() => setShowAccounts(!showAccounts)}
          className="flex items-center gap-2 text-lg font-semibold w-full text-left"
        >
          {showAccounts ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          Top Revenue Accounts
        </button>

        {showAccounts && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Account</th>
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">% of Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topAccounts.map((acct) => (
                  <tr key={acct.accountId} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <p className="font-medium">{acct.accountName}</p>
                      <p className="text-xs text-muted-foreground">{acct.accountCode}</p>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{acct.category}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(acct.total)}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {totalRevenue > 0 ? ((acct.total / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
