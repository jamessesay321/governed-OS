'use client';

import { Clock } from 'lucide-react';

interface DataFreshnessProps {
  lastSyncAt: string | null;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DataFreshness({ lastSyncAt }: DataFreshnessProps) {
  if (!lastSyncAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600">
        <Clock className="h-3 w-3" />
        <span>No data synced yet</span>
      </div>
    );
  }

  const relative = getRelativeTime(lastSyncAt);
  const date = new Date(lastSyncAt);
  const isStale = (Date.now() - date.getTime()) > 24 * 60 * 60 * 1000; // > 24 hours

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isStale ? 'text-amber-600' : 'text-muted-foreground'}`}>
      <Clock className="h-3 w-3" />
      <span>Based on Xero data synced {relative}</span>
    </div>
  );
}
