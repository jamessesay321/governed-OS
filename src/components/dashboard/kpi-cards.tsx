'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardData {
  label: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'percentage';
  higherIsBetter: boolean;
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
  onCardClick?: (metric: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
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

export function KPICards({
  revenue,
  grossProfit,
  expenses,
  netProfit,
  previousRevenue,
  previousGrossProfit,
  previousExpenses,
  previousNetProfit,
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
    },
    {
      label: 'Gross Margin',
      value: grossMargin,
      previousValue: prevGrossMargin,
      format: 'percentage',
      higherIsBetter: true,
    },
    {
      label: 'Expenses',
      value: expenses,
      previousValue: previousExpenses,
      format: 'currency',
      higherIsBetter: false,
    },
    {
      label: 'Net Profit',
      value: netProfit,
      previousValue: previousNetProfit,
      format: 'currency',
      higherIsBetter: true,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const variance = getVariance(card.value, card.previousValue);
        const color = getVarianceColor(variance.direction, card.higherIsBetter);
        const bg = getVarianceBg(variance.direction, card.higherIsBetter);

        return (
          <Card
            key={card.label}
            className={`transition-shadow hover:shadow-md ${onCardClick ? 'cursor-pointer' : ''}`}
            onClick={() => onCardClick?.(card.label.toLowerCase().replace(/\s+/g, '_'))}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              {variance.direction !== 'flat' && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${bg} ${color}`}>
                  <TrendIcon direction={variance.direction} />
                  {Math.abs(variance.percentage).toFixed(1)}%
                </span>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.format === 'percentage'
                  ? formatPercentage(card.value)
                  : formatCurrency(card.value)}
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
