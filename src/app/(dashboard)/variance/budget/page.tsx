'use client';

import Link from 'next/link';

export default function VarianceBudgetPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/variance" className="text-sm text-muted-foreground hover:text-foreground">&larr; Variance</Link>
      <h2 className="text-2xl font-bold">Budget vs Actual</h2>
      <p className="text-sm text-muted-foreground">Compare your budget against actual performance with AI-powered explanations</p>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Upload a budget or connect your accounting software to compare against actuals.</p>
      </div>
    </div>
  );
}
