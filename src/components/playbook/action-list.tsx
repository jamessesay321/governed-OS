'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Shield,
  Users,
  Target,
  Lightbulb,
  Wrench,
  BarChart3,
} from 'lucide-react';
import type { PlaybookAction, ActionStatus, ActionPriority } from '@/types/playbook';
import type { LucideIcon } from 'lucide-react';

type ActionListProps = {
  actions: PlaybookAction[];
  onStatusChange?: (actionId: string, status: ActionStatus) => void;
};

const priorityConfig: Record<ActionPriority, { label: string; className: string; borderColor: string }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', borderColor: 'border-l-red-500' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', borderColor: 'border-l-amber-500' },
  low: { label: 'Low', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', borderColor: 'border-l-green-500' },
};

const dimensionIconMap: Record<string, { icon: LucideIcon; bgColor: string; textColor: string }> = {
  financial: { icon: DollarSign, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
  finance: { icon: DollarSign, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
  revenue: { icon: DollarSign, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
  growth: { icon: TrendingUp, bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-600 dark:text-blue-400' },
  compliance: { icon: Shield, bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-600 dark:text-purple-400' },
  governance: { icon: Shield, bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-600 dark:text-purple-400' },
  team: { icon: Users, bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400' },
  people: { icon: Users, bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400' },
  strategy: { icon: Target, bgColor: 'bg-rose-100 dark:bg-rose-900/30', textColor: 'text-rose-600 dark:text-rose-400' },
  innovation: { icon: Lightbulb, bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', textColor: 'text-yellow-600 dark:text-yellow-400' },
  operations: { icon: Wrench, bgColor: 'bg-slate-100 dark:bg-slate-900/30', textColor: 'text-slate-600 dark:text-slate-400' },
  performance: { icon: BarChart3, bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', textColor: 'text-indigo-600 dark:text-indigo-400' },
  kpi: { icon: BarChart3, bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', textColor: 'text-indigo-600 dark:text-indigo-400' },
};

function getDimensionIcon(dimensionName: string) {
  const lower = dimensionName.toLowerCase();
  for (const [key, value] of Object.entries(dimensionIconMap)) {
    if (lower.includes(key)) return value;
  }
  return { icon: Target, bgColor: 'bg-gray-100 dark:bg-gray-900/30', textColor: 'text-gray-600 dark:text-gray-400' };
}

const statusConfig: Record<ActionStatus, { label: string; next: ActionStatus | null }> = {
  pending: { label: 'Pending', next: 'in_progress' },
  in_progress: { label: 'In Progress', next: 'completed' },
  completed: { label: 'Completed', next: null },
};

export function ActionList({ actions, onStatusChange }: ActionListProps) {
  const [localActions, setLocalActions] = useState(actions);

  function handleStatusToggle(actionId: string) {
    setLocalActions((prev) =>
      prev.map((a) => {
        if (a.id !== actionId) return a;
        const nextStatus = statusConfig[a.status].next;
        if (!nextStatus) return a;
        onStatusChange?.(actionId, nextStatus);
        return { ...a, status: nextStatus, updatedAt: new Date().toISOString() };
      })
    );
  }

  const pending = localActions.filter((a) => a.status === 'pending');
  const inProgress = localActions.filter((a) => a.status === 'in_progress');
  const completed = localActions.filter((a) => a.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Action Items</CardTitle>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{completed.length}/{localActions.length} completed</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{
              width: `${localActions.length > 0 ? (completed.length / localActions.length) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Action groups */}
        {inProgress.length > 0 && (
          <ActionGroup title="In Progress" actions={inProgress} onToggle={handleStatusToggle} />
        )}
        {pending.length > 0 && (
          <ActionGroup title="Pending" actions={pending} onToggle={handleStatusToggle} />
        )}
        {completed.length > 0 && (
          <ActionGroup title="Completed" actions={completed} onToggle={handleStatusToggle} />
        )}

        {localActions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No actions yet. Run an assessment to generate recommendations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ActionGroup({
  title,
  actions,
  onToggle,
}: {
  title: string;
  actions: PlaybookAction[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({actions.length})
      </h4>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionItem key={action.id} action={action} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function ActionItem({
  action,
  onToggle,
}: {
  action: PlaybookAction;
  onToggle: (id: string) => void;
}) {
  const priority = priorityConfig[action.priority];
  const status = statusConfig[action.status];
  const isCompleted = action.status === 'completed';
  const dimensionStyle = getDimensionIcon(action.dimensionName);
  const DimensionIcon = dimensionStyle.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-l-4 p-3 transition-all hover:shadow-md hover:bg-muted/30',
        priority.borderColor,
        isCompleted && 'opacity-60'
      )}
    >
      {/* Dimension icon */}
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          dimensionStyle.bgColor
        )}
      >
        <DimensionIcon className={cn('h-4 w-4', dimensionStyle.textColor)} />
      </div>

      {/* Status toggle */}
      <button
        onClick={() => onToggle(action.id)}
        className={cn(
          'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all hover:scale-110',
          action.status === 'completed'
            ? 'border-primary bg-primary text-primary-foreground'
            : action.status === 'in_progress'
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/40 hover:border-primary hover:bg-primary/5'
        )}
        disabled={isCompleted}
        title={status.next ? `Move to ${statusConfig[status.next].label}` : 'Completed'}
      >
        {isCompleted && (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {action.status === 'in_progress' && (
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-medium', isCompleted && 'line-through')}>
            {action.title}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {action.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', priority.className)}>
            {priority.label}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {action.dimensionName}
          </Badge>
          {action.dueDate && (
            <span className="text-[10px] text-muted-foreground">
              Due {new Date(action.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
