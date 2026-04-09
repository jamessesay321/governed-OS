'use client';

import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  BarChart3,
  Zap,
  Users,
  Landmark,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useCurrency } from '@/components/providers/currency-context';
import { formatPercent } from '@/lib/formatting/currency';
import type { Anomaly, AnomalyCategory } from './page';

interface AnomaliesClientProps {
  anomalies: Anomaly[];
  hasData: boolean;
}

const categoryIconMap: Record<AnomalyCategory, React.ElementType> = {
  revenue: DollarSign,
  expense: Receipt,
  cost_of_sales: BarChart3,
  payroll: Users,
  tax: Landmark,
  new_activity: Zap,
  general: Sparkles,
};

const categoryLabelMap: Record<AnomalyCategory, string> = {
  revenue: 'Revenue',
  expense: 'Expense',
  cost_of_sales: 'Cost of Sales',
  payroll: 'Payroll',
  tax: 'Tax',
  new_activity: 'New Activity',
  general: 'General',
};

const severityConfig = {
  high: {
    badge: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    border: 'border-l-red-500',
    iconBg: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
    label: 'High',
    Icon: AlertTriangle,
  },
  medium: {
    badge: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    label: 'Medium',
    Icon: ShieldAlert,
  },
  low: {
    badge: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    label: 'Low',
    Icon: AlertCircle,
  },
};

function ChangePercentBadge({ changePercent, direction }: { changePercent: number; direction: 'up' | 'down' | 'new' }) {
  const absChange = formatPercent(Math.abs(changePercent));

  if (direction === 'new') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
        <Zap className="h-3 w-3" />
        New
      </span>
    );
  }

  const isUp = direction === 'up';
  const isConcerning = Math.abs(changePercent) > 75;
  const bgClass = isConcerning
    ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${bgClass}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '\u2191' : '\u2193'} {absChange}
    </span>
  );
}

export function AnomaliesClient({ anomalies, hasData }: AnomaliesClientProps) {
  const { format } = useCurrency();

  if (!hasData) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Intelligence
        </Link>
        <h2 className="text-2xl font-bold">Anomaly Detection</h2>
        <p className="text-sm text-muted-foreground">
          AI identifies unusual patterns, outliers, and trend breaks in your financial data
        </p>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No Financial Data</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Connect your accounting software to detect real anomalies.
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

  // Summary counts
  const highCount = anomalies.filter((a) => a.severity === 'high').length;
  const mediumCount = anomalies.filter((a) => a.severity === 'medium').length;
  const lowCount = anomalies.filter((a) => a.severity === 'low').length;

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Intelligence
      </Link>
      <div>
        <h2 className="text-2xl font-bold">Anomaly Detection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI identifies unusual patterns, outliers, and trend breaks in your financial data
        </p>
      </div>

      {anomalies.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-emerald-900 dark:text-emerald-100">No Anomalies Detected</h3>
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
            All accounts are within normal variation ranges between the latest two periods.
          </p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{highCount}</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">High Severity</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{mediumCount}</p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Medium Severity</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{lowCount}</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Low Severity</p>
              </div>
            </div>
          </div>

          {/* Anomaly cards */}
          <div className="space-y-3">
            {anomalies.map((a, i) => {
              const sev = severityConfig[a.severity];
              const CategoryIcon = categoryIconMap[a.category] ?? Sparkles;

              return (
                <div
                  key={i}
                  className={`group relative overflow-hidden rounded-lg border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md ${sev.border}`}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Left: category icon in circular background */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${sev.iconBg}`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>

                    {/* Center: title, description, category pill */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold leading-tight">{a.title}</h3>
                        <ChangePercentBadge changePercent={a.changePercent} direction={a.direction} />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {a.detail}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          <CategoryIcon className="h-2.5 w-2.5" />
                          {categoryLabelMap[a.category]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{a.accountName}</span>
                      </div>
                    </div>

                    {/* Right: impact metric + severity badge */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sev.badge}`}>
                        <sev.Icon className="h-3 w-3" />
                        {sev.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {a.impact}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: investigate hint */}
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      Click to investigate
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
