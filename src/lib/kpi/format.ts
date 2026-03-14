/**
 * Pure formatting functions for KPIs — safe to import from Client Components.
 * No server-side imports.
 */

export type KPIFormat = 'currency' | 'percentage' | 'months' | 'ratio' | 'days' | 'number';
export type TrendDirection = 'up' | 'down' | 'flat';

export type CalculatedKPI = {
  key: string;
  label: string;
  description: string;
  value: number | null;
  formatted_value: string;
  format: KPIFormat;
  trend_direction: TrendDirection;
  trend_percentage: number;
  benchmark_value: number | null;
  benchmark_status: 'green' | 'amber' | 'red' | 'none';
  higher_is_better: boolean;
};

export function formatKPIValue(value: number | null, format: KPIFormat): string {
  if (value === null) return 'N/A';

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value / 100);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'months':
      return `${value} mo`;
    case 'ratio':
      return `${value.toFixed(1)}x`;
    case 'days':
      return `${value} days`;
    case 'number':
      return new Intl.NumberFormat('en-GB').format(value);
    default:
      return String(value);
  }
}
