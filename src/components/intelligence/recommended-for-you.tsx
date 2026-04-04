'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Target,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Recommendation = {
  title: string;
  description: string;
  href: string;
  type: 'financial' | 'performance' | 'alert' | 'insight' | 'goal' | 'report';
  impact?: 'high' | 'medium' | 'low';
};

const typeStyles: Record<Recommendation['type'], { icon: LucideIcon; bgColor: string; textColor: string; borderColor: string }> = {
  financial: { icon: DollarSign, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-l-emerald-500' },
  performance: { icon: TrendingUp, bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-l-blue-500' },
  alert: { icon: AlertCircle, bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400', borderColor: 'border-l-red-500' },
  insight: { icon: Lightbulb, bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400', borderColor: 'border-l-amber-500' },
  goal: { icon: Target, bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-600 dark:text-purple-400', borderColor: 'border-l-purple-500' },
  report: { icon: BarChart3, bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', textColor: 'text-indigo-600 dark:text-indigo-400', borderColor: 'border-l-indigo-500' },
};

const impactConfig: Record<string, { label: string; className: string }> = {
  high: { label: 'High impact', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Medium impact', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Low impact', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const recommendations: Record<string, Recommendation[]> = {
  dashboard: [
    { title: 'Review cash position', description: 'Your cash flow forecast was updated today', href: '/financials/cash-flow', type: 'financial', impact: 'high' },
    { title: 'Check KPI targets', description: '2 KPIs are trending below target', href: '/kpi/targets', type: 'alert', impact: 'high' },
  ],
  financials: [
    { title: 'Run variance analysis', description: 'Compare this month against budget', href: '/variance/budget', type: 'performance', impact: 'medium' },
    { title: 'Generate board pack', description: 'Q1 data is ready for reporting', href: '/reports/new', type: 'report', impact: 'medium' },
  ],
  agents: [
    { title: 'View Setup Agent activity', description: 'See what your free agent has configured', href: '/agents/setup', type: 'insight', impact: 'low' },
    { title: 'Explore specialist agents', description: 'Find the right agent for your needs', href: '/agents', type: 'goal', impact: 'low' },
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
        {items.map((item) => {
          const style = typeStyles[item.type];
          const Icon = style.icon;
          const impact = item.impact ? impactConfig[item.impact] : null;

          return (
            <Link key={item.href} href={item.href}>
              <Card className={cn(
                'border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5 hover:bg-muted/20',
                style.borderColor
              )}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      style.bgColor
                    )}>
                      <Icon className={cn('h-4 w-4', style.textColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      {impact && (
                        <span className={cn(
                          'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                          impact.className
                        )}>
                          {impact.label}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
