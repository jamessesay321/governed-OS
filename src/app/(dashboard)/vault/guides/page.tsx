'use client';

import Link from 'next/link';

const GUIDES = [
  { title: 'Understanding Your Financial Statements', description: 'Learn to read P&L, Balance Sheet, and Cash Flow statements', readTime: '8 min', tags: ['Beginner', 'Finance'] },
  { title: 'KPI Guide for SME Owners', description: 'The 15 most important KPIs every business owner should track', readTime: '12 min', tags: ['KPIs', 'Strategy'] },
  { title: 'How to Read a Variance Report', description: 'Understanding what drives the differences between actual and budget', readTime: '6 min', tags: ['Variance', 'Analysis'] },
  { title: 'Board Pack Best Practices', description: 'What to include and how to present financial information to your board', readTime: '10 min', tags: ['Reports', 'Governance'] },
  { title: 'Cash Flow Forecasting 101', description: 'A practical guide to projecting your cash position', readTime: '15 min', tags: ['Cash Flow', 'Forecasting'] },
];

export default function VaultGuidesPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/vault" className="text-sm text-muted-foreground hover:text-foreground">&larr; Knowledge Vault</Link>
      <div>
        <h2 className="text-2xl font-bold">Guides & Resources</h2>
        <p className="text-sm text-muted-foreground mt-1">Learn how to get the most from your financial data</p>
      </div>
      <div className="space-y-3">
        {GUIDES.map((g) => (
          <div key={g.title} className="rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {g.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{t}</span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{g.readTime}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
