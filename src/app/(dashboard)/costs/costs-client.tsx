'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Layers,
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
  AreaChart,
  Area,
} from 'recharts';
import { formatCurrency } from '@/lib/formatting/currency';
import type { CostAccount, CostPeriodSummary } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface CostsClientProps {
  periodSummaries: CostPeriodSummary[];
  categoryTotals: Record<string, number>;
  groupTotals: Record<string, number>;
  groupPeriodData: Record<string, number | string>[];
  topAccounts: CostAccount[];
  totalCosts: number;
  totalDirectCosts: number;
  totalOverheads: number;
  totalRevenue: number;
  interestTotal: number;
  costToRevenueRatio: number;
  momGrowth: number;
  lastPeriodTotal: number;
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

export function CostsClient({
  periodSummaries,
  categoryTotals,
  groupTotals,
  groupPeriodData,
  topAccounts,
  totalCosts,
  totalDirectCosts,
  totalOverheads,
  totalRevenue,
  interestTotal,
  costToRevenueRatio,
  momGrowth,
  lastPeriodTotal,
}: CostsClientProps) {
  const [showAccounts, setShowAccounts] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'interest'>('overview');

  // Pie chart data (group-level)
  const pieData = useMemo(() => {
    return Object.entries(groupTotals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [groupTotals]);

  // Cost trend (direct vs overhead)
  const trendData = useMemo(() => {
    return periodSummaries.map((p) => ({
      label: p.label,
      directCosts: Math.round(p.directCosts),
      overheads: Math.round(p.overheads),
      total: Math.round(p.total),
    }));
  }, [periodSummaries]);

  // Cost growth rate
  const growthData = useMemo(() => {
    return periodSummaries.map((p, i) => {
      const prev = i > 0 ? periodSummaries[i - 1].total : 0;
      const growth = prev > 0 ? ((p.total - prev) / prev) * 100 : 0;
      return { label: p.label, growth: Math.round(growth * 10) / 10 };
    }).slice(1);
  }, [periodSummaries]);

  // Cost-to-revenue trend
  const ratioData = useMemo(() => {
    // We don't have per-period revenue, but we can show cost as % of avg revenue
    const avgMonthlyRevenue = totalRevenue / Math.max(periodSummaries.length, 1);
    return periodSummaries.map((p) => ({
      label: p.label,
      ratio: avgMonthlyRevenue > 0 ? Math.round((p.total / avgMonthlyRevenue) * 1000) / 10 : 0,
    }));
  }, [periodSummaries, totalRevenue]);

  // Interest categories
  const interestData = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([cat]) => cat.startsWith('Interest'))
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name: name.replace('Interest – ', ''),
        value: Math.round(value),
      }));
  }, [categoryTotals]);

  // Stacked categories for group chart
  const groupNames = useMemo(() => {
    return Object.entries(groupTotals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);
  }, [groupTotals]);

  // Gross margin
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalDirectCosts) / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cost Analysis</h1>
        <p className="text-muted-foreground">
          Direct costs, overheads, interest expense, and cost efficiency metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            Total Costs (12mo)
          </div>
          <p className="text-2xl font-bold">{fmtCompact(totalCosts)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Direct: {fmtCompact(totalDirectCosts)} · Overheads: {fmtCompact(totalOverheads)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            {momGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            )}
            Latest Month
          </div>
          <p className="text-2xl font-bold">{fmtCompact(lastPeriodTotal)}</p>
          <p className={cn('text-xs mt-1 font-medium', momGrowth >= 0 ? 'text-red-600' : 'text-emerald-600')}>
            {momGrowth >= 0 ? '+' : ''}{momGrowth.toFixed(1)}% MoM
            {momGrowth > 10 && <span className="text-red-500 ml-1">⚠</span>}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <PieChartIcon className="h-4 w-4" />
            Gross Margin
          </div>
          <p className={cn(
            'text-2xl font-bold',
            grossMargin < 30 ? 'text-red-600' : grossMargin < 50 ? 'text-amber-600' : 'text-emerald-600'
          )}>
            {grossMargin.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Revenue {fmtCompact(totalRevenue)} − Direct {fmtCompact(totalDirectCosts)}
          </p>
        </div>

        <div className={cn(
          'rounded-xl border p-5',
          interestTotal > totalRevenue * 0.1 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : interestTotal > totalRevenue * 0.05 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-card'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            {interestTotal > totalRevenue * 0.1 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
            Interest Expense
          </div>
          <p className="text-2xl font-bold">{fmtCompact(interestTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalRevenue > 0 ? ((interestTotal / totalRevenue) * 100).toFixed(1) : 0}% of revenue
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === 'overview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          Cost Overview
        </button>
        <button
          onClick={() => setActiveTab('interest')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === 'interest' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          Interest & Debt Cost
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Mix Pie */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Cost Mix by Category</h2>
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
                        `${(name ?? '').length > 16 ? (name ?? '').substring(0, 16) + '…' : (name ?? '')} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Cost']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Direct vs Overhead Trend */}
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Direct Costs vs Overheads</h2>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
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
                      formatter={(value, name) => [
                        formatCurrency(Number(value ?? 0)),
                        name === 'directCosts' ? 'Direct Costs' : 'Overheads',
                      ]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="directCosts"
                      stackId="costs"
                      fill="#7c3aed"
                      fillOpacity={0.6}
                      stroke="#7c3aed"
                    />
                    <Area
                      type="monotone"
                      dataKey="overheads"
                      stackId="costs"
                      fill="#06b6d4"
                      fillOpacity={0.6}
                      stroke="#06b6d4"
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Cost by Group Over Time */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Cost Breakdown Over Time</h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupPeriodData} margin={{ left: 10, right: 10, bottom: 20 }}>
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
                  {groupNames.map((group, i) => (
                    <Bar key={group} dataKey={group} stackId="cost" fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Growth Rate */}
          {growthData.length > 2 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Month-over-Month Cost Growth</h2>
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
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Cost-to-Revenue Ratio */}
          {ratioData.length > 0 && totalRevenue > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-1">Cost-to-Revenue Ratio</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Overall: {costToRevenueRatio.toFixed(1)}% of revenue consumed by costs
              </p>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ratioData} margin={{ left: 10, right: 10, bottom: 20 }}>
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
                      formatter={(value) => [`${Number(value ?? 0)}%`, 'Cost / Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ratio"
                      fill="#f59e0b"
                      fillOpacity={0.3}
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'interest' && (
        <>
          {/* Interest Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Interest by Lender</h2>
              {interestData.length === 0 ? (
                <p className="text-muted-foreground">No interest expense data found</p>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={interestData}
                      layout="vertical"
                      margin={{ left: 120, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={110}
                      />
                      <RechartsTooltip
                        formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Interest']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Interest Summary</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800">Annual Interest Expense</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{fmtCompact(interestTotal)}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {fmtCompact(interestTotal / 12)}/month average
                  </p>
                </div>

                {totalRevenue > 0 && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-800">Interest as % of Revenue</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">
                      {((interestTotal / totalRevenue) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {interestTotal / totalRevenue > 0.1
                        ? 'Critical — interest exceeds 10% of revenue'
                        : interestTotal / totalRevenue > 0.05
                          ? 'Elevated — interest 5-10% of revenue'
                          : 'Manageable — below 5% of revenue'}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Lender Breakdown</h3>
                  {interestData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Cost Accounts Table */}
      <div className="rounded-xl border bg-card p-6">
        <button
          onClick={() => setShowAccounts(!showAccounts)}
          className="flex items-center gap-2 text-lg font-semibold w-full text-left"
        >
          {showAccounts ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          Top Cost Accounts
        </button>

        {showAccounts && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Account</th>
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Class</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">% of Costs</th>
                </tr>
              </thead>
              <tbody>
                {topAccounts.map((acct) => (
                  <tr key={acct.accountId} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <p className="font-medium">{acct.accountName}</p>
                      <p className="text-xs text-muted-foreground">{acct.accountCode}</p>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{acct.category}</td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        acct.xeroClass === 'DIRECTCOSTS' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      )}>
                        {acct.xeroClass === 'DIRECTCOSTS' ? 'Direct' : 'Overhead'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(acct.total)}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {totalCosts > 0 ? ((acct.total / totalCosts) * 100).toFixed(1) : 0}%
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
