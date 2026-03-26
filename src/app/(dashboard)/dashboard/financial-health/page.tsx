'use client';

import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
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

/* ─── helpers ─── */
const fmt = (v: number) =>
  `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

/* ─── demo data ─── */
const cashFlowWaterfall = [
  { name: 'Operating CF', value: 142000 },
  { name: 'Investing CF', value: -38000 },
  { name: 'Financing CF', value: -24000 },
  { name: 'Net CF', value: 80000 },
];

const burnRateData = [
  { month: 'Oct', burn: 48200 },
  { month: 'Nov', burn: 51300 },
  { month: 'Dec', burn: 53100 },
  { month: 'Jan', burn: 49800 },
  { month: 'Feb', burn: 47600 },
  { month: 'Mar', burn: 46200 },
];

const arAgeingData = [
  { month: 'Oct', current: 62000, d30: 18000, d60: 8500, d90: 3200 },
  { month: 'Nov', current: 58000, d30: 21000, d60: 7200, d90: 4100 },
  { month: 'Dec', current: 71000, d30: 16000, d60: 9800, d90: 2800 },
  { month: 'Jan', current: 64000, d30: 19500, d60: 6400, d90: 3600 },
  { month: 'Feb', current: 67000, d30: 17200, d60: 7800, d90: 2900 },
  { month: 'Mar', current: 69000, d30: 15800, d60: 6100, d90: 2400 },
];

const apAgeingData = [
  { month: 'Oct', current: 34000, d30: 12000, d60: 5200, d90: 1800 },
  { month: 'Nov', current: 31000, d30: 14500, d60: 4800, d90: 2200 },
  { month: 'Dec', current: 38000, d30: 11200, d60: 6100, d90: 1500 },
  { month: 'Jan', current: 35000, d30: 13800, d60: 4200, d90: 1900 },
  { month: 'Feb', current: 36500, d30: 12600, d60: 5500, d90: 1600 },
  { month: 'Mar', current: 33000, d30: 11800, d60: 4600, d90: 1400 },
];

const cashPositionData = [
  { month: 'Oct', cash: 186000 },
  { month: 'Nov', cash: 174000 },
  { month: 'Dec', cash: 192000 },
  { month: 'Jan', cash: 201000 },
  { month: 'Feb', cash: 218000 },
  { month: 'Mar', cash: 248000 },
];

const RUNWAY_MONTHS = 18;
const RUNWAY_TARGET = 24;

export default function FinancialHealthPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Health</h1>
          <p className="text-muted-foreground text-sm">
            Cash flow, runway, and working-capital overview
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stat cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1.42</p>
            <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-300">
              Healthy (&gt;1.0)
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1.87</p>
            <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-300">
              Strong (&gt;1.5)
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£248K</p>
            <p className="text-xs text-muted-foreground mt-1">+£30K vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Burn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">£46.2K</p>
            <p className="text-xs text-emerald-600 mt-1">↓ 2.9% vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Waterfall */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash Flow Waterfall (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashFlowWaterfall}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => fmt(Number(v ?? 0))} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {cashFlowWaterfall.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.name === 'Net CF'
                          ? COLORS.blue
                          : entry.value >= 0
                            ? COLORS.emerald
                            : COLORS.rose
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Runway Gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash Runway</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 pt-4">
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{RUNWAY_MONTHS} months</span>
                <span className="text-muted-foreground">Target: {RUNWAY_TARGET} months</span>
              </div>
              <div className="h-6 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(RUNWAY_MONTHS / RUNWAY_TARGET) * 100}%`,
                    background: `linear-gradient(90deg, ${COLORS.emerald}, ${COLORS.cyan})`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Based on £248K cash and £46.2K/mo average burn. {RUNWAY_TARGET - RUNWAY_MONTHS}{' '}
                months below target.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center mt-4 w-full max-w-md">
              <div>
                <p className="text-2xl font-bold">£248K</p>
                <p className="text-xs text-muted-foreground">Cash</p>
              </div>
              <div>
                <p className="text-2xl font-bold">÷ £46.2K</p>
                <p className="text-xs text-muted-foreground">Avg Burn</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">= 18mo</p>
                <p className="text-xs text-muted-foreground">Runway</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Burn Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Burn Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={burnRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="burn"
                  stroke={COLORS.rose}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLORS.rose }}
                  name="Burn Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cash Position */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash Position</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cashPositionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke={COLORS.blue}
                  fill={COLORS.blue}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Cash Balance"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AR Ageing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accounts Receivable Ageing</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={arAgeingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="current" stackId="a" fill={COLORS.emerald} name="Current" radius={[0, 0, 0, 0]} />
                <Bar dataKey="d30" stackId="a" fill={COLORS.amber} name="30 days" />
                <Bar dataKey="d60" stackId="a" fill={COLORS.violet} name="60 days" />
                <Bar dataKey="d90" stackId="a" fill={COLORS.rose} name="90+ days" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AP Ageing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accounts Payable Ageing</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={apAgeingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `£${(Number(v ?? 0) / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="current" stackId="a" fill={COLORS.cyan} name="Current" radius={[0, 0, 0, 0]} />
                <Bar dataKey="d30" stackId="a" fill={COLORS.amber} name="30 days" />
                <Bar dataKey="d60" stackId="a" fill={COLORS.violet} name="60 days" />
                <Bar dataKey="d90" stackId="a" fill={COLORS.rose} name="90+ days" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
