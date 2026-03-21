'use client';

import Link from 'next/link';

const TEMPLATES = [
  { name: 'Monthly Board Pack', description: 'P&L, KPIs, commentary, and outlook for board meetings', icon: '📊' },
  { name: 'Investor Update', description: 'Revenue metrics, runway, and growth highlights', icon: '📈' },
  { name: 'Management Report', description: 'Detailed departmental breakdown with variance analysis', icon: '📋' },
  { name: 'Cash Flow Forecast', description: '13-week cash flow projection with scenarios', icon: '💰' },
  { name: 'Annual Review', description: 'Year-end summary with YoY comparisons', icon: '📅' },
  { name: 'Quick Snapshot', description: 'One-page executive summary of key metrics', icon: '⚡' },
];

export default function ReportTemplatesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">&larr; Reports</Link>
      <div>
        <h2 className="text-2xl font-bold">Report Templates</h2>
        <p className="text-sm text-muted-foreground mt-1">Start from a pre-built template or create your own</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
