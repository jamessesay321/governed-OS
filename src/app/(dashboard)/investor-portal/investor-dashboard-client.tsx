'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from '@/lib/formatting/currency';
import type { CalculatedKPI } from '@/lib/kpi/engine';

interface RevenueTrendPoint {
  period: string;
  revenue: number;
}

interface InvestorDashboardClientProps {
  orgName: string;
  kpis: CalculatedKPI[];
  revenueTrend: RevenueTrendPoint[];
  latestPeriod: string;
  lastSyncDate: string | null;
  baseCurrency: string;
  isInvestorView: boolean;
}

function formatPeriodLabel(period: string): string {
  try {
    const date = new Date(period + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  } catch {
    return period;
  }
}

function TrendBadge({ direction, percentage }: { direction: string; percentage: number }) {
  if (direction === 'flat' || percentage === 0) {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 text-xs">
        --
      </Badge>
    );
  }

  const isUp = direction === 'up';
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {isUp ? '+' : ''}{percentage.toFixed(1)}%
    </Badge>
  );
}

function KPICard({
  kpi,
  baseCurrency,
}: {
  kpi: CalculatedKPI;
  baseCurrency: string;
}) {
  const displayValue = (() => {
    if (kpi.value === null) return 'N/A';
    switch (kpi.format) {
      case 'currency':
        return formatCurrency(kpi.value / 100, baseCurrency);
      case 'percentage':
        return formatPercent(kpi.value, true);
      case 'ratio':
        return `${kpi.value.toFixed(1)}x`;
      case 'months':
        return `${kpi.value} mo`;
      case 'days':
        return `${kpi.value} days`;
      default:
        return kpi.formatted_value;
    }
  })();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{displayValue}</p>
          </div>
          <TrendBadge direction={kpi.trend_direction} percentage={kpi.trend_percentage} />
        </div>
        {kpi.plainEnglish && (
          <p className="text-xs text-muted-foreground mt-2">{kpi.plainEnglish}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBarChart({
  data,
  baseCurrency,
}: {
  data: RevenueTrendPoint[];
  baseCurrency: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No revenue data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="space-y-3">
      {/* Y-axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{formatCurrencyCompact(0, baseCurrency)}</span>
        <span>{formatCurrencyCompact(maxRevenue, baseCurrency)}</span>
      </div>
      {/* Bars */}
      <div className="flex items-end gap-1 h-40">
        {data.map((point) => {
          const heightPct = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
          return (
            <div
              key={point.period}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div className="w-full relative" style={{ height: '160px' }}>
                <div
                  className="absolute bottom-0 w-full rounded-t bg-primary/80 hover:bg-primary transition-colors"
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                  title={`${formatPeriodLabel(point.period)}: ${formatCurrency(point.revenue, baseCurrency)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1">
        {data.map((point, i) => (
          <div key={point.period} className="flex-1 text-center">
            {/* Show every other label to prevent crowding */}
            {i % 2 === 0 || data.length <= 6 ? (
              <span className="text-[10px] text-muted-foreground">
                {formatPeriodLabel(point.period)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InvestorDashboardClient({
  orgName,
  kpis,
  revenueTrend,
  latestPeriod,
  lastSyncDate,
  baseCurrency,
  isInvestorView,
}: InvestorDashboardClientProps) {
  // Extract key metrics
  const revenueKpi = kpis.find((k) => k.key === 'revenue');
  const grossMarginKpi = kpis.find((k) => k.key === 'gross_margin');
  const netMarginKpi = kpis.find((k) => k.key === 'net_margin');
  const currentRatioKpi = kpis.find((k) => k.key === 'current_ratio');
  const debtToEquityKpi = kpis.find((k) => k.key === 'debt_to_equity');
  const momGrowthKpi = kpis.find((k) => k.key === 'revenue_growth_mom');
  const yoyGrowthKpi = kpis.find((k) => k.key === 'revenue_growth_yoy');

  // Cash position (may be stored as 'cash_balance' or 'cash_position')
  const cashKpi = kpis.find(
    (k) => k.key === 'cash_balance' || k.key === 'cash_position' || k.key === 'cash'
  );

  // Key ratios for display
  const keyRatios = [grossMarginKpi, netMarginKpi, currentRatioKpi, debtToEquityKpi].filter(
    Boolean
  ) as CalculatedKPI[];

  // Growth metrics
  const growthMetrics = [momGrowthKpi, yoyGrowthKpi].filter(Boolean) as CalculatedKPI[];

  // All other KPIs not already highlighted
  const highlightedKeys = new Set([
    'revenue',
    'gross_margin',
    'net_margin',
    'current_ratio',
    'debt_to_equity',
    'revenue_growth_mom',
    'revenue_growth_yoy',
    'cash_balance',
    'cash_position',
    'cash',
  ]);
  const otherKpis = kpis.filter((k) => !highlightedKeys.has(k.key));

  const freshness = lastSyncDate
    ? `Data as of ${new Date(lastSyncDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'Data freshness unavailable';

  const hasData = kpis.length > 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isInvestorView ? `${orgName} - Investor Dashboard` : 'Investor Portal'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isInvestorView
              ? 'Read-only view of shared financial metrics'
              : 'Financial overview for investor stakeholders'}
          </p>
        </div>
        <Badge variant="outline" className="bg-slate-50 text-slate-500 text-xs">
          {freshness}
        </Badge>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="h-12 w-12 text-muted-foreground mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <h3 className="font-semibold text-foreground mb-1">No financial data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {isInvestorView
                ? 'The organisation has not yet synced financial data. Check back soon.'
                : 'Connect your accounting integration to populate investor-facing metrics.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top-level metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {revenueKpi && (
              <KPICard kpi={revenueKpi} baseCurrency={baseCurrency} />
            )}
            {cashKpi && (
              <KPICard kpi={cashKpi} baseCurrency={baseCurrency} />
            )}
            {grossMarginKpi && (
              <KPICard kpi={grossMarginKpi} baseCurrency={baseCurrency} />
            )}
            {netMarginKpi && (
              <KPICard kpi={netMarginKpi} baseCurrency={baseCurrency} />
            )}
          </div>

          {/* Revenue Trend Chart */}
          {revenueTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend (Last 12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={revenueTrend} baseCurrency={baseCurrency} />
              </CardContent>
            </Card>
          )}

          {/* Key Ratios */}
          {keyRatios.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Key Ratios
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {keyRatios.map((kpi) => (
                  <KPICard key={kpi.key} kpi={kpi} baseCurrency={baseCurrency} />
                ))}
              </div>
            </div>
          )}

          {/* Growth Metrics */}
          {growthMetrics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Growth Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {growthMetrics.map((kpi) => (
                  <KPICard key={kpi.key} kpi={kpi} baseCurrency={baseCurrency} />
                ))}
              </div>
            </div>
          )}

          {/* Additional shared KPIs */}
          {otherKpis.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Additional Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherKpis.map((kpi) => (
                  <KPICard key={kpi.key} kpi={kpi} baseCurrency={baseCurrency} />
                ))}
              </div>
            </div>
          )}

          {/* Period indicator */}
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            Showing data for period: {formatPeriodLabel(latestPeriod)}
            {isInvestorView && (
              <span className="ml-2">
                | This is a read-only investor view. Contact the organisation for detailed breakdowns.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
