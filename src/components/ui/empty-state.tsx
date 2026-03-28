import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {actionLabel && (actionHref || onAction) && (
          <div className="mt-4">
            {actionHref ? (
              <Link href={actionHref}>
                <Button size="sm">{actionLabel}</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
