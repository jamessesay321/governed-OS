'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TopExpense {
  category: string;
  amount: number;
  trend: 'up' | 'down' | 'flat';
}

interface TopExpensesWidgetProps {
  expenses?: TopExpense[];
}

const PLACEHOLDER: TopExpense[] = [
  { category: 'Payroll', amount: 145000, trend: 'up' },
  { category: 'Rent & Utilities', amount: 12000, trend: 'flat' },
  { category: 'Software & SaaS', amount: 8500, trend: 'up' },
  { category: 'Professional Services', amount: 6200, trend: 'down' },
  { category: 'Marketing', amount: 4800, trend: 'up' },
];

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-red-500" />;
    case 'down':
      return <TrendingDown className="h-3 w-3 text-emerald-500" />;
    case 'flat':
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
}

export function TopExpensesWidget({ expenses }: TopExpensesWidgetProps) {
  const items = expenses ?? PLACEHOLDER;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No expense data</p>
        ) : (
          <div className="space-y-2">
            {items.map((expense, i) => (
              <div
                key={expense.category}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium truncate">{expense.category}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-semibold">{formatCurrency(expense.amount)}</span>
                  <TrendIcon trend={expense.trend} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
