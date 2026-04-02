'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type DashboardView = 'finance' | 'marketing' | 'operations';

interface DashboardViewSwitcherProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  recommendedView?: DashboardView;
}

const views: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  {
    id: 'finance',
    label: 'Finance',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 34l19-11L10 12v22z M3 18h7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5L11.5 2 20 5.5M3 12l8.5-3.5L20 12M3 18.5l8.5-3.5L20 18.5" />
      </svg>
    ),
  },
  {
    id: 'operations',
    label: 'Operations & Projects',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function DashboardViewSwitcher({
  activeView,
  onViewChange,
  recommendedView = 'marketing',
}: DashboardViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeView === view.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {view.icon}
          {view.label}
          {view.id === recommendedView && activeView !== view.id && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] font-medium">
              Recommended
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
