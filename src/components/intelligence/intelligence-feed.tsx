'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImpactCard } from './impact-card';
import type { IntelligenceEvent, IntelligenceImpact } from '@/types';

type EventWithImpact = IntelligenceEvent & {
  impact?: IntelligenceImpact | null;
};

interface IntelligenceFeedProps {
  events: EventWithImpact[];
  orgId: string;
  onAnalyse?: (eventId: string) => void;
  analysing?: string | null;
}

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const eventTypeLabels: Record<string, string> = {
  interest_rate: 'Interest Rate',
  regulation: 'Regulation',
  sector_news: 'Sector News',
  economic_indicator: 'Economic Indicator',
  supply_chain: 'Supply Chain',
  funding: 'Funding',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function IntelligenceFeed({
  events,
  orgId,
  onAnalyse,
  analysing,
}: IntelligenceFeedProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No intelligence events yet. Seed the database to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card
          key={event.id}
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() =>
            setExpandedEvent(expandedEvent === event.id ? null : event.id)
          }
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={severityColors[event.severity] || ''}
                  >
                    {event.severity}
                  </Badge>
                  <Badge variant="secondary">
                    {eventTypeLabels[event.event_type] || event.event_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(event.published_at)}
                  </span>
                </div>
                <CardTitle className="text-base">{event.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {event.summary}
                </CardDescription>
              </div>
              {event.impact && (
                <Badge
                  variant={
                    event.impact.impact_type === 'positive'
                      ? 'default'
                      : event.impact.impact_type === 'negative'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {event.impact.impact_type === 'positive' ? '+' : ''}
                  {event.impact.impact_type === 'negative' ? '-' : ''}
                  {`\u00a3${Math.abs(event.impact.estimated_impact_pence / 100).toLocaleString()}`}
                </Badge>
              )}
            </div>
          </CardHeader>

          {expandedEvent === event.id && (
            <CardContent className="space-y-4 border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <p>{event.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="font-medium">Source:</span> {event.source}
                  <span className="mx-2">|</span>
                  <span className="font-medium">Sectors:</span>{' '}
                  {event.sectors_affected.join(', ')}
                  <span className="mx-2">|</span>
                  <span className="font-medium">Countries:</span>{' '}
                  {event.countries_affected.join(', ')}
                </div>
              </div>

              {event.impact ? (
                <ImpactCard impact={event.impact} />
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnalyse?.(event.id);
                    }}
                    disabled={analysing === event.id}
                  >
                    {analysing === event.id
                      ? 'Analysing...'
                      : 'Analyse Impact'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    AI will generate a personalised impact assessment
                  </span>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
