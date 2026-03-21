'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

interface Benchmark {
  metric: string
  yours: number
  industry: number
  unit: string
  trend: 'up' | 'down' | 'flat'
}

const benchmarks: Benchmark[] = [
  { metric: 'Current Ratio', yours: 1.8, industry: 1.5, unit: 'x', trend: 'up' },
  { metric: 'Gross Margin', yours: 42, industry: 48, unit: '%', trend: 'down' },
  { metric: 'Net Profit Margin', yours: 11, industry: 14, unit: '%', trend: 'flat' },
  { metric: 'Debt-to-Equity', yours: 1.6, industry: 0.9, unit: 'x', trend: 'down' },
  { metric: 'Revenue Growth (YoY)', yours: 12, industry: 15, unit: '%', trend: 'up' },
  { metric: 'Operating Expense Ratio', yours: 31, industry: 34, unit: '%', trend: 'up' },
  { metric: 'Return on Assets', yours: 8, industry: 10, unit: '%', trend: 'flat' },
  { metric: 'Days Sales Outstanding', yours: 38, industry: 32, unit: 'days', trend: 'down' },
]

function TrendIcon({ trend }: { trend: Benchmark['trend'] }) {
  if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-emerald-500" />
  if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-gray-400" />
}

function comparisonBadge(yours: number, industry: number, metric: string) {
  // For metrics where lower is better
  const lowerIsBetter = ['Debt-to-Equity', 'Operating Expense Ratio', 'Days Sales Outstanding']
  const isBetter = lowerIsBetter.includes(metric)
    ? yours <= industry
    : yours >= industry

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        isBetter
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-700'
      )}
    >
      {isBetter ? 'Above' : 'Below'}
    </span>
  )
}

export default function BenchmarksPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; Connect your accounting software to see
        real comparisons.
      </div>

      {/* Back Link */}
      <Link
        href="/health"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Health Score
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Industry Benchmarks
        </h1>
        <p className="mt-1 text-gray-500">
          See how your business compares against industry medians.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 font-semibold text-gray-700">Metric</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-700">
                Yours
              </th>
              <th className="px-5 py-3 text-right font-semibold text-gray-700">
                Industry
              </th>
              <th className="px-5 py-3 text-center font-semibold text-gray-700">
                Trend
              </th>
              <th className="px-5 py-3 text-center font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {benchmarks.map((b) => (
              <tr key={b.metric} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">
                  {b.metric}
                </td>
                <td className="px-5 py-4 text-right font-semibold text-gray-900">
                  {b.yours}
                  {b.unit}
                </td>
                <td className="px-5 py-4 text-right text-gray-500">
                  {b.industry}
                  {b.unit}
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="inline-flex justify-center">
                    <TrendIcon trend={b.trend} />
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  {comparisonBadge(b.yours, b.industry, b.metric)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Above benchmark
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Below benchmark
        </div>
      </div>
    </div>
  )
}
