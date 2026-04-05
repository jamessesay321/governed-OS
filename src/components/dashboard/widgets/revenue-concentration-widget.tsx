'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomerConcentration {
  name: string;
  percentage: number;
}

interface RevenueConcentrationWidgetProps {
  customers?: CustomerConcentration[];
}

const PLACEHOLDER: CustomerConcentration[] = [
  { name: 'Acme Corp', percentage: 32 },
  { name: 'GlobalTech', percentage: 18 },
  { name: 'Smith & Co', percentage: 14 },
  { name: 'Bright Ltd', percentage: 9 },
  { name: 'Peak Inc', percentage: 7 },
];

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export function RevenueConcentrationWidget({ customers }: RevenueConcentrationWidgetProps) {
  const items = customers ?? PLACEHOLDER;
  const totalConcentration = items.reduce((s, c) => s + c.percentage, 0);
  const isHighRisk = items.length > 0 && items[0].percentage > 30;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Revenue Concentration</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No customer data</p>
        ) : (
          <div className="space-y-3">
            {isHighRisk && (
              <div className="rounded bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                High concentration risk: top customer &gt;30%
              </div>
            )}
            {items.map((customer, i) => (
              <div key={customer.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{customer.name}</span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {customer.percentage}%
                  </span>
                </div>
                <div className="h-3 w-full rounded bg-muted">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${customer.percentage}%`,
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground text-right">
              Top 5 = {totalConcentration}% of revenue
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
