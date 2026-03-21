'use client';

import Link from 'next/link';

export default function VarianceDrillDownPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/variance" className="text-sm text-muted-foreground hover:text-foreground">&larr; Variance</Link>
      <h2 className="text-2xl font-bold">Variance Drill-Down</h2>
      <p className="text-sm text-muted-foreground">Click any variance to break down by department, account, or entity</p>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Select a variance from the main analysis to drill down into the detail.</p>
      </div>
    </div>
  );
}
