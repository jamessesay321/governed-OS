'use client';

import { useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, TrendingDown, TrendingUp, PoundSterling,
  Building2, BarChart3, PieChart as PieChartIcon, Lightbulb,
} from 'lucide-react';

/* ── colour palette ── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  slate: '#64748b',
  indigo: '#6366f1',
};

const CHART_COLORS = [COLORS.emerald, COLORS.blue, COLORS.violet, COLORS.amber, COLORS.cyan, COLORS.rose, COLORS.indigo, COLORS.slate];

const fmt = (v: number) =>
  `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

/* ── Spend by category ── */
const spendByCategory = [
  { name: 'IT & Software', value: 312000 },
  { name: 'Professional Services', value: 248000 },
  { name: 'Marketing', value: 156000 },
  { name: 'Office Supplies', value: 98000 },
  { name: 'Facilities', value: 132000 },
  { name: 'Travel', value: 78000 },
  { name: 'Logistics', value: 45000 },
  { name: 'Training', value: 62000 },
];

/* ── Spend by supplier ── */
const spendBySupplier = [
  { name: 'TechFlow Solutions', value: 142000 },
  { name: 'Meridian Consulting', value: 98000 },
  { name: 'DataSecure Pro', value: 76000 },
  { name: 'Apex Recruitment', value: 52000 },
  { name: 'OfficeHub Ltd', value: 34500 },
  { name: 'CleanSpace Facilities', value: 28000 },
];

/* ── Spend by department ── */
const spendByDepartment = [
  { name: 'Engineering', value: 285000 },
  { name: 'Marketing', value: 178000 },
  { name: 'Operations', value: 156000 },
  { name: 'Sales', value: 132000 },
  { name: 'HR', value: 98000 },
  { name: 'Finance', value: 72000 },
];

/* ── Budget vs Actual ── */
const budgetVsActual = [
  { category: 'IT & Software', budget: 350000, actual: 312000 },
  { category: 'Prof. Services', budget: 220000, actual: 248000 },
  { category: 'Marketing', budget: 180000, actual: 156000 },
  { category: 'Office', budget: 100000, actual: 98000 },
  { category: 'Facilities', budget: 120000, actual: 132000 },
  { category: 'Travel', budget: 90000, actual: 78000 },
];

/* ── Spend trend ── */
const spendTrend = [
  { month: 'Apr', spend: 82000, budget: 90000 },
  { month: 'May', spend: 88000, budget: 90000 },
  { month: 'Jun', spend: 95000, budget: 90000 },
  { month: 'Jul', spend: 78000, budget: 90000 },
  { month: 'Aug', spend: 85000, budget: 90000 },
  { month: 'Sep', spend: 92000, budget: 90000 },
  { month: 'Oct', spend: 98000, budget: 95000 },
  { month: 'Nov', spend: 105000, budget: 95000 },
  { month: 'Dec', spend: 72000, budget: 95000 },
  { month: 'Jan', spend: 88000, budget: 95000 },
  { month: 'Feb', spend: 94000, budget: 95000 },
  { month: 'Mar', spend: 102000, budget: 95000 },
];

/* ── Top 10 suppliers ── */
interface TopSupplier {
  rank: number;
  name: string;
  category: string;
  totalSpend: number;
  poCount: number;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
}

const topSuppliers: TopSupplier[] = [
  { rank: 1, name: 'TechFlow Solutions', category: 'IT & Software', totalSpend: 142000, poCount: 18, trend: 'up', changePercent: 12.5 },
  { rank: 2, name: 'Meridian Consulting', category: 'Professional Services', totalSpend: 98000, poCount: 8, trend: 'up', changePercent: 8.3 },
  { rank: 3, name: 'DataSecure Pro', category: 'IT & Software', totalSpend: 76000, poCount: 5, trend: 'down', changePercent: 3.2 },
  { rank: 4, name: 'Apex Recruitment', category: 'Professional Services', totalSpend: 52000, poCount: 12, trend: 'up', changePercent: 15.1 },
  { rank: 5, name: 'OfficeHub Ltd', category: 'Office Supplies', totalSpend: 34500, poCount: 24, trend: 'flat', changePercent: 0.5 },
  { rank: 6, name: 'CleanSpace Facilities', category: 'Facilities', totalSpend: 28000, poCount: 12, trend: 'down', changePercent: 5.8 },
  { rank: 7, name: 'GreenPrint Media', category: 'Marketing', totalSpend: 21000, poCount: 6, trend: 'up', changePercent: 22.0 },
  { rank: 8, name: 'SwiftLogistics UK', category: 'Logistics', totalSpend: 15000, poCount: 9, trend: 'down', changePercent: 10.2 },
  { rank: 9, name: 'LearnPro UK', category: 'Training', totalSpend: 12500, poCount: 3, trend: 'up', changePercent: 5.0 },
  { rank: 10, name: 'CaterPlus Events', category: 'Facilities', totalSpend: 8200, poCount: 7, trend: 'flat', changePercent: 1.1 },
];

