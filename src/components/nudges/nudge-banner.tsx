'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Nudge } from '@/lib/nudges/nudge-data';
import { cn } from '@/lib/utils';

const priorityStyles: Record<Nudge['priority'], { bg: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  action: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
  celebration: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
};

function NudgeIcon({ priority }: { priority: Nudge['priority'] }) {
  const cls = cn('h-4 w-4 flex-shrink-0', priorityStyles[priority].icon);
  if (priority === 'celebration') {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (priority === 'action') {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function NudgeBanner({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const styles = priorityStyles[nudge.priority];
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 sm:px-4', styles.bg, styles.border)}>
      <NudgeIcon priority={nudge.priority} />
      <p className="flex-1 text-sm text-foreground min-w-0">{nudge.message}</p>
      <Link
        href={nudge.actionHref}
        className="flex-shrink-0 rounded-md bg-white/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-white transition-colors"
      >
        {nudge.actionLabel}
      </Link>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function NudgeBannerList({ nudges, maxVisible = 2 }: { nudges: Nudge[]; maxVisible?: number }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = nudges
    .filter((n) => !dismissed.has(n.id))
    .slice(0, maxVisible);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((nudge) => (
        <NudgeBanner
          key={nudge.id}
          nudge={nudge}
          onDismiss={() => setDismissed((prev) => new Set(prev).add(nudge.id))}
        />
      ))}
    </div>
  );
}
