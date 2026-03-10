'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KPICardsProps {
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KPICards({ revenue, grossProfit, expenses, netProfit }: KPICardsProps) {
  const cards = [
    { label: 'Revenue', value: revenue, color: 'text-green-600' },
    { label: 'Gross Profit', value: grossProfit, color: 'text-blue-600' },
    { label: 'Expenses', value: expenses, color: 'text-orange-600' },
    {
      label: 'Net Profit',
      value: netProfit,
      color: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {formatCurrency(card.value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
