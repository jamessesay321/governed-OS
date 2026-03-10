'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ModelSnapshot } from '@/types';

type Props = {
  snapshots: ModelSnapshot[];
};

export function CashFlowChart({ snapshots }: Props) {
  const data = snapshots.map((s) => ({
    period: s.period.slice(0, 7),
    'Cash In': s.cash_in,
    'Cash Out': -s.cash_out,
    'Net Cash Flow': s.net_cash_flow,
    'Closing Cash': s.closing_cash,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="period" className="text-xs" />
          <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
          <Legend />
          <Bar dataKey="Cash In" fill="hsl(var(--chart-1))" />
          <Bar dataKey="Cash Out" fill="hsl(var(--chart-2))" />
          <Bar dataKey="Net Cash Flow" fill="hsl(var(--chart-4))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
