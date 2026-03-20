'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PnLSummary } from '@/lib/financial/aggregate';

interface WaterfallChartProps {
  pnl: PnLSummary;
}

interface WaterfallBar {
  name: string;
  value: number;
  displayValue: number;
  start: number;
  type: 'positive' | 'negative' | 'total';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildWaterfallData(pnl: PnLSummary): WaterfallBar[] {
  const data: WaterfallBar[] = [];

  // Revenue (full bar)
  data.push({
    name: 'Revenue',
    value: pnl.revenue,
    displayValue: pnl.revenue,
    start: 0,
    type: 'total',
  });

  // Cost of Sales (subtract)
  data.push({
    name: 'COGS',
    value: -pnl.costOfSales,
    displayValue: pnl.costOfSales,
    start: pnl.revenue - pnl.costOfSales,
    type: 'negative',
  });

  // Gross Profit (subtotal)
  data.push({
    name: 'Gross Profit',
    value: pnl.grossProfit,
    displayValue: pnl.grossProfit,
    start: 0,
    type: 'total',
  });

  // Operating Expenses (subtract)
  data.push({
    name: 'OpEx',
    value: -pnl.expenses,
    displayValue: pnl.expenses,
    start: pnl.grossProfit - pnl.expenses,
    type: 'negative',
  });

  // Net Profit (final total)
  data.push({
    name: 'Net Profit',
    value: pnl.netProfit,
    displayValue: pnl.netProfit,
    start: 0,
    type: pnl.netProfit >= 0 ? 'total' : 'negative',
  });

  return data;
}

function getBarColor(type: 'positive' | 'negative' | 'total'): string {
  switch (type) {
    case 'positive':
      return '#16a34a'; // green-600
    case 'negative':
      return '#dc2626'; // red-600
    case 'total':
      return '#6b7280'; // gray-500
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WaterfallBar }> }) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="text-sm font-medium">{data.name}</p>
      <p className={`text-sm font-bold ${data.type === 'negative' ? 'text-red-600' : 'text-foreground'}`}>
        {data.type === 'negative' ? '-' : ''}{formatCurrency(Math.abs(data.displayValue))}
      </p>
      {data.type !== 'total' && (
        <p className="text-xs text-muted-foreground">
          {((data.displayValue / (data.start + data.displayValue)) * 100).toFixed(1)}% of revenue
        </p>
      )}
    </div>
  );
}

export function WaterfallChart({ pnl }: WaterfallChartProps) {
  const data = buildWaterfallData(pnl);

  if (pnl.revenue === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue to Net Profit Bridge</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCurrency(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#e5e7eb" />

              {/* Invisible base bar (creates floating effect) */}
              <Bar dataKey="start" stackId="waterfall" fill="transparent" />

              {/* Visible bar segment */}
              <Bar dataKey="displayValue" stackId="waterfall" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.type)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
