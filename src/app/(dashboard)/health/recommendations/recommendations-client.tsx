'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Lightbulb,
  TrendingDown,
  DollarSign,
  BarChart3,
  Shield,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import type { Recommendation } from './page';

interface RecommendationsClientProps {
  recommendations: Recommendation[];
  hasData: boolean;
}

const iconMap: Record<Recommendation['iconName'], React.ElementType> = {
  shield: Shield,
  'trending-down': TrendingDown,
  'dollar-sign': DollarSign,
  'bar-chart': BarChart3,
  lightbulb: Lightbulb,
};

const impactStyles: Record<Recommendation['impact'], string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

const impactLabels: Record<Recommendation['impact'], string> = {
  high: 'High Impact',
  medium: 'Medium Impact',
  low: 'Low Impact',
};

export function RecommendationsClient({ recommendations, hasData }: RecommendationsClientProps) {
  if (!hasData) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-8">
        <Link
          href="/health"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Health Score
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            AI Recommendations
          </h1>
          <p className="mt-1 text-gray-500">
            Prioritised actions to improve your financial health score.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Financial Data</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect your accounting software to get personalised recommendations.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Connect Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-8">
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
        {recommendations.map((rec, idx) => {
          const Icon = iconMap[rec.iconName];
          return (
            <div
              key={rec.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <Icon className="h-5 w-5" />
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
          );
        })}
      </div>
    </div>
  );
}
