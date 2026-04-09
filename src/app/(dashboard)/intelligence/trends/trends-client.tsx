'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { formatPercent } from '@/lib/formatting/currency';
import type { TrendItem } from './page';

interface TrendsClientProps {
  trends: TrendItem[];
  hasData: boolean;
}

const metricIcons: Record<TrendItem['metricType'], typeof DollarSign> = {
  revenue: DollarSign,
  margin: Percent,
  expense: BarChart3,
  profit: DollarSign,
};

const metricLabels: Record<TrendItem['metricType'], string> = {
  revenue: 'Revenue',
  margin: 'Margin',
  expense: 'Expenses',
  profit: 'Net Profit',
};

function DirectionIcon({ direction }: { direction: TrendItem['direction'] }) {
  if (direction === 'up') return <TrendingUp className="h-6 w-6 text-emerald-600" />;
  if (direction === 'down') return <TrendingDown className="h-6 w-6 text-rose-600" />;
  return <Activity className="h-6 w-6 text-slate-600" />;
}

function directionBg(direction: TrendItem['direction']) {
  if (direction === 'up') return 'bg-emerald-100 dark:bg-emerald-950';
  if (direction === 'down') return 'bg-rose-100 dark:bg-rose-950';
  return 'bg-slate-100 dark:bg-slate-950';
}

function directionBorder(direction: TrendItem['direction']) {
  if (direction === 'up') return 'border-l-emerald-500';
  if (direction === 'down') return 'border-l-rose-500';
  return 'border-l-slate-400';
}

function changePillClasses(direction: TrendItem['direction']) {
  if (direction === 'up')
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400';
  if (direction === 'down')
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400';
  return 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-400';
}

function ChangeArrow({ direction }: { direction: TrendItem['direction'] }) {
  if (direction === 'up') return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (direction === 'down') return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

export function TrendsClient({ trends, hasData }: TrendsClientProps) {
  if (!hasData) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Intelligence
        </Link>
        <h2 className="text-2xl font-bold">Trend Analysis</h2>
        <p className="text-sm text-muted-foreground">
          AI-identified trends across your financial and operational data
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No Financial Data</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Connect your accounting software to see real trends.
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

  if (trends.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Intelligence
        </Link>
        <h2 className="text-2xl font-bold">Trend Analysis</h2>
        <p className="text-sm text-muted-foreground">
          AI-identified trends across your financial and operational data
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Insufficient Data</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            At least 2 periods of data are needed to identify trends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Intelligence
      </Link>
      <div>
        <h2 className="text-2xl font-bold">Trend Analysis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-identified trends across your financial and operational data
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center dark:bg-emerald-950/50">
          <TrendingUp className="mx-auto h-5 w-5 text-emerald-600" />
          <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {trends.filter((t) => t.direction === 'up').length}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">Improving</p>
        </div>
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-center dark:bg-rose-950/50">
          <TrendingDown className="mx-auto h-5 w-5 text-rose-600" />
          <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-400">
            {trends.filter((t) => t.direction === 'down').length}
          </p>
          <p className="text-xs text-rose-600 dark:text-rose-500">Declining</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-center dark:bg-slate-900/50">
          <Activity className="mx-auto h-5 w-5 text-slate-500" />
          <p className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-300">
            {trends.filter((t) => t.direction === 'flat').length}
          </p>
          <p className="text-xs text-slate-500">Stable</p>
        </div>
      </div>

      {/* Trend cards */}
      <div className="space-y-4">
        {trends.map((t, i) => {
          const MetricIcon = metricIcons[t.metricType];
          return (
            <div
              key={i}
              className={`rounded-xl border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md ${directionBorder(t.direction)}`}
            >
              <div className="flex items-center gap-4 p-5">
                {/* Left: directional icon */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${directionBg(t.direction)}`}
                >
                  <DirectionIcon direction={t.direction} />
                </div>

                {/* Center: title, description, period */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-tight">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.detail}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground/70">
                    Over {t.periodCount} {t.periodCount === 1 ? 'period' : 'periods'}
                  </p>
                </div>

                {/* Right: magnitude badge + metric pill */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {/* Percentage change pill */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${changePillClasses(t.direction)}`}
                  >
                    <ChangeArrow direction={t.direction} />
                    {t.direction === 'flat' ? '0%' : formatPercent(Math.abs(Number(t.percentChange)))}
                  </span>

                  {/* Value comparison */}
                  <span className="text-xs text-muted-foreground">
                    {t.fromValue} &rarr; {t.toValue}
                  </span>

                  {/* Metric type pill */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <MetricIcon className="h-3 w-3" />
                    {metricLabels[t.metricType]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
