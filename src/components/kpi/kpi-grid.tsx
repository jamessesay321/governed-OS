'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPISparkline } from './kpi-sparkline';
import { DollarSign, Percent, TrendingUp, Receipt, PiggyBank, BarChart3, Wallet, Target } from 'lucide-react';
import type { CalculatedKPI } from '@/lib/kpi/format';
import { formatPercent } from '@/lib/formatting/currency';
import type { KPISnapshot } from '@/types';

const KPI_ICON_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  revenue: { icon: DollarSign, bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600' },
  total_revenue: { icon: DollarSign, bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600' },
  gross_margin: { icon: Percent, bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600' },
  net_margin: { icon: Percent, bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600' },
  gross_profit: { icon: TrendingUp, bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600' },
  expenses: { icon: Receipt, bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-600' },
  operating_expenses: { icon: Receipt, bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-600' },
  net_profit: { icon: PiggyBank, bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-600' },
  operating_profit: { icon: PiggyBank, bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-600' },
  current_ratio: { icon: Target, bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-600' },
  quick_ratio: { icon: Target, bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-600' },
  cash_position: { icon: Wallet, bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600' },
};

const DEFAULT_ICON_CONFIG = { icon: BarChart3, bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-600' };

interface KPIGridProps {
  kpis: CalculatedKPI[];
  history?: Record<string, KPISnapshot[]>;
  onSelect?: (kpiKey: string) => void;
}

const statusColors: Record<string, string> = {
  green: 'border-l-green-500',
  amber: 'border-l-yellow-500',
  red: 'border-l-red-500',
  none: 'border-l-transparent',
};

const trendIcons: Record<string, { icon: string; color: string }> = {
  up: { icon: '\u2191', color: 'text-green-600' },
  down: { icon: '\u2193', color: 'text-red-600' },
  flat: { icon: '\u2192', color: 'text-muted-foreground' },
};

export function KPIGrid({ kpis, history, onSelect }: KPIGridProps) {
  if (kpis.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No KPI data available. Connect your accounting data first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const trend = trendIcons[kpi.trend_direction];
        const kpiHistory = history?.[kpi.key] || [];
        // For KPIs where higher is worse, flip the trend color
        const trendIsGood = kpi.higher_is_better
          ? kpi.trend_direction === 'up'
          : kpi.trend_direction === 'down';
        const trendColor = kpi.trend_direction === 'flat'
          ? 'text-muted-foreground'
          : trendIsGood
          ? 'text-green-600'
          : 'text-red-600';

        return (
          <Card
            key={kpi.key}
            className={`cursor-pointer border-l-4 transition-shadow hover:shadow-md ${
              statusColors[kpi.benchmark_status]
            }`}
            onClick={() => onSelect?.(kpi.key)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = KPI_ICON_CONFIG[kpi.key] || DEFAULT_ICON_CONFIG;
                    const Icon = config.icon;
                    return (
                      <div className={`rounded-lg p-2 ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.text}`} />
                      </div>
                    );
                  })()}
                  <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  {kpi.plainEnglish && (
                    <p className="text-[10px] text-muted-foreground/70 font-normal mt-0.5 leading-tight">
                      {kpi.plainEnglish}
                    </p>
                  )}
                  </div>
                </div>
                {kpi.benchmark_status !== 'none' && (
                  <Badge
                    variant="outline"
                    className={
                      kpi.benchmark_status === 'green'
                        ? 'border-green-500 text-green-700'
                        : kpi.benchmark_status === 'amber'
                        ? 'border-yellow-500 text-yellow-700'
                        : 'border-red-500 text-red-700'
                    }
                  >
                    {kpi.benchmark_status === 'green'
                      ? 'Above'
                      : kpi.benchmark_status === 'amber'
                      ? 'Average'
                      : 'Below'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{kpi.formatted_value}</div>
                  <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                    <span>{trend.icon}</span>
                    <span>
                      {formatPercent(Math.abs(kpi.trend_percentage))}
                    </span>
                  </div>
                </div>
                <KPISparkline
                  history={kpiHistory}
                  color={
                    kpi.benchmark_status === 'green'
                      ? '#16a34a'
                      : kpi.benchmark_status === 'red'
                      ? '#dc2626'
                      : '#2563eb'
                  }
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
