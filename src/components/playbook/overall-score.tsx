'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PlaybookAssessment, MaturityLevel } from '@/types/playbook';

type OverallScoreProps = {
  assessment: PlaybookAssessment;
};

const scoreColors: Record<number, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-emerald-500',
  5: 'text-green-600',
};

const scoreBgColors: Record<number, string> = {
  1: 'from-red-500/10 to-red-500/5',
  2: 'from-orange-500/10 to-orange-500/5',
  3: 'from-yellow-500/10 to-yellow-500/5',
  4: 'from-emerald-500/10 to-emerald-500/5',
  5: 'from-green-600/10 to-green-600/5',
};

const scoreRingColors: Record<number, string> = {
  1: 'stroke-red-500',
  2: 'stroke-orange-500',
  3: 'stroke-yellow-500',
  4: 'stroke-emerald-500',
  5: 'stroke-green-600',
};

export function OverallScore({ assessment }: OverallScoreProps) {
  const roundedScore = Math.round(assessment.overallScore) as MaturityLevel;
  const scorePct = (assessment.overallScore / 5) * 100;

  // SVG ring calculation
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scorePct / 100) * circumference;

  const trendDelta = assessment.previousScore !== null
    ? assessment.overallScore - assessment.previousScore
    : null;

  return (
    <Card className={cn('bg-gradient-to-br', scoreBgColors[roundedScore])}>
      <CardContent className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:items-start sm:gap-8">
        {/* Score ring */}
        <div className="relative flex shrink-0 items-center justify-center">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              className={scoreRingColors[roundedScore]}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={cn('text-3xl font-bold', scoreColors[roundedScore])}>
              {assessment.overallScore.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">/5.0</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
          <div>
            <h2 className="text-2xl font-bold">{assessment.overallLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {assessment.templateName}
            </p>
          </div>

          {/* Trend */}
          {trendDelta !== null && (
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              {trendDelta > 0 ? (
                <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : trendDelta < 0 ? (
                <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              ) : null}
              <span className={cn(
                'text-sm font-medium',
                trendDelta > 0 ? 'text-emerald-600' : trendDelta < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {trendDelta > 0 ? '+' : ''}{trendDelta.toFixed(1)} vs last assessment
              </span>
            </div>
          )}

          {/* AI Summary */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {assessment.aiSummary}
          </p>

          <p className="text-[10px] text-muted-foreground/60">
            Assessed {new Date(assessment.assessedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
