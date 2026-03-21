'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  Stethoscope,
  ArrowRight,
} from 'lucide-react'

interface Category {
  name: string
  score: number
  status: 'green' | 'amber' | 'red'
  trend: 'up' | 'down' | 'flat'
  summary: string
}

const overallScore = 72

const categories: Category[] = [
  {
    name: 'Liquidity',
    score: 82,
    status: 'green',
    trend: 'up',
    summary: 'Strong cash position with healthy current ratio.',
  },
  {
    name: 'Profitability',
    score: 65,
    status: 'amber',
    trend: 'down',
    summary: 'Margins compressed slightly versus prior quarter.',
  },
  {
    name: 'Efficiency',
    score: 78,
    status: 'green',
    trend: 'up',
    summary: 'Operational costs trending down as a share of revenue.',
  },
  {
    name: 'Growth',
    score: 61,
    status: 'amber',
    trend: 'flat',
    summary: 'Revenue growth steady but below industry median.',
  },
  {
    name: 'Leverage',
    score: 45,
    status: 'red',
    trend: 'down',
    summary: 'Debt-to-equity ratio elevated; monitor repayment schedule.',
  },
]

const statusColors: Record<Category['status'], string> = {
  green: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-600 bg-amber-50 border-amber-200',
  red: 'text-red-600 bg-red-50 border-red-200',
}

const statusDotColors: Record<Category['status'], string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

function TrendIcon({ trend }: { trend: Category['trend'] }) {
  if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-emerald-500" />
  if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-gray-400" />
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 55) return 'text-amber-600'
  return 'text-red-600'
}

function ringColor(score: number) {
  if (score >= 75) return 'stroke-emerald-500'
  if (score >= 55) return 'stroke-amber-500'
  return 'stroke-red-500'
}

export default function HealthPage() {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (overallScore / 100) * circumference

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; Connect your accounting software to see
        real scores.
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Financial Health Score
          </h1>
          <p className="mt-1 text-gray-500">
            A diagnostic snapshot of your business finances.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/health/benchmarks"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Benchmarks
          </Link>
          <Link
            href="/health/recommendations"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Recommendations
          </Link>
        </div>
      </div>

      {/* Score Circle */}
      <div className="flex justify-center">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              className={ringColor(overallScore)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="text-center">
            <span className={cn('text-4xl font-bold', scoreColor(overallScore))}>
              {overallScore}
            </span>
            <span className="block text-sm text-gray-400">/100</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Score Breakdown
        </h2>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className={cn(
                'flex items-center gap-4 rounded-xl border p-4',
                statusColors[cat.status]
              )}
            >
              <div className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', statusDotColors[cat.status])} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cat.name}</span>
                  <TrendIcon trend={cat.trend} />
                </div>
                <p className="mt-0.5 text-sm opacity-80">{cat.summary}</p>
              </div>
              <span className={cn('text-xl font-bold', scoreColor(cat.score))}>
                {cat.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">
              Health Check vs. Playbook
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              This is different from Playbook. The Financial Health Check{' '}
              <strong>diagnoses</strong> the current state of your finances.
              Playbook <strong>prescribes actions</strong> to improve them. Think
              of Health as the doctor&rsquo;s examination and Playbook as the
              treatment plan.
            </p>
            <Link
              href="/playbook"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              <Stethoscope className="h-4 w-4" />
              Go to Playbook
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
