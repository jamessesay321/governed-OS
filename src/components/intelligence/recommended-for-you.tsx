'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

const recommendations: Record<string, { title: string; description: string; href: string }[]> = {
  dashboard: [
    { title: 'Review cash position', description: 'Your cash flow forecast was updated today', href: '/financials/cash-flow' },
    { title: 'Check KPI targets', description: '2 KPIs are trending below target', href: '/kpi/targets' },
  ],
  financials: [
    { title: 'Run variance analysis', description: 'Compare this month against budget', href: '/variance/budget' },
    { title: 'Generate board pack', description: 'Q1 data is ready for reporting', href: '/reports/new' },
  ],
  agents: [
    { title: 'View Setup Agent activity', description: 'See what your free agent has configured', href: '/agents/setup' },
    { title: 'Explore specialist agents', description: 'Find the right agent for your needs', href: '/agents' },
  ],
};

export function RecommendedForYou({ section }: { section: string }) {
  const items = recommendations[section] ?? recommendations.dashboard;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Recommended for you</h3>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Powered by Claude
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
