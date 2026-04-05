'use client'

import { useState, useCallback } from 'react'
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
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react'
import { useDrillDown } from '@/components/shared/drill-down-sheet'
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
import { formatCurrency } from '@/lib/formatting/currency'

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
/*  Generated chart config type                                        */
/* ------------------------------------------------------------------ */

interface DataKey {
  key: string
  color: string
  name: string
}

interface GeneratedChart {
  title: string
  chartType: ChartType
  data: Record<string, unknown>[]
  dataKeys: DataKey[]
  xAxisKey: string
  summary: string
}

/* ------------------------------------------------------------------ */
/*  Example prompts                                                    */
/* ------------------------------------------------------------------ */

const examplePrompts = [
  'Show revenue vs expenses for the last 12 months',
  'Create a waterfall from revenue to net profit',
  'Compare top 5 expense categories as a pie chart',
  'Monthly recurring revenue growth over 2 years',
  'Headcount by department as a stacked bar chart',
  'Cash flow trend with operating and investing lines',
]

/* ------------------------------------------------------------------ */
/*  Fallback mock data (shown before generation)                       */
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

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b', '#f43f5e', '#06b6d4', '#ec4899']

/* ------------------------------------------------------------------ */
/*  Dynamic chart renderer                                             */
/* ------------------------------------------------------------------ */

