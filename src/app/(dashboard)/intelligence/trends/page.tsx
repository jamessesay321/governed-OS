'use client';

import Link from 'next/link';

export default function TrendsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">&larr; Intelligence</Link>
      <h2 className="text-2xl font-bold">Trend Analysis</h2>
      <p className="text-sm text-muted-foreground">AI-identified trends across your financial and operational data</p>
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">Sample trends shown below. Connect your accounts to see your real trends.</p>
      </div>
      <div className="space-y-3">
        {[
          { title: 'Revenue Growth Accelerating', detail: '3 consecutive months of increasing MoM growth: 8% → 10% → 12%. Projected annual run rate: £2.52M', direction: 'up' },
          { title: 'Gross Margin Compression', detail: 'Gross margin has declined from 62% to 58% over the last quarter. Subcontractor costs are the primary driver (+23% in 3 months).', direction: 'down' },
          { title: 'Cash Conversion Improving', detail: 'Days Sales Outstanding reduced from 42 to 35 days over the past 6 months. Collections efficiency is improving.', direction: 'up' },
          { title: 'Operating Expenses Stable', detail: 'Total OpEx has remained within 2% of budget for 4 consecutive months. Good cost discipline.', direction: 'flat' },
        ].map((t, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${t.direction === 'up' ? 'bg-green-100 text-green-600' : t.direction === 'down' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                {t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→'}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
