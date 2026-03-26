'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line,
  PieChart as RechartsPieChart, Pie, Cell,
  AreaChart as RechartsAreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/* ------------------------------------------------------------------ */
/*  Demo data                                                         */
/* ------------------------------------------------------------------ */

const revenueData = [
  { month: 'Oct', revenue: 42000 },
  { month: 'Nov', revenue: 48000 },
  { month: 'Dec', revenue: 53000 },
  { month: 'Jan', revenue: 61000 },
  { month: 'Feb', revenue: 69000 },
  { month: 'Mar', revenue: 78000 },
]

const plData = [
  { name: 'Revenue', value: 78000 },
  { name: 'COGS', value: 29600 },
  { name: 'Gross Profit', value: 48400 },
  { name: 'OpEx', value: 31200 },
  { name: 'Net Profit', value: 17200 },
]

const cashData = [
  { month: 'Oct', cash: 210000 },
  { month: 'Nov', cash: 195000 },
  { month: 'Dec', cash: 218000 },
  { month: 'Jan', cash: 240000 },
  { month: 'Feb', cash: 265000 },
  { month: 'Mar', cash: 298000 },
]

const expenseData = [
  { name: 'Salaries', value: 42, color: '#6366f1' },
  { name: 'Marketing', value: 18, color: '#f59e0b' },
  { name: 'Operations', value: 15, color: '#10b981' },
  { name: 'R&D', value: 14, color: '#3b82f6' },
  { name: 'Other', value: 11, color: '#94a3b8' },
]

const alerts = [
  { text: 'Burn rate exceeded £40K threshold', severity: 'red' },
  { text: 'AR ageing > 60 days increased 15%', severity: 'amber' },
  { text: 'Revenue target 92% achieved', severity: 'amber' },
  { text: 'Cash runway above 12-month minimum', severity: 'green' },
]

const arData = [
  { bucket: 'Current', current: 45000, d30: 0, d60: 0, d90: 0 },
  { bucket: '30 days', current: 0, d30: 28000, d60: 0, d90: 0 },
  { bucket: '60 days', current: 0, d30: 0, d60: 12000, d90: 0 },
  { bucket: '90d+', current: 0, d30: 0, d60: 0, d90: 6500 },
]

const waterfallData = [
  { name: 'Revenue', value: 78000, fill: '#6366f1' },
  { name: 'COGS', value: -29600, fill: '#ef4444' },
  { name: 'Gross Profit', value: 48400, fill: '#10b981' },
  { name: 'OpEx', value: -31200, fill: '#ef4444' },
  { name: 'Net Profit', value: 17200, fill: '#3b82f6' },
]

const kpis = [
  { label: 'Revenue Growth', value: '12%', color: 'bg-indigo-500/15 text-indigo-600' },
  { label: 'Gross Margin', value: '62%', color: 'bg-emerald-500/15 text-emerald-600' },
  { label: 'Burn Rate', value: '£35K', color: 'bg-amber-500/15 text-amber-600' },
  { label: 'Runway', value: '18 mo', color: 'bg-blue-500/15 text-blue-600' },
]

/* ------------------------------------------------------------------ */
/*  Toggle switch component                                           */
/* ------------------------------------------------------------------ */

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-indigo-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
    </label>
  )
}

