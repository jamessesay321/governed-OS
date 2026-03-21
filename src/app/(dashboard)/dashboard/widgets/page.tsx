'use client';

import Link from 'next/link';

export default function DashboardWidgetsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">&larr; Dashboard</Link>
      <div>
        <h2 className="text-2xl font-bold">Dashboard Widgets</h2>
        <p className="text-sm text-muted-foreground mt-1">Customise your dashboard by adding and arranging widgets</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { name: 'Revenue Chart', desc: 'Monthly revenue trend line' },
          { name: 'P&L Summary', desc: 'Key P&L metrics at a glance' },
          { name: 'Cash Position', desc: 'Current cash balance and runway' },
          { name: 'KPI Gauges', desc: 'Top KPIs as gauge charts' },
          { name: 'Expense Breakdown', desc: 'Pie chart of expense categories' },
          { name: 'Recent Alerts', desc: 'Latest threshold alerts' },
          { name: 'AR Ageing', desc: 'Accounts receivable ageing buckets' },
          { name: 'Revenue Waterfall', desc: 'Revenue to net profit bridge' },
        ].map((w) => (
          <div key={w.name} className="rounded-lg border bg-card p-4 hover:border-primary/50 cursor-pointer transition-all">
            <h3 className="text-sm font-semibold">{w.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{w.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
