'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Copy,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/* ------------------------------------------------------------------ */
/*  Mini SVG chart previews                                            */
/* ------------------------------------------------------------------ */

function MiniBarPreview() {
  return (
    <svg viewBox="0 0 80 40" className="w-full h-10" aria-hidden>
      <rect x="4" y="20" width="8" height="20" rx="1" className="fill-primary/20" />
      <rect x="16" y="10" width="8" height="30" rx="1" className="fill-primary/30" />
      <rect x="28" y="15" width="8" height="25" rx="1" className="fill-primary/40" />
      <rect x="40" y="5" width="8" height="35" rx="1" className="fill-primary/50" />
      <rect x="52" y="12" width="8" height="28" rx="1" className="fill-primary/60" />
      <rect x="64" y="8" width="8" height="32" rx="1" className="fill-primary/70" />
    </svg>
  )
}

function MiniLinePreview() {
  return (
    <svg viewBox="0 0 80 40" className="w-full h-10" aria-hidden>
      <polyline
        points="4,30 16,22 28,26 40,14 52,18 64,8 76,12"
        fill="none"
        strokeWidth="2"
        className="stroke-primary/50"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MiniPiePreview() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10 mx-auto" aria-hidden>
      <circle cx="20" cy="20" r="16" className="fill-primary/10" />
      <path d="M20,20 L20,4 A16,16 0 0,1 35,24 Z" className="fill-primary/40" />
      <path d="M20,20 L35,24 A16,16 0 0,1 8,30 Z" className="fill-primary/25" />
      <path d="M20,20 L8,30 A16,16 0 0,1 20,4 Z" className="fill-primary/55" />
    </svg>
  )
}

function MiniAreaPreview() {
  return (
    <svg viewBox="0 0 80 40" className="w-full h-10" aria-hidden>
      <path
        d="M4,35 L16,25 L28,28 L40,15 L52,20 L64,10 L76,14 L76,40 L4,40 Z"
        className="fill-primary/15"
      />
      <polyline
        points="4,35 16,25 28,28 40,15 52,20 64,10 76,14"
        fill="none"
        strokeWidth="1.5"
        className="stroke-primary/40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const previewByType: Record<string, () => React.ReactNode> = {
  Bar: MiniBarPreview,
  Line: MiniLinePreview,
  Pie: MiniPiePreview,
  Area: MiniAreaPreview,
}

/* ------------------------------------------------------------------ */
/*  Demo saved charts                                                  */
/* ------------------------------------------------------------------ */

type SavedChart = {
  id: string
  name: string
  chartType: 'Bar' | 'Pie' | 'Line' | 'Area'
  createdBy: string
  createdAt: string
}

const demoCharts: SavedChart[] = [
  {
    id: '1',
    name: 'Revenue vs Expenses FY25',
    chartType: 'Bar',
    createdBy: 'James Sesay',
    createdAt: 'Mar 12, 2026',
  },
  {
    id: '2',
    name: 'Q1 Expense Breakdown',
    chartType: 'Pie',
    createdBy: 'Amara Osei',
    createdAt: 'Mar 10, 2026',
  },
  {
    id: '3',
    name: 'Cash Flow Trend',
    chartType: 'Area',
    createdBy: 'James Sesay',
    createdAt: 'Mar 8, 2026',
  },
  {
    id: '4',
    name: 'Revenue Waterfall',
    chartType: 'Bar',
    createdBy: 'David Mensah',
    createdAt: 'Mar 5, 2026',
  },
  {
    id: '5',
    name: 'Department Costs',
    chartType: 'Pie',
    createdBy: 'Amara Osei',
    createdAt: 'Feb 28, 2026',
  },
  {
    id: '6',
    name: 'MRR Growth',
    chartType: 'Line',
    createdBy: 'James Sesay',
    createdAt: 'Feb 22, 2026',
  },
]

/* ------------------------------------------------------------------ */
/*  Filter tabs                                                        */
/* ------------------------------------------------------------------ */

const filterOptions = ['All', 'Bar', 'Line', 'Pie', 'Area'] as const
type Filter = (typeof filterOptions)[number]

/* ------------------------------------------------------------------ */
/*  Saved chart card                                                   */
/* ------------------------------------------------------------------ */

function SavedChartCard({ chart }: { chart: SavedChart }) {
  const Preview = previewByType[chart.chartType] ?? MiniBarPreview

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="space-y-3">
        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{chart.name}</h3>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {chart.chartType}
          </Badge>
        </div>

        {/* Mini preview */}
        <div className="rounded-md bg-muted/40 p-2">
          <Preview />
        </div>

        {/* Created by */}
        <p className="text-xs text-muted-foreground">
          Created by{' '}
          <span className="font-medium text-foreground">{chart.createdBy}</span>
          {' '}&middot;{' '}{chart.createdAt}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <ExternalLink className="size-3" />
            Open
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Copy className="size-3" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function SavedChartsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All')

  const filteredCharts =
    activeFilter === 'All'
      ? demoCharts
      : demoCharts.filter((c) => c.chartType === activeFilter)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="size-8" asChild>
            <Link href="/graphs">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saved Charts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse and manage your previously saved visualisations.
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 border-b pb-2">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Chart grid */}
      {filteredCharts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCharts.map((chart) => (
            <SavedChartCard key={chart.id} chart={chart} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="size-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold">No charts found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            No saved charts match the selected filter.
          </p>
        </div>
      )}
    </div>
  )
}
