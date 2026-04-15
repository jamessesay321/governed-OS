'use client';

import { useState, useCallback } from 'react';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getNextStep } from '@/lib/roadmap/roadmap-data';
import type { RoadmapStep, ActivationRoadmap, StepStatus } from '@/lib/roadmap/roadmap-data';

/* ─── milestone unlock data ─── */
interface MilestoneUnlock {
  atStep: string;
  label: string;
  features: string[];
}

const MILESTONE_UNLOCKS: MilestoneUnlock[] = [
  {
    atStep: 'configure-kpis',
    label: 'After KPI setup',
    features: ['Anomaly detection', 'Weekly intelligence digest', 'Specialist agents'],
  },
  {
    atStep: 'review-quality',
    label: 'After data quality review',
    features: ['Intelligence feed', 'Consultant marketplace', 'Advanced reports'],
  },
  {
    atStep: 'run-scenario',
    label: 'After first scenario',
    features: ['Scenario comparison', 'Board pack generation', 'Forecast alerts'],
  },
];

/* ─── helpers ─── */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function categoryColor(cat: RoadmapStep['category']): string {
  switch (cat) {
    case 'essential':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'recommended':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'advanced':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
  }
}

/* ─── timeline step component ─── */
function TimelineStep({
  step,
  isLast,
  onUpdateStatus,
  isUpdating,
}: {
  step: RoadmapStep;
  isLast: boolean;
  onUpdateStatus: (stepId: string, status: StepStatus) => void;
  isUpdating: boolean;
}) {
  const isCompleted = step.status === 'completed';
  const isInProgress = step.status === 'in_progress';
  const isAvailable = step.status === 'available';
  const isLocked = step.status === 'locked';

  return (
    <div className="relative flex gap-3 sm:gap-4">
      {/* vertical line */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-[13px] sm:left-[15px] top-8 bottom-0 w-0.5',
            isCompleted ? 'bg-green-300 dark:bg-green-700' : 'bg-border'
          )}
        />
      )}

      {/* icon */}
      <div className="relative z-10 flex-shrink-0 mt-1">
        {isCompleted && (
          <div className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <svg className="size-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isInProgress && (
          <div className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-blue-500" />
            </span>
          </div>
        )}
        {isAvailable && (
          <div className="flex size-7 sm:size-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-background">
            <div className="size-2.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        {isLocked && (
          <div className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-muted">
            <svg className="size-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
      </div>

      {/* content card */}
      <div
        className={cn(
          'flex-1 rounded-lg border p-3 sm:p-4 mb-3 sm:mb-4 transition-colors',
          isCompleted && 'bg-green-50/60 border-green-200 dark:bg-green-950/20 dark:border-green-800',
          isInProgress && 'bg-blue-50/60 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
          isAvailable && 'bg-background border-border',
          isLocked && 'bg-muted/40 border-border opacity-70'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={cn(
              'text-sm sm:text-base font-semibold',
              isLocked && 'text-muted-foreground'
            )}>
              {step.title}
            </h3>
            <p className={cn(
              'text-xs sm:text-sm mt-0.5',
              isLocked ? 'text-muted-foreground/70' : 'text-muted-foreground'
            )}>
              {step.description}
            </p>

            {/* meta badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                {step.estimatedMinutes} min
              </Badge>
              <Badge variant="secondary" className={cn('text-[10px] sm:text-xs px-1.5 py-0 border-0', categoryColor(step.category))}>
                {step.category}
              </Badge>
              {isCompleted && step.completedAt && (
                <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                  Completed {formatTimestamp(step.completedAt)}
                </span>
              )}
            </div>

            {/* locked prerequisites */}
            {isLocked && step.requiredSteps.length > 0 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-1.5">
                Requires: {step.requiredSteps.join(', ')}
              </p>
            )}
          </div>

          {/* action buttons */}
          <div className="flex-shrink-0">
            {isInProgress && (
              <Button
                size="sm"
                className="w-full sm:w-auto"
                disabled={isUpdating}
                onClick={() => onUpdateStatus(step.id, 'completed')}
              >
                {isUpdating ? 'Saving...' : 'Mark Complete'}
              </Button>
            )}
            {isAvailable && (
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isUpdating}
                onClick={() => onUpdateStatus(step.id, 'in_progress')}
              >
                {isUpdating ? 'Saving...' : 'Start'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── main client component ─── */
export function RoadmapClient({ initialRoadmap }: { initialRoadmap: ActivationRoadmap }) {
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [isUpdating, setIsUpdating] = useState(false);

  const nextStep = getNextStep(roadmap);
  const completedCount = roadmap.steps.filter((s) => s.status === 'completed').length;
  const totalCount = roadmap.steps.length;

  const handleUpdateStatus = useCallback(async (stepId: string, status: StepStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/roadmap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, status }),
      });

      if (res.ok) {
        const updated: ActivationRoadmap = await res.json();
        setRoadmap(updated);
      }
    } catch {
      // Silently fail — roadmap stays at current state
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return (
    <IntelligencePageWrapper
      section="roadmap"
      title="Activation Roadmap"
      subtitle="Your step-by-step path to financial clarity"
      showSearch={false}
      showRecommendations={false}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* ─── progress summary ─── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <p className="text-sm sm:text-base font-medium">
                {roadmap.overallProgress}% Complete &mdash; {completedCount} of {totalCount} steps done
              </p>
              <Badge variant="secondary" className="w-fit text-xs">
                You&apos;re in: {roadmap.currentPhase}
              </Badge>
            </div>
            <div className="h-2.5 sm:h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${roadmap.overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── timeline ─── */}
        <div className="px-1 sm:px-2">
          {roadmap.steps.map((step, idx) => (
            <TimelineStep
              key={step.id}
              step={step}
              isLast={idx === roadmap.steps.length - 1}
              onUpdateStatus={handleUpdateStatus}
              isUpdating={isUpdating}
            />
          ))}
        </div>

        {/* ─── what unlocks next ─── */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3">What Unlocks Next</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {MILESTONE_UNLOCKS.map((m) => (
              <Card key={m.atStep}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">{m.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <svg className="size-3.5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ─── setup agent card ─── */}
        <Card className="border-teal-300 dark:border-teal-700">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50 flex-shrink-0">
                  <svg className="size-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-medium">Setup Agent</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Your Setup Agent has completed 4 tasks today
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href="/agents/setup">View agent activity</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </IntelligencePageWrapper>
  );
}
