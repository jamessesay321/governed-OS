'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';

interface HeadcountCostWidgetProps {
  totalPayroll?: number;
  headcount?: number;
  trend?: number[]; // last 6 months of payroll cost
}

function MiniSparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeadcountCostWidget({
  totalPayroll = 145000,
  headcount = 18,
  trend = [128000, 132000, 135000, 140000, 143000, 145000],
}: HeadcountCostWidgetProps) {
  const costPerHead = headcount > 0 ? totalPayroll / headcount : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Headcount Cost</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
              <p className="text-xs text-muted-foreground">Monthly payroll</p>
            </div>
            <MiniSparkline data={trend} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted px-3 py-2 text-center">
              <p className="text-lg font-bold">{headcount}</p>
              <p className="text-[10px] text-muted-foreground">Headcount</p>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-center">
              <p className="text-lg font-bold">{formatCurrency(costPerHead)}</p>
              <p className="text-[10px] text-muted-foreground">Cost / Head</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
