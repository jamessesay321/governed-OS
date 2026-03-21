'use client';

import Link from 'next/link';

export default function PlaybookAssessmentPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/playbook" className="text-sm text-muted-foreground hover:text-foreground">&larr; Playbook</Link>
      <h2 className="text-2xl font-bold">Playbook Assessment</h2>
      <p className="text-sm text-muted-foreground">AI-powered assessment of your business with prioritised actions</p>
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Run a Playbook Assessment</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          Our AI analyses your financials and generates a prioritised list of actions with estimated monetary impact.
          This is unique to Advisory OS. No competitor offers this.
        </p>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Run Assessment
        </button>
      </div>
    </div>
  );
}
