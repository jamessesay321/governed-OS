'use client';

import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ─── colour palette ─── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
};

const PIE_COLORS = [COLORS.blue, COLORS.rose, COLORS.amber, COLORS.violet, COLORS.cyan];

/* ─── helpers ─── */
const fmt = (v: number) =>
  `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

/* ─── demo data ─── */
const grossMarginTrend = [
  { month: 'Apr', margin: 62.1 },
  { month: 'May', margin: 63.4 },
  { month: 'Jun', margin: 61.8 },
  { month: 'Jul', margin: 64.2 },
  { month: 'Aug', margin: 63.5 },
  { month: 'Sep', margin: 64.8 },
  { month: 'Oct', margin: 65.1 },
  { month: 'Nov', margin: 64.6 },
  { month: 'Dec', margin: 66.2 },
  { month: 'Jan', margin: 65.8 },
  { month: 'Feb', margin: 66.4 },
  { month: 'Mar', margin: 67.1 },
];

const operatingMarginTrend = [
  { month: 'Apr', margin: 14.2 },
  { month: 'May', margin: 15.1 },
  { month: 'Jun', margin: 13.8 },
  { month: 'Jul', margin: 16.0 },
  { month: 'Aug', margin: 15.4 },
  { month: 'Sep', margin: 16.8 },
  { month: 'Oct', margin: 17.2 },
  { month: 'Nov', margin: 16.5 },
  { month: 'Dec', margin: 18.1 },
  { month: 'Jan', margin: 17.6 },
  { month: 'Feb', margin: 18.4 },
  { month: 'Mar', margin: 19.2 },
];

const expenseBreakdown = [
  { name: 'Salaries & Benefits', value: 384000 },
  { name: 'Marketing & Sales', value: 88000 },
  { name: 'Operations', value: 72000 },
  { name: 'R&D', value: 64000 },
  { name: 'Other', value: 32000 },
];

const budgetVsActual = [
  { category: 'Salaries', budget: 390000, actual: 384000 },
  { category: 'Marketing', budget: 96000, actual: 88000 },
  { category: 'Operations', budget: 68000, actual: 72000 },
  { category: 'R&D', budget: 60000, actual: 64000 },
  { category: 'Other', budget: 36000, actual: 32000 },
];

const netProfitTrend = [
  { month: 'Apr', profit: 6800 },
  { month: 'May', profit: 7400 },
  { month: 'Jun', profit: 5900 },
  { month: 'Jul', profit: 8200 },
  { month: 'Aug', profit: 7600 },
  { month: 'Sep', profit: 9100 },
  { month: 'Oct', profit: 9800 },
  { month: 'Nov', profit: 8400 },
  { month: 'Dec', profit: 11200 },
  { month: 'Jan', profit: 10600 },
  { month: 'Feb', profit: 11800 },
  { month: 'Mar', profit: 13400 },
];

const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.value, 0);

export default function ProfitabilityPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profitability</h1>
          <p className="text-muted-foreground text-sm">
            Margins, expenses, and unit economics
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Unit economics stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customer Acquisition Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£1,240</p>
            <p className="text-xs text-emerald-600 mt-1">↓ 8% vs last quarter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime Value (LTV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£8,640</p>
            <p className="text-xs text-emerald-600 mt-1">↑ 12% vs last quarter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              LTV : CAC Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">7.0x</p>
            <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-300">
              Excellent (&gt;3x)
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payback Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">5.8 mo</p>
            <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-300">
              Healthy (&lt;12 mo)
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gross Margin Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gross Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={grossMarginTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[55, 72]}
                  tickFormatter={(v) => `${Number(v ?? 0)}%`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke={COLORS.emerald}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.emerald }}
                  name="Gross Margin"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Operating Margin Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operating Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={operatingMarginTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[10, 24]}
                  tickFormatter={(v) => `${Number(v ?? 0)}%`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.blue }}
                  name="Operating Margin"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Expense Breakdown ({fmt(totalExpenses)} total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {expenseBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs Actual (Annual)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetVsActual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="budget" fill={COLORS.blue} name="Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill={COLORS.amber} name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
              {budgetVsActual.map((row) => {
                const diff = row.actual - row.budget;
                const pct = ((diff / row.budget) * 100).toFixed(1);
                return (
                  <span key={row.category}>
                    {row.category}:{' '}
                    <span className={diff > 0 ? 'text-rose-500' : 'text-emerald-600'}>
                      {diff > 0 ? '+' : ''}
                      {pct}%
                    </span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Net Profit Trend (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={netProfitTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(1)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke={COLORS.emerald}
                  fill={COLORS.emerald}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Net Profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