/* ------------------------------------------------------------------ */
/*  Severity dot for alerts                                           */
/* ------------------------------------------------------------------ */

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
  }
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[severity] ?? 'bg-gray-400'}`} />
}

/* ------------------------------------------------------------------ */
/*  Widget definitions                                                */
/* ------------------------------------------------------------------ */

interface WidgetDef {
  id: string
  name: string
  desc: string
  render: () => React.ReactNode
}

const widgets: WidgetDef[] = [
  {
    id: 'revenue-trend',
    name: 'Revenue Trend',
    desc: 'Monthly revenue over the last 6 months',
    render: () => (
      <ResponsiveContainer width="100%" height={150}>
        <RechartsLineChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `£${v / 1000}K`} />
          <Tooltip formatter={(v) => [`£${(Number(v ?? 0) / 1000).toFixed(0)}K`, 'Revenue']} />
          <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
        </RechartsLineChart>
      </ResponsiveContainer>
    ),
  },
  {
    id: 'pl-summary',
    name: 'P&L Summary',
    desc: 'Current month profit & loss breakdown',
    render: () => (
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={plData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `£${v / 1000}K`} />
          <Tooltip formatter={(v) => [`£${(Number(v ?? 0) / 1000).toFixed(0)}K`]} />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ),
  },
  {
    id: 'cash-position',
    name: 'Cash Position',
    desc: 'Cash balance trajectory over 6 months',
    render: () => (
      <ResponsiveContainer width="100%" height={150}>
        <RechartsAreaChart data={cashData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `£${v / 1000}K`} />
          <Tooltip formatter={(v) => [`£${(Number(v ?? 0) / 1000).toFixed(0)}K`, 'Cash']} />
          <Area type="monotone" dataKey="cash" stroke="#10b981" strokeWidth={2} fill="url(#cashGrad)" />
        </RechartsAreaChart>
      </ResponsiveContainer>
    ),
  },
  {
    id: 'kpi-gauges',
    name: 'KPI Gauges',
    desc: 'Key performance indicators at a glance',
    render: () => (
      <div className="grid grid-cols-2 gap-2 py-2">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-lg px-3 py-2 text-center ${k.color}`}>
            <p className="text-lg font-bold leading-tight">{k.value}</p>
            <p className="text-[10px] font-medium opacity-80">{k.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'expense-breakdown',
    name: 'Expense Breakdown',
    desc: 'Category split of operating expenses',
    render: () => (
      <div className="flex items-center gap-3">
        <ResponsiveContainer width="55%" height={150}>
          <RechartsPieChart>
            <Pie data={expenseData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={2}>
              {expenseData.map((e) => (
                <Cell key={e.name} fill={e.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${Number(v ?? 0)}%`]} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <ul className="flex flex-col gap-1 text-[11px]">
          {expenseData.map((e) => (
            <li key={e.name} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
              <span className="text-muted-foreground">{e.name}</span>
              <span className="font-medium">{e.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'recent-alerts',
    name: 'Recent Alerts',
    desc: 'Latest threshold and anomaly alerts',
    render: () => (
      <ul className="space-y-2.5 py-2">
        {alerts.map((a, i) => (
          <li key={i} className="flex items-start gap-2 text-xs leading-snug">
            <SeverityDot severity={a.severity} />
            <span className="text-muted-foreground">{a.text}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'ar-ageing',
    name: 'AR Ageing',
    desc: 'Accounts receivable ageing buckets',
    render: () => (
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={arData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `£${v / 1000}K`} />
          <Tooltip formatter={(v) => [`£${(Number(v ?? 0) / 1000).toFixed(0)}K`]} />
          <Bar dataKey="current" stackId="ar" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar dataKey="d30" stackId="ar" fill="#f59e0b" />
          <Bar dataKey="d60" stackId="ar" fill="#f97316" />
          <Bar dataKey="d90" stackId="ar" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ),
  },
  {
    id: 'revenue-waterfall',
    name: 'Revenue Waterfall',
    desc: 'Bridge from revenue to net profit',
    render: () => (
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={waterfallData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `£${Math.abs(v) / 1000}K`} />
          <Tooltip formatter={(v) => [`£${Math.abs(Number(v ?? 0)) / 1000}K`]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {waterfallData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ),
  },
]

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function DashboardWidgetsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(widgets.map((w) => [w.id, true]))
  )

  const toggle = (id: string) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }))

  const enabledCount = Object.values(enabled).filter(Boolean).length

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Widgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle widgets on or off to customise your dashboard view.
          </p>
        </div>
        <Badge variant="secondary" className="mt-2 w-fit sm:mt-0">
          {enabledCount} of {widgets.length} active
        </Badge>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {widgets.map((w) => (
          <Card
            key={w.id}
            className={`transition-all duration-200 ${
              enabled[w.id]
                ? 'border-border shadow-sm hover:shadow-md hover:border-indigo-400/50'
                : 'border-border/50 opacity-60 hover:opacity-80'
            }`}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-0.5 pr-4">
                <CardTitle className="text-sm font-semibold">{w.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{w.desc}</p>
              </div>
              <Toggle checked={enabled[w.id]} onChange={() => toggle(w.id)} />
            </CardHeader>
            <CardContent className="pt-0">
              {w.render()}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
