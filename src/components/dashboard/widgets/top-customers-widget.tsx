'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';

interface TopCustomer {
  name: string;
  revenue: number;
  percentage: number;
}

interface TopCustomersWidgetProps {
  customers?: TopCustomer[];
}

const PLACEHOLDER: TopCustomer[] = [
  { name: 'Acme Corporation', revenue: 84000, percentage: 32 },
  { name: 'GlobalTech Solutions', revenue: 47000, percentage: 18 },
  { name: 'Smith & Partners', revenue: 37000, percentage: 14 },
  { name: 'Bright Industries', revenue: 24000, percentage: 9 },
  { name: 'Peak Enterprises', revenue: 18000, percentage: 7 },
];

export function TopCustomersWidget({ customers }: TopCustomersWidgetProps) {
  const items = customers ?? PLACEHOLDER;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No customer data</p>
        ) : (
          <div className="space-y-2">
            {items.map((customer, i) => (
              <div
                key={customer.name}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium truncate">{customer.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-xs font-semibold">{formatCurrency(customer.revenue)}</span>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {customer.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
