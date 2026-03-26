'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAgentBySlug } from '@/lib/agents/registry';
import { getTimesheetForDate, TASK_CATEGORY_CONFIG } from '@/lib/agents/timesheet-data';

/* ------------------------------------------------------------------ */
/*  Colour helpers                                                     */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, { border: string; bg: string; text: string; bgStrong: string }> = {
  blue:    { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', bgStrong: 'bg-blue-500' },
  purple:  { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', bgStrong: 'bg-purple-500' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', bgStrong: 'bg-emerald-500' },
  amber:   { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', bgStrong: 'bg-amber-500' },
  rose:    { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', bgStrong: 'bg-rose-500' },
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function shiftDate(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PoundIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5a4 4 0 00-8 0v3H5v2h2v4H5v2h14v-2h-4v-4h3v-2h-3V8a4 4 0 00-4-4zM9 8V5a2 2 0 114 0v3H9zm0 2v4h4v-4H9z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AgentTimesheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const agent = getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const colors = colorMap[agent.color] ?? colorMap.blue;

  const [selectedDate, setSelectedDate] = useState('2026-03-21');
  const timesheet = getTimesheetForDate(slug, selectedDate);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/agents" className="hover:underline">AI Agents</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/agents/${slug}`} className="hover:underline">{agent.name}</Link>
        <span className="mx-1.5">/</span>
        <span>Timesheet</span>
      </nav>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: `/agents/${slug}`, label: 'Overview' },
          { href: `/agents/${slug}/timesheet`, label: 'Timesheet' },
          { href: `/agents/${slug}/billing`, label: 'Billing' },
          { href: `/agents/${slug}/settings`, label: 'Settings' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab.label === 'Timesheet'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Date picker row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{formatDate(selectedDate)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm">
          Export Timesheet
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={cn('border-l-4', colors.border)}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hours Worked</p>
                <p className={cn('text-2xl font-bold mt-1', colors.text)}>
                  {timesheet.totalHours}<span className="text-sm font-normal ml-1">hrs</span>
                </p>
              </div>
              <ClockIcon className={cn('h-5 w-5', colors.text)} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border-l-4', colors.border)}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
                <p className={cn('text-2xl font-bold mt-1', colors.text)}>
                  {timesheet.tasksCompleted}
                </p>
              </div>
              <CheckIcon className={cn('h-5 w-5', colors.text)} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border-l-4', colors.border)}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenue Generated</p>
                <p className={cn('text-2xl font-bold mt-1', colors.text)}>
                  {'\u00A3'}{timesheet.revenueGenerated.toLocaleString()}
                </p>
              </div>
              <PoundIcon className={cn('h-5 w-5', colors.text)} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border-l-4', colors.border)}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Key Actions</p>
                <p className={cn('text-2xl font-bold mt-1', colors.text)}>
                  {timesheet.keyActions}
                </p>
              </div>
              <StarIcon className={cn('h-5 w-5', colors.text)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {timesheet.tasks.map((task, i) => {
              const catConfig = TASK_CATEGORY_CONFIG[task.category];
              const isLast = i === timesheet.tasks.length - 1;

              return (
                <div key={task.id} className="relative flex gap-4">
                  {/* Timeline track */}
                  <div className="flex flex-col items-center">
                    <div className={cn('h-3 w-3 rounded-full shrink-0 mt-1', colors.bgStrong)} />
                    {!isLast && (
                      <div className="w-0 flex-1 border-l-2 border-muted" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn('pb-6 flex-1 min-w-0', isLast && 'pb-0')}>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {task.timestamp} to {task.endTime}
                    </p>
                    <p className="font-semibold text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        {task.durationMinutes} min
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-2 py-0', catConfig.color, catConfig.bg)}
                      >
                        {catConfig.label}
                      </Badge>
                      {task.revenueImpact !== null && task.revenueImpact > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0 text-emerald-700 bg-emerald-50 border-emerald-200"
                        >
                          {'\u00A3'}{task.revenueImpact.toLocaleString()}
                        </Badge>
                      )}
                      {task.keyAction && (
                        <StarIcon className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <Card className={cn('border-t-4', colors.border)}>
        <CardHeader>
          <CardTitle className="text-base">Daily Summary (AI Generated)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {timesheet.dailySummary}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
