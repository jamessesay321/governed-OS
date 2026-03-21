'use client';

import Link from 'next/link';

export default function PlaybookHistoryPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/playbook" className="text-sm text-muted-foreground hover:text-foreground">&larr; Playbook</Link>
      <h2 className="text-2xl font-bold">Assessment History</h2>
      <p className="text-sm text-muted-foreground">Track how your actions and scores have changed over time</p>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No assessments run yet. Run your first playbook assessment to start tracking progress.</p>
      </div>
    </div>
  );
}
