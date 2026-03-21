'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Building2,
  Link2,
  LayoutDashboard,
  BarChart3,
  FileText,
  ArrowRight,
} from 'lucide-react'

interface Step {
  id: string
  number: number
  title: string
  description: string
  href: string
  buttonLabel: string
  icon: React.ElementType
}

const steps: Step[] = [
  {
    id: 'profile',
    number: 1,
    title: 'Set Up Your Business Profile',
    description:
      'Tell us about your business so we can tailor insights and recommendations to your industry, size, and goals.',
    href: '/interview',
    buttonLabel: 'Start Interview',
    icon: Building2,
  },
  {
    id: 'accounting',
    number: 2,
    title: 'Connect Your Accounting Software',
    description:
      'Link your Xero or other accounting platform to automatically import financial data for analysis.',
    href: '/integrations',
    buttonLabel: 'Connect Integration',
    icon: Link2,
  },
  {
    id: 'dashboard',
    number: 3,
    title: 'Review Your Dashboard',
    description:
      'Explore the main dashboard to see an overview of your key financial metrics and business health.',
    href: '/dashboard',
    buttonLabel: 'Open Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'kpis',
    number: 4,
    title: 'Explore Your KPIs',
    description:
      'Dive into your Key Performance Indicators to understand how your business is tracking against benchmarks.',
    href: '/kpis',
    buttonLabel: 'View KPIs',
    icon: BarChart3,
  },
  {
    id: 'report',
    number: 5,
    title: 'Run Your First Report',
    description:
      'Generate an AI-powered financial narrative report to share with stakeholders or keep for your records.',
    href: '/reports',
    buttonLabel: 'Create Report',
    icon: FileText,
  },
]

export default function GettingStartedPage() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  function toggleStep(id: string) {
    setCompletedSteps((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const completedCount = completedSteps.length
  const progressPercent = (completedCount / steps.length) * 100

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-8">
      {/* Back Link */}
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Getting Started
        </h1>
        <p className="mt-1 text-gray-500">
          Follow these steps to set up Grove for your business.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {completedCount} of {steps.length} steps completed
          </span>
          <span className="text-gray-500">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full bg-blue-600 transition-all duration-500',
              completedCount === steps.length && 'bg-emerald-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const done = completedSteps.includes(step.id)
          return (
            <div
              key={step.id}
              className={cn(
                'rounded-xl border bg-white p-5 shadow-sm transition-colors',
                done ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Step Number / Check */}
                <button
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  className="mt-0.5 flex-shrink-0"
                  aria-label={done ? `Mark step ${step.number} incomplete` : `Mark step ${step.number} complete`}
                >
                  {done ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-300 text-xs font-bold text-gray-400">
                      {step.number}
                    </div>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <step.icon className={cn('h-4 w-4', done ? 'text-emerald-500' : 'text-gray-400')} />
                    <h3
                      className={cn(
                        'font-semibold',
                        done ? 'text-gray-400 line-through' : 'text-gray-900'
                      )}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className={cn('mt-1 text-sm', done ? 'text-gray-400' : 'text-gray-500')}>
                    {step.description}
                  </p>
                  {!done && (
                    <Link
                      href={step.href}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      {step.buttonLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
