'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Target,
  TrendingDown,
  Package,
  Store,
  Calendar,
} from 'lucide-react';
import type { Workstream, Milestone, MilestoneStatus } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface StrategyClientProps {
  workstreams: Workstream[];
  today: string;
}

/* ================================================================== */
/*  Color Maps                                                         */
/* ================================================================== */

const BORDER_COLORS: Record<Workstream['color'], string> = {
  green: 'border-l-emerald-500',
  blue: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  orange: 'border-l-orange-500',
};

const BG_COLORS: Record<Workstream['color'], string> = {
  green: 'bg-emerald-50 dark:bg-emerald-950/30',
  blue: 'bg-blue-50 dark:bg-blue-950/30',
  purple: 'bg-purple-50 dark:bg-purple-950/30',
  orange: 'bg-orange-50 dark:bg-orange-950/30',
};

const ICON_COLORS: Record<Workstream['color'], string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
  orange: 'text-orange-600 dark:text-orange-400',
};

const PROGRESS_COLORS: Record<Workstream['color'], string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

const PROGRESS_TRACK: Record<Workstream['color'], string> = {
  green: 'bg-emerald-100 dark:bg-emerald-900/50',
  blue: 'bg-blue-100 dark:bg-blue-900/50',
  purple: 'bg-purple-100 dark:bg-purple-900/50',
  orange: 'bg-orange-100 dark:bg-orange-900/50',
};

const STATUS_CONFIG: Record<
  MilestoneStatus,
  { icon: typeof CheckCircle2; color: string; badgeCls: string; label: string }
> = {
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    badgeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    label: 'Completed',
  },
  'in-progress': {
    icon: Circle,
    color: 'text-blue-500',
    badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    label: 'In Progress',
  },
  upcoming: {
    icon: Circle,
    color: 'text-gray-400',
    badgeCls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    label: 'Upcoming',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-red-500',
    badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    label: 'Overdue',
  },
};

const WORKSTREAM_ICONS: Record<string, typeof Target> = {
  'cost-restructuring': TrendingDown,
  'bridal-activation': Calendar,
  'new-products': Package,
  'us-wholesale': Store,
};

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function computeProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === 'completed').length;
  return Math.round((completed / milestones.length) * 100);
}

function computeOverallProgress(workstreams: Workstream[]): {
  completed: number;
  total: number;
  overdue: number;
  inProgress: number;
} {
  let completed = 0;
  let total = 0;
  let overdue = 0;
  let inProgress = 0;
  for (const ws of workstreams) {
    for (const m of ws.milestones) {
      total++;
      if (m.status === 'completed') completed++;
      if (m.status === 'overdue') overdue++;
      if (m.status === 'in-progress') inProgress++;
    }
  }
  return { completed, total, overdue, inProgress };
}