function DynamicChart({ chart, onDataPointClick }: { chart: GeneratedChart; onDataPointClick?: (label: string, value: number) => void }) {
  const { chartType, data, dataKeys, xAxisKey } = chart

  // Currency formatter for chart tooltips
  const fmtTooltip = (v: number | string) => formatCurrency(Number(v ?? 0))

  // Click handler for chart elements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (payload: any) => {
    if (!onDataPointClick || !payload) return
    const label = String(payload[xAxisKey] ?? payload.name ?? '')
    const numKeys = Object.keys(payload).filter((k) => typeof payload[k] === 'number')
    const value = Number(payload[numKeys[0]] ?? 0)
    onDataPointClick(label, value)
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={3}
            dataKey={dataKeys[0]?.key || 'value'}
            nameKey={xAxisKey}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={(props: any) => `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}
            onClick={(_: unknown, index: number) => handleClick(data[index])}
            className="cursor-pointer"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={dataKeys[i]?.color || PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => fmtTooltip(v as number)} />
        </RechartsPieChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <RechartsLineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }} onClick={(e: Record<string, unknown>) => { const ap = (e as Record<string, unknown>)?.activePayload as Array<Record<string, unknown>> | undefined; if (ap?.[0]) handleClick(ap[0].payload as Record<string, unknown>) }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(Number(v ?? 0))} />
          <Tooltip formatter={(v) => fmtTooltip(v as number)} />
          <Legend />
          {dataKeys.map((dk) => (
            <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.name} stroke={dk.color} strokeWidth={2} dot={false} className="cursor-pointer" />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <RechartsAreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }} onClick={(e: Record<string, unknown>) => { const ap = (e as Record<string, unknown>)?.activePayload as Array<Record<string, unknown>> | undefined; if (ap?.[0]) handleClick(ap[0].payload as Record<string, unknown>) }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(Number(v ?? 0))} />
          <Tooltip formatter={(v) => fmtTooltip(v as number)} />
          <Legend />
          {dataKeys.map((dk) => (
            <Area key={dk.key} type="monotone" dataKey={dk.key} name={dk.name} stroke={dk.color} fill={dk.color} fillOpacity={0.15} strokeWidth={2} className="cursor-pointer" />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'waterfall') {
    // Process waterfall data
    let cumulative = 0
    const processed = data.map((item) => {
      const value = Number(item.value || 0)
      const name = String(item[xAxisKey] || item.name || '')
      const isTotal = name.toLowerCase().includes('profit') || name.toLowerCase().includes('total') || name.toLowerCase().includes('net')
      const base = isTotal ? 0 : (value >= 0 ? cumulative : cumulative + value)
      const height = Math.abs(value)
      if (!isTotal) cumulative += value
      else cumulative = value
      return { ...item, base, height, isNegative: value < 0, isTotal }
    })

    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={processed} margin={{ top: 8, right: 16, bottom: 0, left: -8 }} onClick={(e: Record<string, unknown>) => { const ap = (e as Record<string, unknown>)?.activePayload as Array<Record<string, unknown>> | undefined; if (ap?.[0]) handleClick(ap[0].payload as Record<string, unknown>) }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => formatCurrency(Math.abs(Number(value ?? 0)))}
          />
          <Bar dataKey="base" stackId="stack" fill="transparent" />
          <Bar dataKey="height" stackId="stack" radius={[3, 3, 0, 0]} className="cursor-pointer">
            {processed.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isTotal ? '#3b82f6' : entry.isNegative ? '#fb7185' : '#10b981'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Default: bar chart (also handles combo)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }} onClick={(e: Record<string, unknown>) => { const ap = (e as Record<string, unknown>)?.activePayload as Array<Record<string, unknown>> | undefined; if (ap?.[0]) handleClick(ap[0].payload as Record<string, unknown>) }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(Number(v ?? 0))} />
        <Tooltip formatter={(v) => fmtTooltip(v as number)} />
        <Legend />
        {dataKeys.map((dk) => (
          <Bar key={dk.key} dataKey={dk.key} name={dk.name} fill={dk.color} radius={[3, 3, 0, 0]} className="cursor-pointer" />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Static fallback previews (shown when no generation yet)            */
/* ------------------------------------------------------------------ */

function FallbackBarPreview() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function FallbackPiePreview() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsPieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) => `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}
        >
          {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
        </Pie>
        <Tooltip />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}

function FallbackLinePreview() {
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

const fallbackPreviews: Record<ChartType, () => React.ReactNode> = {
  bar: FallbackBarPreview,
  line: FallbackLinePreview,
  pie: FallbackPiePreview,
  area: FallbackLinePreview,
  waterfall: FallbackBarPreview,
  combo: FallbackBarPreview,
}

/* ------------------------------------------------------------------ */
/*  Builder page                                                       */
/* ------------------------------------------------------------------ */

export default function GraphBuilderPage() {
  const [prompt, setPrompt] = useState('')
  const [selectedType, setSelectedType] = useState<ChartType>('bar')
  const [generating, setGenerating] = useState(false)
  const [generatedChart, setGeneratedChart] = useState<GeneratedChart | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Drill-down on chart data point click
  const { openDrill } = useDrillDown()

  const handleDataPointClick = useCallback((label: string, value: number) => {
    if (!openDrill) return
    openDrill({
      type: 'custom',
      title: `Chart Detail: ${label}`,
      subtitle: generatedChart?.title,
      rows: [
        { label: 'Data Point', value: label },
        { label: 'Value', value: formatCurrency(value) },
        ...(generatedChart?.summary ? [{ label: 'Context', value: generatedChart.summary }] : []),
      ],
    })
  }, [openDrill, generatedChart])

  async function handleGenerate() {
    if (!prompt.trim()) return
    setGenerating(true)
    setError(null)
    setGeneratedChart(null)

    try {
      const res = await fetch('/api/graphs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), chartType: selectedType }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to generate chart')
      }

      const data = await res.json()
      setGeneratedChart(data)
      // Update selected type to match what was generated
      if (data.chartType && data.chartType !== selectedType) {
        setSelectedType(data.chartType)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  function handleReset() {
    setGeneratedChart(null)
    setError(null)
    setPrompt('')
  }

  const FallbackPreview = fallbackPreviews[selectedType]

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
            Describe the chart you need and AI will generate it from your data.
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && prompt.trim() && !generating) {
                    handleGenerate()
                  }
                }}
                placeholder="e.g. Show revenue vs expenses for the last 12 months..."
                rows={4}
                disabled={generating}
                className={cn(
                  'w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs',
                  'placeholder:text-muted-foreground',
                  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  'resize-none outline-none transition-[color,box-shadow]',
                  'border-input dark:bg-input/30',
                  generating && 'opacity-50 cursor-not-allowed'
                )}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!prompt.trim() || generating}
                  onClick={handleGenerate}
                >
                  {generating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {generating ? 'Generating...' : 'Generate Chart'}
                </Button>
                {generatedChart && (
                  <Button variant="outline" size="icon" onClick={handleReset} title="Start over">
                    <RefreshCw className="size-4" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Press Cmd+Enter to generate
              </p>
            </CardContent>
          </Card>

          {/* Example prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Try these</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((ep) => (
                  <button
                    key={ep}
                    onClick={() => { setPrompt(ep); setGeneratedChart(null); setError(null) }}
                    disabled={generating}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs',
                      'text-muted-foreground hover:text-foreground hover:bg-accent',
                      'transition-colors cursor-pointer',
                      generating && 'opacity-50 cursor-not-allowed'
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
              <CardDescription className="text-xs">AI will suggest one, but you can override it.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {chartTypes.map((ct) => (
                  <button
                    key={ct.key}
                    onClick={() => setSelectedType(ct.key)}
                    disabled={generating}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all cursor-pointer',
                      selectedType === ct.key
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      generating && 'opacity-50 cursor-not-allowed'
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
              <div>
                <CardTitle className="text-base">
                  {generatedChart ? generatedChart.title : 'Preview'}
                </CardTitle>
                {generatedChart?.summary && (
                  <p className="text-xs text-muted-foreground mt-1">{generatedChart.summary}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {generatedChart && (
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="size-3 mr-1" />
                    Save
                  </Button>
                )}
                <Badge variant={generatedChart ? 'default' : 'outline'} className="text-xs">
                  {generatedChart ? 'AI Generated' : 'Sample data'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-[360px] flex items-center justify-center">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <Sparkles className="size-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <p className="text-sm font-medium">Generating your chart...</p>
                  <p className="text-xs text-muted-foreground mt-0.5">AI is analyzing your request and creating the visualization</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                  <span className="text-red-500 text-lg">!</span>
                </div>
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  Try again
                </Button>
              </div>
            ) : generatedChart ? (
              <div className="w-full">
                <DynamicChart chart={generatedChart} onDataPointClick={handleDataPointClick} />
              </div>
            ) : (
              <div className="w-full">
                <FallbackPreview />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
