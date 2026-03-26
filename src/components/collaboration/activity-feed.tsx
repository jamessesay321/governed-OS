'use client';

import { Badge } from '@/components/ui/badge';

interface ActivityEvent {
  id: string;
  user: string;
  userInitials: string;
  action: string;
  entityType: string;
  entityName: string;
  timestamp: string;
  metadata?: string;
}

interface ActivityFeedProps {
  events?: ActivityEvent[];
  compact?: boolean;
  className?: string;
}

const DEMO_EVENTS: ActivityEvent[] = [
  {
    id: '1',
    user: 'James Sesay',
    userInitials: 'JS',
    action: 'edited',
    entityType: 'scenario',
    entityName: 'Base Case',
    timestamp: '10 min ago',
    metadata: 'Changed revenue growth from 5% to 3%',
  },
  {
    id: '2',
    user: 'AI Assistant',
    userInitials: 'AI',
    action: 'generated',
    entityType: 'commentary',
    entityName: 'March P&L Analysis',
    timestamp: '1 hour ago',
  },
  {
    id: '3',
    user: 'Sarah Mitchell',
    userInitials: 'SM',
    action: 'commented on',
    entityType: 'kpi',
    entityName: 'Gross Margin',
    timestamp: '2 hours ago',
    metadata: 'Should we revise the target?',
  },
  {
    id: '4',
    user: 'James Sesay',
    userInitials: 'JS',
    action: 'shared',
    entityType: 'investor room',
    entityName: 'Series A: Exploration',
    timestamp: '3 hours ago',
    metadata: 'Shared with sarah@hoxtonventures.com',
  },
  {
    id: '5',
    user: 'System',
    userInitials: 'SY',
    action: 'synced',
    entityType: 'data',
    entityName: 'Xero Financial Data',
    timestamp: '5 hours ago',
    metadata: '142 transactions imported',
  },
  {
    id: '6',
    user: 'James Sesay',
    userInitials: 'JS',
    action: 'created version',
    entityType: 'scenario',
    entityName: 'Post-Board Meeting Update',
    timestamp: '1 day ago',
    metadata: 'v5, promoted to Master',
  },
  {
    id: '7',
    user: 'Marcus Webb',
    userInitials: 'MW',
    action: 'viewed',
    entityType: 'investor room',
    entityName: 'Series A: Exploration',
    timestamp: '1 day ago',
    metadata: 'Spent 23 minutes, viewed 8 pages',
  },
  {
    id: '8',
    user: 'AI Assistant',
    userInitials: 'AI',
    action: 'detected',
    entityType: 'anomaly',
    entityName: 'Marketing Spend Spike',
    timestamp: '2 days ago',
    metadata: 'Marketing costs up 45% vs last month',
  },
];

const ACTION_ICONS: Record<string, string> = {
  edited: '✏️',
  generated: '✨',
  'commented on': '💬',
  shared: '🔗',
  synced: '🔄',
  'created version': '📋',
  viewed: '👁️',
  detected: '⚠️',
  exported: '📤',
};

export function ActivityFeed({ events = DEMO_EVENTS, compact = false, className = '' }: ActivityFeedProps) {
  const displayed = compact ? events.slice(0, 5) : events;

  return (
    <div className={`space-y-1 ${className}`}>
      {displayed.map((event) => (
        <div
          key={event.id}
          className={`flex items-start gap-3 ${compact ? 'py-2' : 'py-3'} ${
            compact ? '' : 'border-b last:border-0'
          }`}
        >
          <div className={`${compact ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]'} rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary flex-shrink-0`}>
            {event.userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-foreground`}>
              <span className="font-medium">{event.user}</span>{' '}
              <span className="text-muted-foreground">
                {ACTION_ICONS[event.action] || ''} {event.action}
              </span>{' '}
              <span className="font-medium">{event.entityName}</span>
            </p>
            {event.metadata && !compact && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.metadata}</p>
            )}
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
              {event.timestamp}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
