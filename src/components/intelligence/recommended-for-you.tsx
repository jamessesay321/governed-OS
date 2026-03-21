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
      <h3 className="text-sm font-medium text-muted-foreground">Recommended for you</h3>
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
