'use client';

import Link from 'next/link';

export default function AIOutputsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/vault" className="text-sm text-muted-foreground hover:text-foreground">&larr; Knowledge Vault</Link>
      <div>
        <h2 className="text-2xl font-bold">AI Outputs</h2>
        <p className="text-sm text-muted-foreground mt-1">Every AI-generated report, analysis, and insight is automatically archived here with full provenance</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No AI Outputs Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          When you generate reports, run scenarios, or get AI insights, they&apos;ll be automatically stored here
          with full provenance tracking — including the AI model used, data version, and prompt.
        </p>
      </div>
    </div>
  );
}