function totalRevenueTarget(workstreams: Workstream[]): number {
  let sum = 0;
  for (const ws of workstreams) {
    for (const m of ws.milestones) {
      if (m.revenueTarget) sum += m.revenueTarget;
    }
  }
  return sum;
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: Workstream['color'];
}) {
  return (
    <div className={cn('h-2 w-full rounded-full', PROGRESS_TRACK[color])}>
      <div
        className={cn('h-2 rounded-full transition-all duration-500', PROGRESS_COLORS[color])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const config = STATUS_CONFIG[milestone.status];
  const Icon = config.icon;
  const isCompleted = milestone.status === 'completed';
  const isOverdue = milestone.status === 'overdue';
  const isInProgress = milestone.status === 'in-progress';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
        isOverdue && 'bg-red-50/50 dark:bg-red-950/20',
        isInProgress && 'bg-blue-50/50 dark:bg-blue-950/20',
      )}
    >
      {/* Status icon */}
      <div className="mt-0.5 flex-shrink-0">
        {isInProgress ? (
          <span className="relative flex size-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
            <span className="relative inline-flex size-3 rounded-full bg-blue-500" />
          </span>
        ) : (
          <Icon className={cn('size-5', config.color)} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isCompleted && 'text-gray-500 line-through',
              isOverdue && 'text-red-700 dark:text-red-400 font-semibold',
              isInProgress && 'text-blue-700 dark:text-blue-300 font-semibold',
              !isCompleted && !isOverdue && !isInProgress && 'text-gray-700 dark:text-gray-300',
            )}
          >
            {milestone.description}
          </span>
          {(milestone.revenueTarget || milestone.budgetCost) && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {milestone.revenueTarget && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Target: {formatCurrency(milestone.revenueTarget)}
                </span>
              )}
              {milestone.budgetCost && !milestone.revenueTarget && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {formatCurrency(milestone.budgetCost)}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={cn(
              'text-xs',
              isCompleted ? 'text-gray-400 line-through' : 'text-gray-500 dark:text-gray-400',
            )}
          >
            {milestone.date}
          </span>
          {milestone.notes && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              — {milestone.notes}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge className={cn('shrink-0 text-[10px] uppercase tracking-wider', config.badgeCls)}>
        {config.label}
      </Badge>
    </div>
  );
}

function WorkstreamCard({ workstream }: { workstream: Workstream }) {
  const [expanded, setExpanded] = useState(true);
  const progress = computeProgress(workstream.milestones);
  const completed = workstream.milestones.filter((m) => m.status === 'completed').length;
  const overdue = workstream.milestones.filter((m) => m.status === 'overdue').length;
  const WsIcon = WORKSTREAM_ICONS[workstream.id] ?? Target;

  return (
    <Card
      className={cn(
        'border-l-4 transition-shadow hover:shadow-md',
        BORDER_COLORS[workstream.color],
      )}
    >
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-9 items-center justify-center rounded-lg',
                BG_COLORS[workstream.color],
              )}
            >
              <WsIcon className={cn('size-5', ICON_COLORS[workstream.color])} />
            </div>
            <div>
              <CardTitle className="text-base">{workstream.name}</CardTitle>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {workstream.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {overdue > 0 && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs">
                {overdue} overdue
              </Badge>
            )}
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
              {progress}%
            </span>
            {expanded ? (
              <ChevronDown className="size-5 text-gray-400" />
            ) : (
              <ChevronRight className="size-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <ProgressBar value={progress} color={workstream.color} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {completed} of {workstream.milestones.length} milestones complete
          </p>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-1">
            {workstream.milestones.map((milestone) => (
              <MilestoneRow key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ================================================================== */
/*  Timeline View                                                      */
/* ================================================================== */

function TimelineView({ workstreams }: { workstreams: Workstream[] }) {
  // Collect all milestones with their workstream color
  const allMilestones = useMemo(() => {
    const items: Array<Milestone & { wsColor: Workstream['color']; wsName: string }> = [];
    for (const ws of workstreams) {
      for (const m of ws.milestones) {
        items.push({ ...m, wsColor: ws.color, wsName: ws.shortName });
      }
    }
    return items.sort(
      (a, b) => new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime(),
    );
  }, [workstreams]);

  // Group by month
  const byMonth = useMemo(() => {
    const groups = new Map<string, typeof allMilestones>();
    for (const m of allMilestones) {
      const d = new Date(m.sortDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return groups;
  }, [allMilestones]);

  const months = Array.from(byMonth.keys()).sort();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Timeline
      </h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-6">
          {months.map((monthKey) => {
            const d = new Date(monthKey + '-01');
            const label = d.toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric',
            });
            const items = byMonth.get(monthKey) ?? [];
            const isPast = d < new Date('2026-04-01');
            const isCurrent =
              d.getFullYear() === 2026 && d.getMonth() === 3; // April

            return (
              <div key={monthKey} className="relative pl-10">
                {/* Dot on timeline */}
                <div
                  className={cn(
                    'absolute left-[9px] top-1 size-3 rounded-full border-2',
                    isCurrent
                      ? 'border-blue-500 bg-blue-500'
                      : isPast
                        ? 'border-emerald-400 bg-emerald-400'
                        : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800',
                  )}
                />

                {/* Month label */}
                <h4
                  className={cn(
                    'text-sm font-semibold mb-2',
                    isCurrent
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300',
                  )}
                >
                  {label}
                  {isCurrent && (
                    <span className="ml-2 text-xs font-normal text-blue-500">
                      (current)
                    </span>
                  )}
                </h4>

                {/* Milestone items */}
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const statusCfg = STATUS_CONFIG[item.status];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={cn(
                            'inline-block size-2 rounded-full flex-shrink-0',
                            PROGRESS_COLORS[item.wsColor],
                          )}
                        />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-28 flex-shrink-0">
                          {item.wsName}
                        </span>
                        <span
                          className={cn(
                            'flex-1 truncate',
                            item.status === 'completed'
                              ? 'text-gray-400 line-through'
                              : item.status === 'overdue'
                                ? 'text-red-600 dark:text-red-400 font-medium'
                                : 'text-gray-700 dark:text-gray-300',
                          )}
                        >
                          {item.description}
                        </span>
                        {item.revenueTarget && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0 tabular-nums">
                            {formatCurrency(item.revenueTarget)}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0',
                            statusCfg.badgeCls,
                          )}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function StrategyClient({ workstreams, today }: StrategyClientProps) {
  const [view, setView] = useState<'cards' | 'timeline'>('cards');
  const overall = useMemo(() => computeOverallProgress(workstreams), [workstreams]);
  const totalRevTarget = useMemo(() => totalRevenueTarget(workstreams), [workstreams]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Strategic Plan 2026
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Alonuko workstream tracker — 4 strategic pillars driving cost
            reduction and revenue growth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('cards')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'cards'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
            )}
          >
            Cards
          </button>
          <button
            onClick={() => setView('timeline')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'timeline'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
            )}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* ── Summary KPI row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Overall progress */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Overall Progress
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {overall.completed}/{overall.total}
            </p>
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-1.5 rounded-full bg-gray-900 dark:bg-gray-100 transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (overall.completed / overall.total) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {Math.round((overall.completed / overall.total) * 100)}% milestones
              complete
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Attention Needed
            </p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold tabular-nums',
                overall.overdue > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100',
              )}
            >
              {overall.overdue}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {overall.overdue > 0
                ? `${overall.overdue} milestone${overall.overdue > 1 ? 's' : ''} overdue`
                : 'All on track'}
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              In Progress
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {overall.inProgress}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Active milestones this period
            </p>
          </CardContent>
        </Card>

        {/* Revenue target */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Revenue Targets
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalRevTarget)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Total across trunk shows + new products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Workstream % bars ── */}
      <Card>
        <CardContent className="pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Workstream Progress
          </p>
          <div className="space-y-3">
            {workstreams.map((ws) => {
              const pct = computeProgress(ws.milestones);
              return (
                <div key={ws.id} className="flex items-center gap-3">
                  <span className="w-36 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {ws.shortName}
                  </span>
                  <div className="flex-1">
                    <ProgressBar value={pct} color={ws.color} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Main content: Cards or Timeline ── */}
      {view === 'cards' ? (
        <div className="space-y-6">
          {workstreams.map((ws) => (
            <WorkstreamCard key={ws.id} workstream={ws} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <TimelineView workstreams={workstreams} />
          </CardContent>
        </Card>
      )}

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        Data as of {new Date(today).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' '} — Milestones auto-compute status based on date. Mark items complete in the strategic plan when confirmed.
      </p>
    </div>
  );
}
