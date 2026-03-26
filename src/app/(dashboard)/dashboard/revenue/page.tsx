'use client';

import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
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

const PIE_COLORS = [COLORS.blue, COLORS.emerald, COLORS.violet, COLORS.amber, COLORS.cyan];

/* ─── helpers ─── */
const fmt = (v: number) =>
  `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

/* ─── demo data ─── */
const revenueByProduct = [
  { name: 'SaaS Subscriptions', value: 312000 },
  { name: 'Consulting', value: 208000 },
  { name: 'Implementation', value: 136000 },
  { name: 'Support Plans', value: 96000 },
  { name: 'Training', value: 48000 },
];

const mrrTrend = [
  { month: 'Apr', mrr: 22400 },
  { month: 'May', mrr: 23100 },
  { month: 'Jun', mrr: 23800 },
  { month: 'Jul', mrr: 24600 },
  { month: 'Aug', mrr: 25200 },
  { month: 'Sep', mrr: 25900 },
  { month: 'Oct', mrr: 26800 },
  { month: 'Nov', mrr: 27500 },
  { month: 'Dec', mrr: 28400 },
  { month: 'Jan', mrr: 29200 },
  { month: 'Feb', mrr: 30100 },
  { month: 'Mar', mrr: 31200 },
];

const customerConcentration = [
  { name: 'Meridian PLC', pct: 18 },
  { name: 'Apex Systems', pct: 14 },
  { name: 'BrightPath Ltd', pct: 11 },
  { name: 'Citadel Group', pct: 9 },
  { name: 'Dome Partners', pct: 7 },
];

const growthRate = [
  { month: 'Apr', rate: 2.8 },
  { month: 'May', rate: 3.1 },
  { month: 'Jun', rate: 3.0 },
  { month: 'Jul', rate: 3.4 },
  { month: 'Aug', rate: 2.4 },
  { month: 'Sep', rate: 2.8 },
  { month: 'Oct', rate: 3.5 },
  { month: 'Nov', rate: 2.6 },
  { month: 'Dec', rate: 3.3 },
  { month: 'Jan', rate: 2.8 },
  { month: 'Feb', rate: 3.1 },
  { month: 'Mar', rate: 3.7 },
];

const newVsReturning = [
  { month: 'Oct', new: 8200, returning: 58600 },
  { month: 'Nov', new: 7400, returning: 60100 },
  { month: 'Dec', new: 9800, returning: 61600 },
  { month: 'Jan', new: 8600, returning: 62800 },
  { month: 'Feb', new: 10200, returning: 63400 },
  { month: 'Mar', new: 11400, returning: 64200 },
];

const avgDealSize = [
  { month: 'Apr', deal: 4200 },
  { month: 'May', deal: 4350 },
  { month: 'Jun', deal: 4100 },
  { month: 'Jul', deal: 4600 },
  { month: 'Aug', deal: 4450 },
  { month: 'Sep', deal: 4700 },
  { month: 'Oct', deal: 4800 },
  { month: 'Nov', deal: 4650 },
  { month: 'Dec', deal: 5100 },
  { month: 'Jan', deal: 5250 },
  { month: 'Feb', deal: 5400 },
  { month: 'Mar', deal: 5600 },
];

const totalRevenue = revenueByProduct.reduce((s, p) => s + p.value, 0);

export default function RevenuePage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="text-muted-foreground text-sm">
            Revenue mix, growth trends, and customer insights
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Annual Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fmt(totalRevenue)}</p>
            <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-300">
              +12.4% YoY
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£31.2K</p>
            <p className="text-xs text-emerald-600 mt-1">↑ 3.7% MoM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Deal Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£5,600</p>
            <p className="text-xs text-emerald-600 mt-1">↑ 33% vs 12 months ago</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">142</p>
            <p className="text-xs text-muted-foreground mt-1">Net +8 this quarter</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Product/Service */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Product / Service</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByProduct}
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
                  {revenueByProduct.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR Trend (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mrrTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.blue }}
                  name="MRR"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Concentration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Concentration (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerConcentration} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${Number(v ?? 0)}%`} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${Number(v ?? 0)}%`} />
                <Bar dataKey="pct" fill={COLORS.violet} radius={[0, 4, 4, 0]} name="Revenue %">
                  {customerConcentration.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Top 5 clients account for 59% of revenue. Concentration risk is moderate
            </p>
          </CardContent>
        </Card>

        {/* Revenue Growth Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Growth Rate (MoM %)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${Number(v ?? 0)}%`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={COLORS.emerald}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.emerald }}
                  name="Growth %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* New vs Returning */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New vs Returning Customer Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={newVsReturning}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="returning" stackId="a" fill={COLORS.blue} name="Returning" radius={[0, 0, 0, 0]} />
                <Bar dataKey="new" stackId="a" fill={COLORS.cyan} name="New" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Deal Size */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Deal Size Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={avgDealSize}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(1)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="deal"
                  stroke={COLORS.amber}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.amber }}
                  name="Avg Deal"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
