'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    title: 'AI Stack Audit',
    description: 'Understand your AI landscape and governance gaps',
    href: '/ai-solutions/audit',
    icon: (
      <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    badge: 'Free',
  },
  {
    title: 'Platform Integration',
    description: 'Connect and govern your entire tech stack',
    href: '/ai-solutions/integration',
    icon: (
      <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.626a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.25 8.744" />
      </svg>
    ),
    badge: null,
  },
  {
    title: 'AI Governance Packages',
    description: 'Ongoing governance and compliance support',
    href: '/ai-solutions/packages',
    icon: (
      <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    badge: null,
  },
] as const;

export default function AISolutionsPage() {
  return (
    <IntelligencePageWrapper
      section="ai-solutions"
      title="AI Solutions"
      subtitle="Audit, integrate, and govern your AI stack"
      showSearch={false}
      showRecommendations={false}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card
              className={cn(
                'relative h-full transition-shadow hover:shadow-md',
                'cursor-pointer'
              )}
            >
              <CardContent className="flex flex-col gap-4 py-5">
                {/* Icon + Badge row */}
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    {s.icon}
                  </div>
                  {s.badge && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      {s.badge}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                </div>

                {/* Arrow link */}
                <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                  Explore
                  <svg className="size-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </IntelligencePageWrapper>
  );
}
