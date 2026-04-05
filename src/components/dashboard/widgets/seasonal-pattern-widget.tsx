'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SeasonalPatternWidgetProps {
  currentYear?: { month: string; revenue: number }[];
  lastYear?: { month: string; revenue: number }[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PLACEHOLDER_CURRENT = MONTHS.map((m, i) => ({
  month: m,
  revenue: 200000 + Math.sin(i * 0.5) * 40000 + i * 3000,
}));

const PLACEHOLDER_LAST = MONTHS.map((m, i) => ({
  month: m,
  revenue: 180000 + Math.sin(i * 0.5) * 35000 + i * 2000,
}));

function SeasonalChart({
  current,
  last,
}: {
  current: { month: string; revenue: number }[];
  last: { month: string; revenue: number }[];
}) {
  const w = 280;
  const h = 120;
  const padX = 25;
  const padY = 10;
  const padBottom = 16;
  const chartW = w - padX * 2;
  const chartH = h - padY - padBottom;

  const allValues = [...current.map((d) => d.revenue), ...last.map((d) => d.revenue)];
  const minVal = Math.min(...allValues) * 0.9;
  const maxVal = Math.max(...allValues) * 1.05;
  const range = maxVal - minVal || 1;

  const maxLen = Math.max(current.length, last.length);

  function toX(i: number): number {
    return padX + (i / (maxLen - 1)) * chartW;
  }
  function toY(v: number): number {
    return padY + chartH - ((v - minVal) / range) * chartH;
  }

  const currentPoints = current.map((d, i) => `${toX(i)},${toY(d.revenue)}`).join(' ');
  const lastPoints = last.map((d, i) => `${toX(i)},${toY(d.revenue)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Last year line (dashed) */}
      <polyline
        points={lastPoints}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {/* Current year line (solid) */}
      <polyline points={currentPoints} fill="none" stroke="#6366f1" strokeWidth="2" />

      {/* X labels — show every 3rd month */}
      {current
        .filter((_, i) => i % 3 === 0)
        .map((d, idx) => {
          const origIdx = idx * 3;
          return (
            <text
              key={d.month}
              x={toX(origIdx)}
              y={h - 2}
              textAnchor="middle"
              fontSize="8"
              fill="hsl(var(--muted-foreground))"
            >
              {d.month}
            </text>
          );
        })}
    </svg>
  );
}

export function SeasonalPatternWidget({ currentYear, lastYear }: SeasonalPatternWidgetProps) {
  const current = currentYear ?? PLACEHOLDER_CURRENT;
  const last = lastYear ?? PLACEHOLDER_LAST;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Seasonal Pattern</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-indigo-500" />
              Current Year
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 border-t border-dashed border-slate-400" />
              Last Year
            </span>
          </div>
          <SeasonalChart current={current} last={last} />
        </div>
      </CardContent>
    </Card>
  );
}
