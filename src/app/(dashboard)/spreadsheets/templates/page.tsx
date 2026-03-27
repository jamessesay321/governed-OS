'use client'

import Link from 'next/link'
import {
  FileSpreadsheet,
  TrendingUp,
  GitCompare,
  Calculator,
  DollarSign,
  BarChart3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/* ------------------------------------------------------------------ */
/*  Template definitions                                               */
/* ------------------------------------------------------------------ */

const templates = [
  {
    slug: 'pnl',
    name: 'P&L Template',
    description:
      'Standard profit and loss layout with revenue, COGS, and expense categories',
    icon: FileSpreadsheet,
    tag: 'Income',
  },
  {
    slug: 'cashflow',
    name: 'Cash Flow Forecast',
    description:
      '12-month cash flow projection with opening and closing balances',
    icon: TrendingUp,
    tag: 'Forecasting',
  },
  {
    slug: 'budget',
    name: 'Budget vs Actual',
    description:
      'Side-by-side budget comparison with variance calculations',
    icon: GitCompare,
    tag: 'Budgeting',
  },
  {
    slug: 'financial-model',
    name: 'Financial Model',
    description:
      'Three-statement model with assumptions and projections',
    icon: BarChart3,
    tag: 'Modelling',
  },
  {
    slug: 'revenue',
    name: 'Revenue Projections',
    description:
      'Monthly revenue forecast with growth rate scenarios',
    icon: DollarSign,
    tag: 'Revenue',
  },
  {
    slug: 'unit-economics',
    name: 'Unit Economics Calculator',
    description:
      'CAC, LTV, payback period, and margin analysis',
    icon: Calculator,
    tag: 'Metrics',
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SpreadsheetTemplatesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Spreadsheet Templates
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Start with a pre-built financial template and customise it in the workspace.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const Icon = t.icon
          return (
            <Card
              key={t.slug}
              className="group flex flex-col justify-between transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 text-[10px]"
                  >
                    {t.tag}
                  </Badge>
                </div>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {t.description}
                </CardDescription>
              </CardHeader>

              <CardFooter>
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Link href={`/spreadsheets/workspace?template=${t.slug}`}>
                    Use Template
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
