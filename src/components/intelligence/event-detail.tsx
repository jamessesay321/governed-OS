'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImpactCard } from './impact-card';
import type { IntelligenceEvent, IntelligenceImpact } from '@/types';

interface EventDetailProps {
  event: IntelligenceEvent;
  impacts: IntelligenceImpact[];
}

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function EventDetail({ event, impacts }: EventDetailProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={severityColors[event.severity] || ''}
            >
              {event.severity}
            </Badge>
            <Badge variant="secondary">{event.event_type}</Badge>
          </div>
          <CardTitle className="text-xl">{event.title}</CardTitle>
          <CardDescription>
            {event.source} &middot;{' '}
            {new Date(event.published_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">{event.summary}</p>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Sectors:</span>{' '}
              {event.sectors_affected.map((s) => (
                <Badge key={s} variant="outline" className="ml-1">
                  {s}
                </Badge>
              ))}
            </div>
            <div>
              <span className="font-medium">Countries:</span>{' '}
              {event.countries_affected.map((c) => (
                <Badge key={c} variant="outline" className="ml-1">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {impacts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Impact Assessments ({impacts.length})
          </h3>
          {impacts.map((impact) => (
            <ImpactCard key={impact.id} impact={impact} />
          ))}
        </div>
      )}
    </div>
  );
}
