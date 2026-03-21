'use client';

import Link from 'next/link';

export default function DashboardAlertsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">&larr; Dashboard</Link>
      <div>
        <h2 className="text-2xl font-bold">Alerts & Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">KPI threshold alerts and important notifications</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">No alerts configured yet. Set KPI targets to receive threshold alerts.</p>
        <Link href="/kpi/targets" className="inline-block mt-3 text-sm text-primary font-medium hover:underline">
          Set up KPI targets &rarr;
        </Link>
      </div>
    </div>
  );
}