/* ── Savings opportunities (AI placeholder) ── */
const savingsOpportunities = [
  {
    title: 'Consolidate IT Vendors',
    description: 'Merging 3 overlapping IT subscriptions could save approximately 15% on annual licensing costs.',
    estimatedSaving: 18000,
    difficulty: 'medium' as const,
  },
  {
    title: 'Renegotiate Office Supplies Contract',
    description: 'Current contract is 8% above market rate. Benchmark data suggests room for renegotiation.',
    estimatedSaving: 7800,
    difficulty: 'easy' as const,
  },
  {
    title: 'Bulk Travel Booking Discount',
    description: 'Switching to a corporate travel management platform could yield volume discounts.',
    estimatedSaving: 12000,
    difficulty: 'easy' as const,
  },
  {
    title: 'Automate Low-Value Procurement',
    description: 'Purchases under £500 account for 45% of PO volume but only 3% of spend. Automation would reduce processing costs.',
    estimatedSaving: 9500,
    difficulty: 'hard' as const,
  },
];

const difficultyStyles = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
};

type BreakdownView = 'category' | 'supplier' | 'department';

export default function SpendAnalyticsPage() {
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('category');

  const breakdownData =
    breakdownView === 'category'
      ? spendByCategory
      : breakdownView === 'supplier'
        ? spendBySupplier
        : spendByDepartment;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; Connect your procurement system to see
        real spend analytics.
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Spend Analytics
        </h1>
        <p className="mt-1 text-gray-500">
          Analyse procurement spending patterns, compare budget performance, and identify savings.
        </p>
      </div>

      {/* Spend Breakdown */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Spend Breakdown</h2>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {([
              { key: 'category', label: 'By Category', icon: <PieChartIcon className="h-3.5 w-3.5" /> },
              { key: 'supplier', label: 'By Supplier', icon: <Building2 className="h-3.5 w-3.5" /> },
              { key: 'department', label: 'By Department', icon: <BarChart3 className="h-3.5 w-3.5" /> },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setBreakdownView(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  breakdownView === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pie chart */}
          <Card>
            <CardContent className="pt-0">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {breakdownData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmt(Number(v ?? 0))}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar chart */}
          <Card>
            <CardContent className="pt-0">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      width={120}
                    />
                    <Tooltip
                      formatter={(v) => fmt(Number(v ?? 0))}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {breakdownData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Budget vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Comparing planned budget against actual spend by category.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => fmt(Number(v ?? 0))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill={COLORS.slate} radius={[4, 4, 0, 0]} opacity={0.4} />
                <Bar dataKey="actual" name="Actual" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Spend Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spend Trend</CardTitle>
          <CardDescription>Actual spend vs budget allocation over the last 12 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => fmt(Number(v ?? 0))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="spend"
                  name="Actual Spend"
                  stroke={COLORS.emerald}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLORS.emerald }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke={COLORS.slate}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Savings Opportunities */}
      <Card className="border-violet-200 bg-violet-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            AI-Identified Savings Opportunities
          </CardTitle>
          <CardDescription>
            Potential cost reductions identified through procurement data analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {savingsOpportunities.map((opp) => (
              <div
                key={opp.title}
                className="rounded-lg border border-violet-100 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-violet-500" />
                    <h4 className="font-medium text-gray-900">{opp.title}</h4>
                  </div>
                  <Badge className={difficultyStyles[opp.difficulty]} variant="outline">
                    {opp.difficulty}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-500">{opp.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-emerald-600">
                  <PoundSterling className="h-4 w-4" />
                  Est. saving: {fmt(opp.estimatedSaving)}/yr
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-violet-500">
            These are AI-generated estimates based on available procurement data. Actual savings may vary.
            More data will improve accuracy over time.
          </p>
        </CardContent>
      </Card>

      {/* Top 10 Suppliers by Spend */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Suppliers by Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium w-10">#</th>
                  <th className="pb-3 pr-4 font-medium">Supplier</th>
                  <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Category</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total Spend</th>
                  <th className="pb-3 pr-4 font-medium hidden md:table-cell text-right">POs</th>
                  <th className="pb-3 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((s) => (
                  <tr key={s.rank} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 pr-4 text-gray-400 font-medium">{s.rank}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 pr-4 text-gray-600 hidden sm:table-cell">{s.category}</td>
                    <td className="py-3 pr-4 text-right font-medium text-gray-900">{fmt(s.totalSpend)}</td>
                    <td className="py-3 pr-4 text-right text-gray-600 hidden md:table-cell">{s.poCount}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {s.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : s.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                        <span
                          className={`text-xs font-medium ${
                            s.trend === 'up'
                              ? 'text-red-600'
                              : s.trend === 'down'
                                ? 'text-emerald-600'
                                : 'text-gray-400'
                          }`}
                        >
                          {s.changePercent > 0 ? `${s.trend === 'up' ? '+' : '-'}${s.changePercent}%` : `${s.changePercent}%`}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
