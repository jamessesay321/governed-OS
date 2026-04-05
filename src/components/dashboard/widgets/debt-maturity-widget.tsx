'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';

interface DebtMaturityItem {
  name: string;
  amount: number;
  dueDate: string; // ISO date
  daysUntilDue: number;
}

interface DebtMaturityWidgetProps {
  debts?: DebtMaturityItem[];
}

const PLACEHOLDER_DEBTS: DebtMaturityItem[] = [
  { name: 'Term Loan A', amount: 50000, dueDate: '2026-07-15', daysUntilDue: 101 },
  { name: 'Credit Line', amount: 25000, dueDate: '2026-09-01', daysUntilDue: 149 },
  { name: 'Equipment Lease', amount: 12000, dueDate: '2026-12-31', daysUntilDue: 270 },
  { name: 'Term Loan B', amount: 80000, dueDate: '2027-06-15', daysUntilDue: 436 },
];

function getBarColor(daysUntilDue: number): string {
  if (daysUntilDue <= 90) return '#ef4444'; // red
  if (daysUntilDue <= 180) return '#f59e0b'; // amber
  return '#10b981'; // green
}

export function DebtMaturityWidget({ debts }: DebtMaturityWidgetProps) {
  const items = debts ?? PLACEHOLDER_DEBTS;
  const maxDays = Math.max(...items.map((d) => d.daysUntilDue), 365);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Debt Maturity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No debt data</p>
        ) : (
          <div className="space-y-3">
            {items.map((debt) => {
              const widthPct = Math.max((debt.daysUntilDue / maxDays) * 100, 8);
              return (
                <div key={debt.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate">{debt.name}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {formatCurrency(debt.amount)}
                    </span>
                  </div>
                  <div className="relative h-5 w-full rounded bg-muted">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: getBarColor(debt.daysUntilDue),
                      }}
                    />
                    <span className="absolute right-1 top-0.5 text-[10px] text-muted-foreground">
                      {debt.daysUntilDue}d
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> &lt;90d
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> 90-180d
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> &gt;180d
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
