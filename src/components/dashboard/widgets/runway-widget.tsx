'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';

interface RunwayWidgetProps {
  cashBalance?: number;
  monthlyBurn?: number;
  runwayMonths?: number;
}

/**
 * Bullet graph following Stephen Few's specification.
 * Qualitative ranges as graduated grey bands.
 * Actual value as shorter dark bar.
 * Target as thin vertical line marker.
 */
function BulletGraph({
  value,
  target,
  maxRange,
}: {
  value: number;
  target: number;
  maxRange: number;
}) {
  const w = 260;
  const h = 32;
  const barH = 14;
  const barY = (h - barH) / 2;
  const actualH = 8;
  const actualY = (h - actualH) / 2;

  // Qualitative ranges: poor (0-33%), ok (33-67%), good (67-100%)
  const thirdW = w / 3;

  function toX(v: number): number {
    return Math.min((v / maxRange) * w, w);
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Qualitative ranges — graduated grey */}
      <rect x={0} y={barY} width={thirdW} height={barH} fill="#d1d5db" rx={2} />
      <rect x={thirdW} y={barY} width={thirdW} height={barH} fill="#e5e7eb" rx={0} />
      <rect x={thirdW * 2} y={barY} width={thirdW} height={barH} fill="#f3f4f6" rx={2} />

      {/* Actual value bar */}
      <rect
        x={0}
        y={actualY}
        width={toX(value)}
        height={actualH}
        fill={value < target * 0.5 ? '#ef4444' : value < target ? '#f59e0b' : '#10b981'}
        rx={2}
      />

      {/* Target marker */}
      <line
        x1={toX(target)}
        y1={barY - 2}
        x2={toX(target)}
        y2={barY + barH + 2}
        stroke="#1f2937"
        strokeWidth={2}
      />
    </svg>
  );
}

export function RunwayWidget({
  cashBalance = 420000,
  monthlyBurn = 35000,
  runwayMonths,
}: RunwayWidgetProps) {
  const computed = runwayMonths ?? (monthlyBurn > 0 ? cashBalance / monthlyBurn : 0);
  const target = 12; // 12 months target
  const maxRange = Math.max(computed, target, 24);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cash Runway</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <p className={`text-3xl font-bold ${computed >= 12 ? 'text-emerald-600' : computed >= 6 ? 'text-amber-600' : 'text-red-600'}`}>
              {computed.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">months of runway</p>
          </div>

          <BulletGraph value={computed} target={target} maxRange={maxRange} />

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded bg-muted px-2 py-1.5">
              <p className="text-sm font-semibold">{formatCurrency(cashBalance)}</p>
              <p className="text-[10px] text-muted-foreground">Cash Balance</p>
            </div>
            <div className="rounded bg-muted px-2 py-1.5">
              <p className="text-sm font-semibold">{formatCurrency(monthlyBurn)}</p>
              <p className="text-[10px] text-muted-foreground">Monthly Burn</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Target: {target} months</span>
            <span className="font-medium">
              | = target
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
