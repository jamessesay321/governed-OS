'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Lightbulb,
  TrendingDown,
  DollarSign,
  BarChart3,
  Shield,
  ArrowRight,
} from 'lucide-react'

interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: string
  icon: React.ElementType
  action: string
  actionHref: string
}

const recommendations: Recommendation[] = [
  {
    id: 'reduce-debt',
    title: 'Reduce Debt-to-Equity Ratio',
    description:
      'Your leverage ratio of 1.6x is significantly above the industry median of 0.9x. Consider accelerating debt repayments or restructuring existing facilities to bring this closer to target.',
    impact: 'high',
    category: 'Leverage',
    icon: Shield,
    action: 'View Debt Schedule',
    actionHref: '/financials',
  },
  {
    id: 'improve-margins',
    title: 'Investigate Margin Compression',
    description:
      'Gross margin has slipped to 42% versus an industry benchmark of 48%. Review supplier contracts, pricing strategy, and cost of goods to identify quick wins.',
    impact: 'high',
    category: 'Profitability',
    icon: TrendingDown,
    action: 'Analyse Margins',
    actionHref: '/financials',
  },
  {
    id: 'collections',
    title: 'Tighten Accounts Receivable',
    description:
      'Days Sales Outstanding is 38 days compared to the industry benchmark of 32. Implement stricter payment terms or automated follow-ups to improve cash conversion.',
    impact: 'medium',
    category: 'Efficiency',
    icon: DollarSign,
    action: 'Review AR Ageing',
    actionHref: '/financials',
  },
  {
    id: 'growth-strategy',
    title: 'Accelerate Revenue Growth',
    description:
      'Year-on-year revenue growth of 12% trails the industry median of 15%. Explore new customer acquisition channels, upselling opportunities, or product expansion.',
    impact: 'medium',
    category: 'Growth',
    icon: BarChart3,
    action: 'View Growth KPIs',
    actionHref: '/kpis',
  },
  {
    id: 'roa',
    title: 'Improve Return on Assets',
    description:
      'ROA of 8% is slightly below the 10% benchmark. Review underperforming assets and consider whether capital is deployed efficiently across the business.',
    impact: 'low',
    category: 'Profitability',
    icon: Lightbulb,
    action: 'Explore Scenarios',
    actionHref: '/scenarios',
  },
]

const impactStyles: Record<Recommendation['impact'], string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
}

const impactLabels: Record<Recommendation['impact'], string> = {
  high: 'High Impact',
  medium: 'Medium Impact',
  low: 'Low Impact',
}

export default function RecommendationsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; These recommendations are based on
        sample data. Connect your accounts for personalised advice.
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
          AI Recommendations
        </h1>
        <p className="mt-1 text-gray-500">
          Prioritised actions to improve your financial health score.
        </p>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div
            key={rec.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <rec.icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-400">
                    #{idx + 1}
                  </span>
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      impactStyles[rec.impact]
                    )}
                  >
                    {impactLabels[rec.impact]}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {rec.category}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {rec.description}
                </p>
                <Link
                  href={rec.actionHref}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {rec.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
