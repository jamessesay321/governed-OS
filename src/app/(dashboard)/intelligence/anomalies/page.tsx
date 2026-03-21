'use client';

import Link from 'next/link';

export default function AnomaliesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">&larr; Intelligence</Link>
      <h2 className="text-2xl font-bold">Anomaly Detection</h2>
      <p className="text-sm text-muted-foreground">AI identifies unusual patterns, outliers, and trend breaks in your financial data</p>
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">Sample anomalies shown below. Connect your accounts to detect real anomalies.</p>
      </div>
      <div className="space-y-3">
        {[
          { title: 'Unusual spike in Travel expenses', detail: 'March travel costs were 340% above the 6-month average (£8,400 vs £1,900 avg). This may be due to a conference or team event.', severity: 'medium', impact: '£6,500 above baseline' },
          { title: 'Revenue drop in Week 3', detail: 'Weekly revenue dipped 28% in the third week of the month. This pattern occurred last quarter too. May indicate seasonal client behaviour.', severity: 'low', impact: '£12,000 below weekly average' },
          { title: 'Duplicate supplier payment detected', detail: 'Two payments of £2,150 to "CloudHost Ltd" within 3 days. May be intentional (different invoices) or a duplicate payment.', severity: 'high', impact: '£2,150 potential overpayment' },
        ].map((a, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${a.severity === 'high' ? 'bg-red-500' : a.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-4">{a.detail}</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-4">{a.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
