'use client';

/**
 * Sparkline — compact single-metric chart for list views.
 * ~80x32 by default. No axes, no tooltip, one-line label + current value.
 *
 * Usage:
 *   <Sparkline label="Revenue" values={[12000, 14500, ...]} format="currency" />
 */

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export type SparklineProps = {
  label: string;
  values: number[];
  /** 'currency' for £, 'percent' for %, 'integer' for plain numbers */
  format?: 'currency' | 'percent' | 'integer';
  /** Positive colour when the last value > first. Falls back to blue. */
  positiveColour?: string;
  /** Negative colour when the last value < first. Falls back to red. */
  negativeColour?: string;
  /** Chart height in px */
  height?: number;
  className?: string;
};

export function Sparkline({
  label,
  values,
  format = 'integer',
  positiveColour = '#10b981', // emerald-500
  negativeColour = '#ef4444', // red-500
  height = 32,
  className = '',
}: SparklineProps) {
  const hasData = values && values.length >= 2;
  const first = hasData ? values[0] : 0;
  const last = hasData ? values[values.length - 1] : 0;
  const trendPositive = last >= first;
  const stroke = trendPositive ? positiveColour : negativeColour;

  const data = (values ?? []).map((v, i) => ({ i, v }));

  const displayValue = formatValue(last, format);

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums">
          {hasData ? displayValue : '—'}
        </span>
      </div>
      <div style={{ height }} className="w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line
                type="monotone"
                dataKey="v"
                stroke={stroke}
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">no data</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatValue(n: number, format: 'currency' | 'percent' | 'integer'): string {
  if (!Number.isFinite(n)) return '—';
  if (format === 'currency') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
      notation: Math.abs(n) >= 10000 ? 'compact' : 'standard',
    }).format(n);
  }
  if (format === 'percent') {
    return `${(n * 100).toFixed(1)}%`;
  }
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 0,
    notation: Math.abs(n) >= 10000 ? 'compact' : 'standard',
  }).format(n);
}
