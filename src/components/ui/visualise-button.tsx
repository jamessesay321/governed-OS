'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface VisualiseButtonProps {
  context?: string; // e.g. "kpi", "variance", "financials"
  className?: string;
}

/**
 * "Visualise" button that links to Graph Builder with pre-loaded context.
 * Appears on KPI, Variance, Financials pages.
 */
export function VisualiseButton({ context, className }: VisualiseButtonProps) {
  const href = context
    ? `/graphs/builder?context=${encodeURIComponent(context)}`
    : '/graphs/builder';

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors',
        className
      )}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
      Visualise
    </Link>
  );
}
