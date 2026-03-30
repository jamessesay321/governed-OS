'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, ArrowRight } from 'lucide-react';
import type { BenchmarkRow } from './page';

interface BenchmarksClientProps {
  benchmarks: BenchmarkRow[];
  hasData: boolean;
}

function TrendIcon({ trend }: { trend: BenchmarkRow['trend'] }) {
  if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function comparisonBadge(yours: number, industry: number, metric: string) {
  // For metrics where lower is better
  const lowerIsBetter = ['Expense Ratio'];
  const isBetter = lowerIsBetter.includes(metric)
    ? yours <= industry
    : yours >= industry;

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
  );
}

export function BenchmarksClient({ benchmarks, hasData }: BenchmarksClientProps) {
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
            Industry Benchmarks
          </h1>
          <p className="mt-1 text-gray-500">
            See how your business compares against industry medians.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Financial Data</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect your accounting software to see real benchmark comparisons.
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
  );
}
