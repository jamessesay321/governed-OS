'use client';

/**
 * HorizonCard
 * --------------------------------------------------
 * Time-horizon KPI card (Syft-style). Displays a single time slice
 * (Today, 1-7d, 8-30d, Overdue/Balance) with an amount, count,
 * subtitle, and tone-coded styling.
 *
 * Designed to be composed via <HorizonRow> rather than rendered alone,
 * but exported so individual cards can also be embedded if needed.
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting/currency';

export type HorizonTone = 'positive' | 'negative' | 'warning' | 'neutral';

export type HorizonKey = 'today' | 'next_1_7' | 'next_8_30' | 'overdue_or_balance';

export interface HorizonCellData {
  amount: number;
  count?: number;
  subtitle?: string;
}

export interface HorizonCardProps {
  /** Stable key — emitted on click */
  horizonKey: HorizonKey;
  /** Top label, e.g. "Today" or "Next 1-7 days" */
  label: string;
  /** Cell data (amount / count / subtitle) */
  data: HorizonCellData;
  /** Visual tone */
  tone: HorizonTone;
  /** Click handler — receives the horizon key */
  onClick?: (key: HorizonKey) => void;
  /** Currency code override (default GBP from formatCurrency) */
  currencyCode?: string;
  /** Whether to format the amount as currency (true) or raw number (false) */
  asCurrency?: boolean;
  /** Optional accessible description override */
  ariaLabel?: string;
  className?: string;
}

const TONE_CLASSES: Record<HorizonTone, { container: string; amount: string; chip: string }> = {
  positive: {
    container:
      'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-emerald-900 dark:hover:bg-emerald-950/30',
    amount: 'text-emerald-700 dark:text-emerald-400',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  negative: {
    container:
      'border-red-200 hover:border-red-300 hover:bg-red-50/40 dark:border-red-900 dark:hover:bg-red-950/30',
    amount: 'text-red-700 dark:text-red-400',
    chip: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  },
  warning: {
    container:
      'border-amber-200 hover:border-amber-300 hover:bg-amber-50/40 dark:border-amber-900 dark:hover:bg-amber-950/30',
    amount: 'text-amber-700 dark:text-amber-400',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  neutral: {
    container:
      'border-border hover:border-foreground/20 hover:bg-muted/40',
    amount: 'text-foreground',
    chip: 'bg-muted text-muted-foreground',
  },
};

function formatCount(count: number): string {
  return new Intl.NumberFormat('en-GB').format(count);
}

export const HorizonCard = forwardRef<HTMLButtonElement, HorizonCardProps>(function HorizonCard(
  {
    horizonKey,
    label,
    data,
    tone,
    onClick,
    currencyCode,
    asCurrency = true,
    ariaLabel,
    className,
  },
  ref,
) {
  const tones = TONE_CLASSES[tone];
  const interactive = typeof onClick === 'function';
  const formattedAmount = asCurrency
    ? formatCurrency(data.amount, currencyCode ?? 'GBP')
    : new Intl.NumberFormat('en-GB').format(data.amount);

  const handleClick = () => {
    if (interactive) onClick(horizonKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(horizonKey);
    }
  };

  const a11yLabel =
    ariaLabel ??
    `${label}: ${formattedAmount}${
      typeof data.count === 'number' ? `, ${formatCount(data.count)} item${data.count === 1 ? '' : 's'}` : ''
    }${data.subtitle ? `. ${data.subtitle}` : ''}`;

  return (
    <button
      ref={ref}
      type="button"
      role="button"
      aria-label={a11yLabel}
      tabIndex={interactive ? 0 : -1}
      disabled={!interactive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex w-full flex-col items-start gap-1.5 rounded-lg border bg-card p-4 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        interactive ? 'cursor-pointer' : 'cursor-default',
        tones.container,
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {typeof data.count === 'number' && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
              tones.chip,
            )}
          >
            {formatCount(data.count)}
          </span>
        )}
      </div>
      <div className={cn('text-2xl font-bold tabular-nums', tones.amount)}>
        {formattedAmount}
      </div>
      {data.subtitle && (
        <p className="text-xs text-muted-foreground line-clamp-2">{data.subtitle}</p>
      )}
    </button>
  );
});
