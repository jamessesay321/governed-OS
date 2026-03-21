'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Layers,
  AreaChart,
  Sparkles,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/* ------------------------------------------------------------------ */
/*  Chart types                                                        */
/* ------------------------------------------------------------------ */

const chartTypes = [
  { key: 'bar', label: 'Bar', icon: <BarChart3 className="size-4" /> },
  { key: 'line', label: 'Line', icon: <LineChart className="size-4" /> },
  { key: 'pie', label: 'Pie', icon: <PieChart className="size-4" /> },
  { key: 'waterfall', label: 'Waterfall', icon: <TrendingUp className="size-4" /> },
  { key: 'area', label: 'Area', icon: <AreaChart className="size-4" /> },
  { key: 'combo', label: 'Combo', icon: <Layers className="size-4" /> },
] as const

type ChartType = (typeof chartTypes)[number]['key']

/* ------------------------------------------------------------------ */
/*  Example prompts                                                    */
/* ------------------------------------------------------------------ */

const examplePrompts = [
  'Show revenue vs expenses for the last 12 months',
  'Create a waterfall from revenue to net profit',
  'Compare top 5 clients by revenue as a pie chart',
  'Monthly recurring revenue growth over 2 years',
  'Headcount by department as a stacked bar chart',
  'Cash flow trend with operating and investing lines',
]

/* ------------------------------------------------------------------ */
/*  Mock data sets                                                     */
/* ------------------------------------------------------------------ */

const monthlyData = [
  { month: 'Jan', revenue: 42000, expenses: 31000 },
  { month: 'Feb', revenue: 45000, expenses: 29000 },
  { month: 'Mar', revenue: 51000, expenses: 33000 },
  { month: 'Apr', revenue: 48000, expenses: 30000 },
  { month: 'May', revenue: 55000, expenses: 35000 },
  { month: 'Jun', revenue: 60000, expenses: 34000 },
  { month: 'Jul', revenue: 58000, expenses: 36000 },
  { month: 'Aug', revenue: 63000, expenses: 37000 },
  { month: 'Sep', revenue: 67000, expenses: 38000 },
  { month: 'Oct', revenue: 65000, expenses: 40000 },
  { month: 'Nov', revenue: 72000, expenses: 41000 },
  { month: 'Dec', revenue: 78000, expenses: 43000 },
]

const pieData = [
  { name: 'Salaries', value: 42 },
  { name: 'Marketing', value: 18 },
  { name: 'Operations', value: 15 },
  { name: 'R&D', value: 14 },
  { name: 'Other', value: 11 },
]

const waterfallData = [
  { name: 'Revenue', value: 120000, fill: 'var(--color-emerald-500, #10b981)' },
  { name: 'COGS', value: -42000, fill: 'var(--color-rose-400, #fb7185)' },
  { name: 'Gross Profit', value: 78000, fill: 'var(--color-emerald-400, #34d399)' },
  { name: 'OpEx', value: -35000, fill: 'var(--color-rose-400, #fb7185)' },
  { name: 'Tax', value: -9000, fill: 'var(--color-rose-300, #fda4af)' },
  { name: 'Net Profit', value: 34000, fill: 'var(--color-primary, hsl(var(--primary)))' },
]

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b']

/* ------------------------------------------------------------------ */
/*  Chart preview components                                           */
/* ------------------------------------------------------------------ */

function BarPreview() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function LinePreview() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsLineChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} dot={false} />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

function PiePreview() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsPieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={3}
          dataKey="value"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) => `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}

function AreaPreview() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsAreaChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} strokeWidth={2} />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}

function WaterfallPreview() {
  // Simple waterfall using stacked bar approach with cumulative positioning
  let cumulative = 0
  const data = waterfallData.map((item) => {
    const isTotal = item.name === 'Gross Profit' || item.name === 'Net Profit'
    const base = isTotal ? 0 : (item.value >= 0 ? cumulative : cumulative + item.value)
    const height = isTotal ? Math.abs(item.value) : Math.abs(item.value)
    if (!isTotal) cumulative += item.value
    else cumulative = item.value
    return { ...item, base, height, isNegative: item.value < 0 }
  })

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) =>
            `$${Math.abs(Number(value ?? 0)).toLocaleString()}`
          }
        />
        <Bar dataKey="base" stackId="stack" fill="transparent" />
        <Bar dataKey="height" stackId="stack" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.name === 'Net Profit'
                  ? '#3b82f6'
                  : entry.name === 'Gross Profit'
                    ? '#34d399'
                    : entry.isNegative
                      ? '#fb7185'
                      : '#10b981'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ComboPreview() {
  const comboData = monthlyData.map((d) => ({
    ...d,
    margin: Number((((d.revenue - d.expenses) / d.revenue) * 100).toFixed(1)),
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={comboData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 60]} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="margin"
          name="Margin %"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

const chartPreviews: Record<ChartType, () => React.ReactNode> = {
  bar: BarPreview,
  line: LinePreview,
  pie: PiePreview,
  area: AreaPreview,
  waterfall: WaterfallPreview,
  combo: ComboPreview,
}

/* ------------------------------------------------------------------ */
/*  Builder page                                                       */
/* ------------------------------------------------------------------ */

export default function GraphBuilderPage() {
  const [prompt, setPrompt] = useState('')
  const [selectedType, setSelectedType] = useState<ChartType>('bar')

  const ChartPreview = chartPreviews[selectedType]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/graphs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Graph Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Describe the chart you need and let AI generate it from your data.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: Input panel */}
        <div className="space-y-6">
          {/* Prompt input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-amber-500" />
                Describe your graph
              </CardTitle>
              <CardDescription>
                Use plain English to describe the chart you want to create.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the graph you want to see..."
                rows={4}
                className={cn(
                  'w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs',
                  'placeholder:text-muted-foreground',
                  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  'resize-none outline-none transition-[color,box-shadow]',
                  'border-input dark:bg-input/30'
                )}
              />
              <Button className="w-full" disabled={!prompt.trim()}>
                <Sparkles className="size-4" />
                Generate Chart
              </Button>
            </CardContent>
          </Card>

          {/* Example prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Example prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((ep) => (
                  <button
                    key={ep}
                    onClick={() => setPrompt(ep)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs',
                      'text-muted-foreground hover:text-foreground hover:bg-accent',
                      'transition-colors cursor-pointer'
                    )}
                  >
                    {ep}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart type selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Chart type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {chartTypes.map((ct) => (
                  <button
                    key={ct.key}
                    onClick={() => setSelectedType(ct.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all cursor-pointer',
                      selectedType === ct.key
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    )}
                  >
                    {ct.icon}
                    {ct.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Chart preview */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preview</CardTitle>
              <Badge variant="outline" className="text-xs">
                Sample data
              </Badge>
            </div>
            <CardDescription>
              Live preview using mock data. Connect your accounts to use real figures.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[360px]">
            <ChartPreview />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
