'use client'

import Link from 'next/link'
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Users,
  ShoppingCart,
  Settings,
  Plus,
  BookmarkCheck,
  ArrowUpDown,
  Layers,
  Target,
  DollarSign,
  Megaphone,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

/* ------------------------------------------------------------------ */
/*  Chart template definitions                                         */
/* ------------------------------------------------------------------ */

type ChartTemplate = {
  title: string
  description: string
  icon: React.ReactNode
  chartType: string
}

const categories: Record<string, { label: string; icon: React.ReactNode; templates: ChartTemplate[] }> = {
  finance: {
    label: 'Finance',
    icon: <DollarSign className="size-4" />,
    templates: [
      {
        title: 'Revenue Waterfall',
        description: 'Visualise revenue build-up from gross to net across adjustment categories.',
        icon: <BarChart3 className="size-5 text-emerald-500" />,
        chartType: 'Waterfall',
      },
      {
        title: 'P&L Bridge',
        description: 'Bridge chart showing the path from revenue to net profit.',
        icon: <ArrowUpDown className="size-5 text-blue-500" />,
        chartType: 'Waterfall',
      },
      {
        title: 'Cash Flow Trend',
        description: 'Monthly operating, investing, and financing cash flows over time.',
        icon: <TrendingUp className="size-5 text-cyan-500" />,
        chartType: 'Area',
      },
      {
        title: 'Expense Breakdown',
        description: 'Proportional split of operating expenses by category.',
        icon: <PieChart className="size-5 text-orange-500" />,
        chartType: 'Pie',
      },
      {
        title: 'Gross Margin Over Time',
        description: 'Track gross margin percentage month-over-month.',
        icon: <LineChart className="size-5 text-violet-500" />,
        chartType: 'Line',
      },
      {
        title: 'AR/AP Ageing',
        description: 'Accounts receivable and payable ageing buckets side by side.',
        icon: <BarChart3 className="size-5 text-rose-500" />,
        chartType: 'Bar',
      },
    ],
  },
  marketing: {
    label: 'Marketing',
    icon: <Megaphone className="size-4" />,
    templates: [
      {
        title: 'CAC Trend',
        description: 'Customer acquisition cost trend over the last 12 months.',
        icon: <TrendingUp className="size-5 text-pink-500" />,
        chartType: 'Line',
      },
      {
        title: 'Channel ROI',
        description: 'Return on investment across marketing channels.',
        icon: <BarChart3 className="size-5 text-amber-500" />,
        chartType: 'Bar',
      },
      {
        title: 'Conversion Funnel',
        description: 'Visitor to customer conversion at each funnel stage.',
        icon: <Layers className="size-5 text-indigo-500" />,
        chartType: 'Bar',
      },
      {
        title: 'Ad Spend vs Revenue',
        description: 'Compare advertising expenditure against attributed revenue.',
        icon: <LineChart className="size-5 text-teal-500" />,
        chartType: 'Combo',
      },
    ],
  },
  people: {
    label: 'People',
    icon: <Users className="size-4" />,
    templates: [
      {
        title: 'Headcount Growth',
        description: 'Full-time equivalent headcount growth over time.',
        icon: <TrendingUp className="size-5 text-green-500" />,
        chartType: 'Area',
      },
      {
        title: 'Revenue per Employee',
        description: 'Revenue efficiency metric tracked monthly.',
        icon: <BarChart3 className="size-5 text-sky-500" />,
        chartType: 'Bar',
      },
      {
        title: 'Department Cost Breakdown',
        description: 'Total cost distribution across departments.',
        icon: <PieChart className="size-5 text-purple-500" />,
        chartType: 'Pie',
      },
    ],
  },
  sales: {
    label: 'Sales',
    icon: <ShoppingCart className="size-4" />,
    templates: [
      {
        title: 'Pipeline Waterfall',
        description: 'Sales pipeline progression from lead to close.',
        icon: <BarChart3 className="size-5 text-emerald-500" />,
        chartType: 'Waterfall',
      },
      {
        title: 'Win Rate by Quarter',
        description: 'Quarterly deal win-rate percentage.',
        icon: <Target className="size-5 text-blue-500" />,
        chartType: 'Bar',
      },
      {
        title: 'Revenue by Client',
        description: 'Top clients ranked by total revenue contribution.',
        icon: <PieChart className="size-5 text-orange-500" />,
        chartType: 'Pie',
      },
      {
        title: 'MRR Growth',
        description: 'Monthly recurring revenue growth trajectory.',
        icon: <TrendingUp className="size-5 text-violet-500" />,
        chartType: 'Line',
      },
    ],
  },
  operations: {
    label: 'Operations',
    icon: <Settings className="size-4" />,
    templates: [
      {
        title: 'Utilisation Rate',
        description: 'Team utilisation rate against capacity targets.',
        icon: <Activity className="size-5 text-cyan-500" />,
        chartType: 'Line',
      },
      {
        title: 'Project Margin',
        description: 'Profit margin per project or engagement.',
        icon: <BarChart3 className="size-5 text-rose-500" />,
        chartType: 'Bar',
      },
      {
        title: 'Capacity vs Demand',
        description: 'Available capacity overlaid with incoming demand.',
        icon: <Layers className="size-5 text-amber-500" />,
        chartType: 'Area',
      },
    ],
  },
}

