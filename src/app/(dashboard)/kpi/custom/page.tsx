'use client';

import Link from 'next/link';

export default function CustomKPIsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/kpi" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; KPIs
        </Link>
      </div>
      <div>
        <h2 className="text-2xl font-bold">Custom KPIs</h2>
        <p className="text-sm text-muted-foreground mt-1">Create your own KPI formulas</p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Create Custom KPIs</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          Beyond the 30+ pre-built KPIs, create your own using custom formulas.
          Define calculations based on any financial data in your account.
        </p>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Create KPI
        </button>
      </div>
    </div>
  );
}
