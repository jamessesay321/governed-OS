'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GrowthMetricsWidgetProps {
  momGrowth?: number; // percentage
  yoyGrowth?: number; // percentage
  cmgr?: number; // compound monthly growth rate percentage
}

function MetricRow({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  const isPositive = value > 0;
  const isFlat = Math.abs(value) < 0.5;

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {isFlat ? (
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
        <span
          className={`text-lg font-bold ${
            isFlat
              ? 'text-muted-foreground'
              : isPositive
                ? 'text-emerald-600'
                : 'text-red-600'
          }`}
        >
          {value >= 0 ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function GrowthMetricsWidget({
  momGrowth = 4.2,
  yoyGrowth = 18.5,
  cmgr = 1.5,
}: GrowthMetricsWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Growth Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <MetricRow
            label="Month-over-Month"
            value={momGrowth}
            description="Revenue growth vs previous month"
          />
          <MetricRow
            label="Year-over-Year"
            value={yoyGrowth}
            description="Revenue growth vs same month last year"
          />
          <MetricRow
            label="CMGR"
            value={cmgr}
            description="Compound monthly growth rate (12m)"
          />
        </div>
      </CardContent>
    </Card>
  );
}
