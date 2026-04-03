'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { SourceBadge } from '@/components/data-primitives';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatting/currency';

type BenchmarkStatus = 'green' | 'amber' | 'red' | 'none';

interface KPICardData {
  label: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'percentage';
  higherIsBetter: boolean;
  benchmarkStatus?: BenchmarkStatus;
}

interface KPICardsProps {
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  previousRevenue?: number;
  previousGrossProfit?: number;
  previousExpenses?: number;
  previousNetProfit?: number;
  /** Traffic-light benchmark statuses for each card (Fathom-style) */
  benchmarkStatuses?: {
    revenue?: BenchmarkStatus;
    grossMargin?: BenchmarkStatus;
    expenses?: BenchmarkStatus;
    netProfit?: BenchmarkStatus;
  };
  onCardClick?: (metric: string) => void;
}

function formatPercentage(value: number): string {
  return formatPercent(value);
}

function getVariance(current: number, previous: number | undefined): {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
} {
  if (previous === undefined || previous === 0) {
    return { direction: 'flat', percentage: 0 };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.5) return { direction: 'flat', percentage: 0 };
  return {
    direction: change > 0 ? 'up' : 'down',
    percentage: change,
  };
}

function getVarianceColor(
  direction: 'up' | 'down' | 'flat',
  higherIsBetter: boolean
): string {
  if (direction === 'flat') return 'text-muted-foreground';
  const isGood = higherIsBetter ? direction === 'up' : direction === 'down';
  return isGood ? 'text-green-600' : 'text-red-600';
}

function getVarianceBg(
  direction: 'up' | 'down' | 'flat',
  higherIsBetter: boolean
): string {
  if (direction === 'flat') return 'bg-muted';
  const isGood = higherIsBetter ? direction === 'up' : direction === 'down';
  return isGood ? 'bg-green-50' : 'bg-red-50';
}

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') return <TrendingUp className="h-3 w-3" />;
  if (direction === 'down') return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

const statusBorderColors: Record<BenchmarkStatus, string> = {
  green: 'border-l-4 border-l-green-500',
  amber: 'border-l-4 border-l-yellow-500',
  red: 'border-l-4 border-l-red-500',
  none: '',
};

const statusLabels: Record<BenchmarkStatus, { text: string; className: string }> = {
  green: { text: 'Above benchmark', className: 'text-green-600 bg-green-50' },
  amber: { text: 'Near benchmark', className: 'text-yellow-700 bg-yellow-50' },
  red: { text: 'Below benchmark', className: 'text-red-600 bg-red-50' },
  none: { text: '', className: '' },
};

export function KPICards({
  revenue,
  grossProfit,
  expenses,
  netProfit,
  previousRevenue,
  previousGrossProfit,
  previousExpenses,
  previousNetProfit,
  benchmarkStatuses,
  onCardClick,
}: KPICardsProps) {
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const prevGrossMargin = previousRevenue && previousRevenue > 0
    ? ((previousGrossProfit ?? 0) / previousRevenue) * 100
    : undefined;

  const cards: KPICardData[] = [
    {
      label: 'Revenue',
      value: revenue,
      previousValue: previousRevenue,
      format: 'currency',
      higherIsBetter: true,
      benchmarkStatus: benchmarkStatuses?.revenue,
    },
    {
      label: 'Gross Margin',
      value: grossMargin,
      previousValue: prevGrossMargin,
      format: 'percentage',
      higherIsBetter: true,
      benchmarkStatus: benchmarkStatuses?.grossMargin,
    },
    {
      label: 'Expenses',
      value: expenses,
      previousValue: previousExpenses,
      format: 'currency',
      higherIsBetter: false,
      benchmarkStatus: benchmarkStatuses?.expenses,
    },
    {
      label: 'Net Profit',
      value: netProfit,
      previousValue: previousNetProfit,
      format: 'currency',
      higherIsBetter: true,
      benchmarkStatus: benchmarkStatuses?.netProfit,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const variance = getVariance(card.value, card.previousValue);
        const color = getVarianceColor(variance.direction, card.higherIsBetter);
        const bg = getVarianceBg(variance.direction, card.higherIsBetter);

        const status = card.benchmarkStatus ?? 'none';
        const borderClass = statusBorderColors[status];
        const statusLabel = statusLabels[status];

        return (
          <Card
            key={card.label}
            className={`transition-shadow hover:shadow-md ${borderClass} ${onCardClick ? 'cursor-pointer' : ''}`}
            onClick={() => onCardClick?.(card.label.toLowerCase().replace(/\s+/g, '_'))}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <FinancialTooltip term={card.label}>{card.label}</FinancialTooltip>
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {status !== 'none' && (
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusLabel.className}`}>
                    {statusLabel.text}
                  </span>
                )}
                {variance.direction !== 'flat' && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${bg} ${color}`}>
                    <TrendIcon direction={variance.direction} />
                    {Math.abs(variance.percentage).toFixed(1)}%
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                  {card.format === 'percentage'
                    ? formatPercentage(card.value)
                    : formatCurrency(card.value)}
                </span>
                <SourceBadge source="actual" size="sm" />
              </div>
              {card.previousValue !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  vs {card.format === 'percentage'
                    ? formatPercentage(card.previousValue)
                    : formatCurrency(card.previousValue)} last month
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
