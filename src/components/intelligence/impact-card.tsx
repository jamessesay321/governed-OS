'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AIReasoning } from '@/components/ui/ai-reasoning';
import type { IntelligenceImpact } from '@/types';

interface ImpactCardProps {
  impact: IntelligenceImpact;
  onModel?: () => void;
}

const impactTypeStyles: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  positive: { label: 'Positive Impact', variant: 'default' },
  negative: { label: 'Negative Impact', variant: 'destructive' },
  neutral: { label: 'Neutral', variant: 'secondary' },
  mixed: { label: 'Mixed Impact', variant: 'outline' },
};

function formatPence(pence: number): string {
  const pounds = Math.abs(pence) / 100;
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pounds);
  return pence < 0 ? `-${formatted}` : `+${formatted}`;
}

function getRelevanceColor(score: number): string {
  if (score >= 0.7) return 'text-red-600 dark:text-red-400';
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

export function ImpactCard({ impact, onModel }: ImpactCardProps) {
  const style = impactTypeStyles[impact.impact_type] || impactTypeStyles.neutral;

  return (
    <Card className="bg-muted/30">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={style.variant}>{style.label}</Badge>
            <span className={`text-sm font-medium ${getRelevanceColor(impact.relevance_score)}`}>
              {Math.round(impact.relevance_score * 100)}% relevant
            </span>
          </div>
          <span className="text-lg font-bold">
            {formatPence(impact.estimated_impact_pence)}
            <span className="text-xs font-normal text-muted-foreground">/year</span>
          </span>
        </div>

        <p className="text-sm leading-relaxed">{impact.impact_narrative}</p>

        <AIReasoning
          reasoning={`Relevance score: ${Math.round(impact.relevance_score * 100)}%. This assessment is based on the event's sector overlap with your business, geographic relevance, and estimated financial exposure. The £${Math.abs(impact.estimated_impact_pence / 100).toLocaleString()} annual impact estimate uses your current revenue and cost structure as the baseline.`}
          dataSources={['Event severity and sector classification', 'Your business financial profile', 'Historical impact patterns for similar events']}
          confidence={impact.relevance_score >= 0.7 ? 'high' : impact.relevance_score >= 0.4 ? 'medium' : 'low'}
          triggerLabel="Why this assessment?"
        />

        {onModel && (
          <Button variant="outline" size="sm" onClick={onModel}>
            Model this scenario
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
