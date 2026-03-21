'use client';

import Link from 'next/link';

export default function InterviewTeamPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <Link href="/interview" className="text-sm text-muted-foreground hover:text-foreground">&larr; Business Profile</Link>
      <h2 className="text-2xl font-bold">Team Information</h2>
      <p className="text-sm text-muted-foreground">Add information about your key team members</p>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Team profile information coming soon.</p>
      </div>
    </div>
  );
}
