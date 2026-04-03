'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartAxisFormatter, chartTooltipFormatter } from '@/lib/formatting/currency';
import type { ModelSnapshot } from '@/types';

type Props = {
  snapshots: ModelSnapshot[];
};

export function ForecastChart({ snapshots }: Props) {
  const data = snapshots.map((s) => ({
    period: s.period.slice(0, 7),
    Revenue: s.revenue,
    'Cost of Sales': s.cost_of_sales,
    'Operating Expenses': s.operating_expenses,
    'Net Profit': s.net_profit,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="period" className="text-xs" />
          <YAxis className="text-xs" tickFormatter={chartAxisFormatter()} />
          <Tooltip formatter={(value) => chartTooltipFormatter()(Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Cost of Sales" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Operating Expenses" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Net Profit" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
