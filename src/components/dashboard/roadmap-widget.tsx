'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getMockRoadmap, getNextStep } from '@/lib/roadmap/roadmap-data';
import type { ActivationRoadmap } from '@/lib/roadmap/roadmap-data';

export function RoadmapWidget() {
  // Start with mock data for instant render, then hydrate from API
  const [roadmap, setRoadmap] = useState<ActivationRoadmap>(getMockRoadmap);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/roadmap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ActivationRoadmap | null) => {
        if (!cancelled && data) setRoadmap(data);
      })
      .catch(() => {
        // Keep mock data on error
      });
    return () => { cancelled = true; };
  }, []);

  const nextStep = getNextStep(roadmap);

  return (
    <Card variant="warm">
      <CardContent className="pt-5 pb-4 space-y-3">
        {/* progress */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm font-medium truncate">Activation Roadmap</p>
          <span className="text-xs font-semibold text-primary tabular-nums">
            {roadmap.overallProgress}%
          </span>
        </div>
        <div className="h-1.5 sm:h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${roadmap.overallProgress}%` }}
          />
        </div>

        {/* next step */}
        {nextStep && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Next: {nextStep.title}
            </p>
            <Button size="xs" className="flex-shrink-0">
              {nextStep.status === 'in_progress' ? 'Continue' : 'Start'}
            </Button>
          </div>
        )}

        {/* setup agent status + link */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            <span className="inline-block size-1.5 rounded-full bg-teal-500 mr-1 align-middle" />
            Setup Agent: 4 tasks today
          </p>
          <Link
            href="/roadmap"
            className="text-[10px] sm:text-xs font-medium text-primary hover:underline flex-shrink-0"
          >
            View full roadmap
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
