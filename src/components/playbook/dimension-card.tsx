'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DimensionScore, MaturityLevel } from '@/types/playbook';
import { MATURITY_LABELS } from '@/types/playbook';

type DimensionCardProps = {
  score: DimensionScore;
  onImprove?: (dimensionId: string) => void;
};

const levelColors: Record<MaturityLevel, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-emerald-500',
  5: 'bg-green-600',
};

const levelBadgeVariants: Record<MaturityLevel, 'destructive' | 'secondary' | 'default' | 'outline'> = {
  1: 'destructive',
  2: 'destructive',
  3: 'secondary',
  4: 'default',
  5: 'default',
};

export function DimensionCard({ score, onImprove }: DimensionCardProps) {
  const progressPct = (score.score / 5) * 100;

  // Format KPI values for display
  const kpiEntries = Object.entries(score.kpiValues).filter(
    ([, value]) => value !== null && value !== undefined
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{score.dimensionName}</CardTitle>
          <Badge variant={levelBadgeVariants[score.score]}>
            Level {score.score}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {MATURITY_LABELS[score.score]} — {score.label}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Maturity</span>
            <span>{score.score}/5</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className={cn('h-2 rounded-full transition-all', levelColors[score.score])}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Key KPIs */}
        {kpiEntries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Key Metrics
            </p>
            <div className="grid grid-cols-2 gap-2">
              {kpiEntries.slice(0, 4).map(([key, value]) => (
                <div key={key} className="rounded-md bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground truncate">
                    {formatKpiLabel(key)}
                  </p>
                  <p className="text-sm font-medium">
                    {formatKpiValue(key, value as number)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improve button */}
        {onImprove && (
          <button
            onClick={() => onImprove(score.dimensionId)}
            className="mt-auto inline-flex items-center justify-center rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            View Actions
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function formatKpiLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/pct$/i, '%')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatKpiValue(key: string, value: number): string {
  if (key.includes('pct') || key.includes('ratio')) {
    return `${value.toFixed(1)}%`;
  }
  if (key.includes('days') || key.includes('months')) {
    return `${value.toFixed(0)}`;
  }
  if (key.includes('revenue') || key.includes('cost')) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toFixed(1);
}
