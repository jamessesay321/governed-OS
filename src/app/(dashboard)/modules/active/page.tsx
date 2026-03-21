'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type ActiveModule = {
  id: string;
  name: string;
  slug: string;
  category: string;
  credits: number;
  activatedAt: string;
  lastUsed: string;
  usageCount: number;
  status: 'healthy' | 'warning' | 'error';
};

const ACTIVE_MODULES: ActiveModule[] = [
  {
    id: 'mod-health-check',
    name: 'Financial Health Check',
    slug: 'health-check',
    category: 'Financial Analysis',
    credits: 0,
    activatedAt: '2026-01-15',
    lastUsed: '2026-03-19',
    usageCount: 24,
    status: 'healthy',
  },
  {
    id: 'mod-cash-forecaster',
    name: 'Cash Flow Forecaster',
    slug: 'cash-forecaster',
    category: 'Financial Analysis',
    credits: 5,
    activatedAt: '2026-02-01',
    lastUsed: '2026-03-18',
    usageCount: 18,
    status: 'healthy',
  },
  {
    id: 'mod-investment-readiness',
    name: 'Investment Readiness',
    slug: 'investment-readiness',
    category: 'Financial Analysis',
    credits: 10,
    activatedAt: '2026-02-10',
    lastUsed: '2026-03-15',
    usageCount: 6,
    status: 'warning',
  },
  {
    id: 'mod-budget-builder',
    name: 'Budget Builder',
    slug: 'budget-builder',
    category: 'Forecasting & Planning',
    credits: 5,
    activatedAt: '2026-03-01',
    lastUsed: '2026-03-12',
    usageCount: 3,
    status: 'healthy',
  },
];

const STATUS_CONFIG = {
  healthy: { label: 'Healthy', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500' },
  warning: { label: 'Needs Attention', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500' },
  error: { label: 'Error', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', dot: 'bg-red-500' },
};

export default function ActiveModulesPage() {
  const totalCredits = ACTIVE_MODULES.reduce((sum, m) => sum + m.credits, 0);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/modules" className="hover:text-foreground">Marketplace</Link>
        <span>/</span>
        <span className="text-foreground">Active Modules</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Active Modules</h1>
          <p className="text-muted-foreground">
            {ACTIVE_MODULES.length} modules active &middot; {totalCredits} credits/month
          </p>
        </div>
        <Link
          href="/modules"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse More
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Active Modules</p>
          <p className="mt-1 text-2xl font-bold">{ACTIVE_MODULES.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Monthly Credits</p>
          <p className="mt-1 text-2xl font-bold">{totalCredits}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Uses (This Month)</p>
          <p className="mt-1 text-2xl font-bold">{ACTIVE_MODULES.reduce((s, m) => s + m.usageCount, 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Health Status</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {ACTIVE_MODULES.filter((m) => m.status === 'healthy').length}/{ACTIVE_MODULES.length} OK
          </p>
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-3">
        {ACTIVE_MODULES.map((mod) => {
          const statusConfig = STATUS_CONFIG[mod.status];
          return (
            <div
              key={mod.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{mod.name}</h3>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', statusConfig.bg, statusConfig.color)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mod.category} &middot;{' '}
                    {mod.credits === 0 ? 'Free' : `${mod.credits} credits/mo`} &middot;{' '}
                    Activated {mod.activatedAt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Uses</p>
                  <p className="font-semibold">{mod.usageCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Last Used</p>
                  <p className="font-semibold">{mod.lastUsed}</p>
                </div>
                <Link
                  href={`/modules/${mod.slug}`}
                  className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Open
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
