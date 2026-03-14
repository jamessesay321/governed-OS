'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HealthCheckResult, HealthCheckCategory, TrafficLightStatus } from '@/types/playbook';

type HealthCheckProps = {
  orgId: string;
};

const statusConfig: Record<TrafficLightStatus, { label: string; color: string; bg: string; ring: string }> = {
  green: { label: 'Healthy', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
  amber: { label: 'Monitor', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-500/20' },
  red: { label: 'At Risk', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-500', ring: 'ring-red-500/20' },
};

export function HealthCheck({ orgId }: HealthCheckProps) {
  const [data, setData] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/modules/health-check/${orgId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.result);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="h-6 w-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Unable to generate health check. Ensure financial data is available.</p>
        </CardContent>
      </Card>
    );
  }

  const overall = statusConfig[data.overallStatus];

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <Card className={cn('border-2', data.overallStatus === 'green' ? 'border-emerald-200 dark:border-emerald-800' : data.overallStatus === 'amber' ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800')}>
        <CardContent className="flex items-center gap-4 py-6">
          <div className={cn('h-12 w-12 rounded-full ring-4', overall.bg, overall.ring)} />
          <div className="flex-1">
            <h2 className={cn('text-xl font-bold', overall.color)}>{overall.label}</h2>
            <p className="text-sm text-muted-foreground">Overall Financial Health</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {new Date(data.assessedAt).toLocaleDateString('en-GB')}
          </Badge>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.categories.map((category) => (
          <CategoryCard key={category.name} category={category} />
        ))}
      </div>

      {/* AI Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{data.aiNarrative}</p>
        </CardContent>
      </Card>

      {/* Top Actions */}
      {data.topActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Actions</CardTitle>
            <CardDescription>Top priorities based on your financial health assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {data.topActions.map((action, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm">{action}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: HealthCheckCategory }) {
  const status = statusConfig[category.status];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{category.name}</CardTitle>
          <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-0.5', category.status === 'green' ? 'bg-emerald-100 dark:bg-emerald-900/30' : category.status === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
            <div className={cn('h-2 w-2 rounded-full', status.bg)} />
            <span className={cn('text-xs font-medium', status.color)}>{status.label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {category.metrics.map((metric) => (
            <div key={metric.name} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={cn('h-1.5 w-1.5 rounded-full', statusConfig[metric.status].bg)} />
                <span className="text-xs">{metric.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{formatValue(metric.value)}</span>
                <span className="text-[10px] text-muted-foreground">
                  vs {formatValue(metric.benchmark)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (Math.abs(value) < 1 && value !== 0) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(1);
}
