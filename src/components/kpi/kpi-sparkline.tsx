'use client';

import { ResponsiveContainer, LineChart, Line } from 'recharts';
import type { KPISnapshot } from '@/types';

interface KPISparklineProps {
  history: KPISnapshot[];
  color?: string;
}

export function KPISparkline({ history, color = '#2563eb' }: KPISparklineProps) {
  if (history.length < 2) return null;

  const data = history.map((snap) => ({
    period: snap.period,
    value: snap.value,
  }));

  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
