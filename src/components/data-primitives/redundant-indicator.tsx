'use client';

/**
 * Redundant Indicator — accessible status display
 *
 * Always shows colour + icon + text label together, ensuring the status
 * is never conveyed by colour alone (WCAG 2.1 AA compliance).
 *
 * Usage:
 *   <RedundantIndicator status="positive" label="On Track" value="+12%" />
 *   <RedundantIndicator status="negative" label="Off Track" />
 *   <RedundantIndicator status="warning" label="Watch" value="3 days" />
 */

import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  MinusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'positive' | 'negative' | 'neutral' | 'warning';

interface RedundantIndicatorProps {
  /** Status determines colour and icon */
  status: Status;
  /** Text label (always visible) */
  label: string;
  /** Optional value displayed after the label */
  value?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional className */
  className?: string;
}

const STATUS_CONFIG: Record<
  Status,
  { icon: typeof CheckCircle; colorClass: string; bgClass: string }
> = {
  positive: {
    icon: CheckCircle,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
  },
  negative: {
    icon: AlertCircle,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50',
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
  },
  neutral: {
    icon: MinusCircle,
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50',
  },
};

export function RedundantIndicator({
  status,
  label,
  value,
  size = 'sm',
  className,
}: RedundantIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const isSm = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgClass,
        config.colorClass,
        isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
      role="status"
      aria-label={`${label}${value ? `: ${value}` : ''}`}
    >
      <Icon className={isSm ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden="true" />
      <span>{label}</span>
      {value && (
        <span className="font-semibold">{value}</span>
      )}
    </span>
  );
}
