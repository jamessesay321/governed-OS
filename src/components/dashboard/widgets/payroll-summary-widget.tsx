'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';

interface PayrollSummaryWidgetProps {
  totalPayroll?: number;
  employerNI?: number;
  employerPension?: number;
  trend?: number[]; // last 6 months total cost
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

export function PayrollSummaryWidget({
  totalPayroll = 145000,
  employerNI = 18200,
  employerPension = 5800,
  trend = [158000, 162000, 160000, 165000, 168000, 169000],
}: PayrollSummaryWidgetProps) {
  const totalCost = totalPayroll + employerNI + employerPension;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Payroll Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
              <p className="text-xs text-muted-foreground">Total employment cost</p>
            </div>
            <MiniSparkline data={trend} color="#8b5cf6" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Gross Payroll</span>
              <span className="font-medium">{formatCurrency(totalPayroll)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Employer NI</span>
              <span className="font-medium">{formatCurrency(employerNI)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Employer Pension</span>
              <span className="font-medium">{formatCurrency(employerPension)}</span>
            </div>
            <div className="border-t pt-1.5 flex items-center justify-between text-xs font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
