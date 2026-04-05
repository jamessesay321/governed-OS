'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MarginDataPoint {
  period: string;
  grossMargin: number;
  netMargin: number;
}

interface MarginTrendWidgetProps {
  data?: MarginDataPoint[];
}

const PLACEHOLDER: MarginDataPoint[] = [
  { period: '2025-10', grossMargin: 62, netMargin: 18 },
  { period: '2025-11', grossMargin: 64, netMargin: 20 },
  { period: '2025-12', grossMargin: 61, netMargin: 17 },
  { period: '2026-01', grossMargin: 65, netMargin: 22 },
  { period: '2026-02', grossMargin: 63, netMargin: 19 },
  { period: '2026-03', grossMargin: 66, netMargin: 23 },
];

function formatPeriodShort(period: string): string {
  const d = new Date(period + '-01T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short' });
}

/**
 * Pure SVG area chart for margin trends — no Recharts dependency in this widget.
 */
function MarginAreaChart({ data }: { data: MarginDataPoint[] }) {
  const w = 280;
  const h = 120;
  const padX = 30;
  const padY = 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const allValues = data.flatMap((d) => [d.grossMargin, d.netMargin]);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 100);
  const range = maxVal - minVal || 1;

  function toX(i: number): number {
    return padX + (i / (data.length - 1)) * chartW;
  }
  function toY(v: number): number {
    return padY + chartH - ((v - minVal) / range) * chartH;
  }

  const grossPoints = data.map((d, i) => `${toX(i)},${toY(d.grossMargin)}`).join(' ');
  const netPoints = data.map((d, i) => `${toX(i)},${toY(d.netMargin)}`).join(' ');

  // Area fill paths
  const grossArea = `M${toX(0)},${toY(minVal)} ` +
    data.map((d, i) => `L${toX(i)},${toY(d.grossMargin)}`).join(' ') +
    ` L${toX(data.length - 1)},${toY(minVal)} Z`;
  const netArea = `M${toX(0)},${toY(minVal)} ` +
    data.map((d, i) => `L${toX(i)},${toY(d.netMargin)}`).join(' ') +
    ` L${toX(data.length - 1)},${toY(minVal)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Gross margin area */}
      <path d={grossArea} fill="#10b981" fillOpacity="0.15" />
      <polyline points={grossPoints} fill="none" stroke="#10b981" strokeWidth="2" />

      {/* Net margin area */}
      <path d={netArea} fill="#6366f1" fillOpacity="0.15" />
      <polyline points={netPoints} fill="none" stroke="#6366f1" strokeWidth="2" />

      {/* X labels */}
      {data.map((d, i) => (
        <text
          key={d.period}
          x={toX(i)}
          y={h - 1}
          textAnchor="middle"
          fontSize="8"
          fill="hsl(var(--muted-foreground))"
        >
          {formatPeriodShort(d.period)}
        </text>
      ))}
    </svg>
  );
}

export function MarginTrendWidget({ data }: MarginTrendWidgetProps) {
  const items = data ?? PLACEHOLDER;
  const latest = items[items.length - 1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Margin Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No margin data</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Gross {latest?.grossMargin ?? 0}%
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                Net {latest?.netMargin ?? 0}%
              </span>
            </div>
            <MarginAreaChart data={items} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