/* ------------------------------------------------------------------ */
/*  Mini SVG chart previews                                            */
/* ------------------------------------------------------------------ */

function MiniBarPreview() {
  return (
    <svg viewBox="0 0 80 40" className="w-full h-10 mt-2" aria-hidden>
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
    <svg viewBox="0 0 80 40" className="w-full h-10 mt-2" aria-hidden>
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
    <svg viewBox="0 0 40 40" className="w-10 h-10 mt-2 mx-auto" aria-hidden>
      <circle cx="20" cy="20" r="16" className="fill-primary/10" />
      <path d="M20,20 L20,4 A16,16 0 0,1 35,24 Z" className="fill-primary/40" />
      <path d="M20,20 L35,24 A16,16 0 0,1 8,30 Z" className="fill-primary/25" />
      <path d="M20,20 L8,30 A16,16 0 0,1 20,4 Z" className="fill-primary/55" />
    </svg>
  )
}

function MiniAreaPreview() {
  return (
    <svg viewBox="0 0 80 40" className="w-full h-10 mt-2" aria-hidden>
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

function MiniWaterfallPreview() {
  return (
    <svg viewBox="0 0 80 40" className="w-full h-10 mt-2" aria-hidden>
      <rect x="4" y="8" width="8" height="32" rx="1" className="fill-emerald-400/40" />
      <rect x="16" y="8" width="8" height="10" rx="1" className="fill-rose-400/40" />
      <rect x="28" y="12" width="8" height="8" rx="1" className="fill-rose-400/30" />
      <rect x="40" y="14" width="8" height="26" rx="1" className="fill-emerald-400/30" />
      <rect x="52" y="10" width="8" height="6" rx="1" className="fill-rose-400/25" />
      <rect x="64" y="14" width="8" height="26" rx="1" className="fill-primary/50" />
    </svg>
  )
}

function MiniComboPreview() {
  return (
    <svg viewBox="0 0 80 40" className="w-full h-10 mt-2" aria-hidden>
      <rect x="6" y="20" width="6" height="20" rx="1" className="fill-primary/25" />
      <rect x="18" y="14" width="6" height="26" rx="1" className="fill-primary/35" />
      <rect x="30" y="18" width="6" height="22" rx="1" className="fill-primary/30" />
      <rect x="42" y="10" width="6" height="30" rx="1" className="fill-primary/40" />
      <rect x="54" y="16" width="6" height="24" rx="1" className="fill-primary/35" />
      <rect x="66" y="12" width="6" height="28" rx="1" className="fill-primary/45" />
      <polyline
        points="9,18 21,12 33,16 45,8 57,14 69,10"
        fill="none"
        strokeWidth="1.5"
        className="stroke-orange-400"
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
  Waterfall: MiniWaterfallPreview,
  Combo: MiniComboPreview,
}

/* ------------------------------------------------------------------ */
/*  Template card                                                      */
/* ------------------------------------------------------------------ */

function TemplateCard({ template }: { template: ChartTemplate }) {
  const Preview = previewByType[template.chartType] ?? MiniBarPreview

  return (
    <Card className="group relative cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {template.icon}
            <h3 className="text-sm font-semibold leading-tight">{template.title}</h3>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {template.chartType}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {template.description}
        </p>
        <Preview />
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */

export function GraphStudioClient() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Graph Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore chart templates or build custom visualisations with natural language.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/graphs/saved">
              <BookmarkCheck className="size-4" />
              Saved Charts
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/graphs/builder">
              <Plus className="size-4" />
              New Graph
            </Link>
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="finance">
        <TabsList variant="line" className="w-full justify-start">
          {Object.entries(categories).map(([key, cat]) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              {cat.icon}
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(categories).map(([key, cat]) => (
          <TabsContent key={key} value={key} className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cat.templates.map((tpl) => (
                <TemplateCard key={tpl.title} template={tpl} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
