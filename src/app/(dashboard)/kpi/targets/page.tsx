'use client';

import Link from 'next/link';

export default function KPITargetsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/kpi" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; KPIs
        </Link>
      </div>
      <div>
        <h2 className="text-2xl font-bold">KPI Targets</h2>
        <p className="text-sm text-muted-foreground mt-1">Set targets for each KPI to track progress</p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Set Your KPI Targets</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          Define target values for your key metrics. Advisory OS will track your progress and alert you when KPIs cross thresholds.
        </p>
        <p className="text-xs text-muted-foreground">Connect your accounts first to see available KPIs</p>
      </div>
    </div>
  );
}
