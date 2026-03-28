import { cn } from '@/lib/utils';

type PageLoadingVariant = 'dashboard' | 'list' | 'detail' | 'form';

interface PageLoadingProps {
  variant?: PageLoadingVariant;
  className?: string;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted/60',
        className,
      )}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      {/* Main content area */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      {/* Bottom section */}
      <Skeleton className="h-48" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

const variants: Record<PageLoadingVariant, React.FC> = {
  dashboard: DashboardSkeleton,
  list: ListSkeleton,
  detail: DetailSkeleton,
  form: FormSkeleton,
};

export function PageLoading({ variant = 'dashboard', className }: PageLoadingProps) {
  const Component = variants[variant];
  return (
    <div className={cn('p-4 sm:p-6', className)} role="status" aria-label="Loading">
      <Component />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
