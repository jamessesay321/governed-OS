'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlaybookAction, ActionStatus, ActionPriority } from '@/types/playbook';

type ActionListProps = {
  actions: PlaybookAction[];
  onStatusChange?: (actionId: string, status: ActionStatus) => void;
};

const priorityConfig: Record<ActionPriority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  low: { label: 'Low', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
};

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

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Status toggle */}
      <button
        onClick={() => onToggle(action.id)}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          action.status === 'completed'
            ? 'border-primary bg-primary text-primary-foreground'
            : action.status === 'in_progress'
              ? 'border-primary'
              : 'border-muted-foreground/40 hover:border-primary'
        )}
        disabled={isCompleted}
        title={status.next ? `Move to ${statusConfig[status.next].label}` : 'Completed'}
      >
        {isCompleted && (
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {action.status === 'in_progress' && (
          <div className="h-2 w-2 rounded-full bg-primary" />
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
