'use client';

interface VarianceIndicatorProps {
  value: number;
  previousValue: number;
  format?: 'percentage' | 'absolute' | 'both';
  size?: 'sm' | 'md' | 'lg';
  invertColors?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { text: 'text-xs', icon: 'w-3 h-3' },
  md: { text: 'text-sm', icon: 'w-4 h-4' },
  lg: { text: 'text-base', icon: 'w-5 h-5' },
};

export function VarianceIndicator({
  value,
  previousValue,
  format = 'percentage',
  size = 'sm',
  invertColors = false,
  className = '',
}: VarianceIndicatorProps) {
  if (previousValue === 0 && value === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-slate-400 ${SIZE_MAP[size].text} ${className}`}>
        <span>N/A</span>
      </span>
    );
  }

  const change = value - previousValue;
  const pctChange = previousValue !== 0 ? (change / Math.abs(previousValue)) * 100 : 0;
  const isPositive = change > 0;
  const isZero = change === 0;

  const colorClass = isZero
    ? 'text-slate-400'
    : (isPositive !== invertColors)
      ? 'text-emerald-600'
      : 'text-red-500';

  let display = '';
  if (format === 'percentage' || format === 'both') {
    display = `${isPositive ? '+' : ''}${pctChange.toFixed(1)}%`;
  }
  if (format === 'absolute') {
    display = `${isPositive ? '+' : ''}${change.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  }
  if (format === 'both') {
    display += ` (${isPositive ? '+' : ''}${change.toLocaleString('en-GB', { maximumFractionDigits: 0 })})`;
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${colorClass} ${SIZE_MAP[size].text} ${className}`}>
      {!isZero && (
        <svg className={SIZE_MAP[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {isPositive ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          )}
        </svg>
      )}
      <span className="font-medium">{display}</span>
    </span>
  );
}
