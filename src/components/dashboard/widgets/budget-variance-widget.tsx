'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatting/currency';

interface BudgetItem {
  name: string;
  actual: number;
  budget: number;
}

interface BudgetVarianceWidgetProps {
  items?: BudgetItem[];
}

const PLACEHOLDER: BudgetItem[] = [
  { name: 'Revenue', actual: 260000, budget: 250000 },
  { name: 'Payroll', actual: 145000, budget: 140000 },
  { name: 'Marketing', actual: 4800, budget: 8000 },
  { name: 'Rent', actual: 12000, budget: 12000 },
  { name: 'Software', actual: 8500, budget: 7000 },
];

export function BudgetVarianceWidget({ items }: BudgetVarianceWidgetProps) {
  const data = items ?? PLACEHOLDER;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Budget Variance</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No budget data</p>
        ) : (
          <div className="space-y-3">
            {data.map((item) => {
              const variance = item.actual - item.budget;
              const variancePct = item.budget !== 0 ? (variance / item.budget) * 100 : 0;
              // For revenue, positive variance is good. For expenses, negative is good.
              const isRevenue = item.name.toLowerCase() === 'revenue';
              const isGood = isRevenue ? variance >= 0 : variance <= 0;
              const barColor = isGood ? '#10b981' : '#ef4444';
              const maxAbs = Math.max(Math.abs(item.actual), Math.abs(item.budget));
              const actualPct = maxAbs > 0 ? (item.actual / maxAbs) * 100 : 0;
              const budgetPct = maxAbs > 0 ? (item.budget / maxAbs) * 100 : 0;

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{item.name}</span>
                    <span className={`font-semibold ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
                      {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                      <span className="text-muted-foreground font-normal ml-1">
                        ({variancePct >= 0 ? '+' : ''}{formatPercent(variancePct)})
                      </span>
                    </span>
                  </div>
                  <div className="relative h-4 w-full rounded bg-muted">
                    {/* Budget line */}
                    <div
                      className="absolute top-0 h-full border-r-2 border-dashed border-gray-400"
                      style={{ width: `${budgetPct}%` }}
                    />
                    {/* Actual bar */}
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${actualPct}%`, backgroundColor: barColor, opacity: 0.7 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Actual: {formatCurrency(item.actual)}</span>
                    <span>Budget: {formatCurrency(item.budget)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
