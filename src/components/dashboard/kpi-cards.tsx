'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { SourceBadge } from '@/components/data-primitives';
import { TrendingUp, TrendingDown, Minus, DollarSign, Percent, Receipt, PiggyBank, BarChart3, Wallet, Target, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatting/currency';
import type { SenseCheckFlag, FlagSeverity } from '@/lib/intelligence/sense-check';

type BenchmarkStatus = 'green' | 'amber' | 'red' | 'none';

interface KPICardData {
  label: string;
  value: number;
  previousValue?: number;
  priorYearValue?: number;
  trendData?: number[];
  format: 'currency' | 'percentage';
  higherIsBetter: boolean;
  benchmarkStatus?: BenchmarkStatus;
}

interface KPICardsProps {
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  previousRevenue?: number;
  previousGrossProfit?: number;
  previousExpenses?: number;
  previousNetProfit?: number;
  /** Prior year values for YoY comparison */
  priorYearRevenue?: number;
  priorYearGrossProfit?: number;
  priorYearExpenses?: number;
  priorYearNetProfit?: number;
  /** Last 6 period values for sparkline trend [oldest → newest] */
  trendRevenue?: number[];
  trendGrossMargin?: number[];
  trendExpenses?: number[];
  trendNetProfit?: number[];
  /** Traffic-light benchmark statuses for each card (Fathom-style) */
  benchmarkStatuses?: {
    revenue?: BenchmarkStatus;
    grossMargin?: BenchmarkStatus;
    expenses?: BenchmarkStatus;
    netProfit?: BenchmarkStatus;
  };
  /** Intelligence flags from sense-check engine */
  senseCheckFlags?: SenseCheckFlag[];
  onCardClick?: (metric: string) => void;
}

const KPI_ICONS: Record<string, React.ElementType> = {
  revenue: DollarSign,
  gross_margin: Percent,
  gross_profit: TrendingUp,
  expenses: Receipt,
  operating_expenses: Receipt,
  net_profit: PiggyBank,
  net_margin: BarChart3,
  current_ratio: Target,
  cash_position: Wallet,
};

function getVariance(current: number, previous: number | undefined): {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
} {
  if (previous === undefined || previous === 0) {
    return { direction: 'flat', percentage: 0 };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.5) return { direction: 'flat', percentage: 0 };
  return {
    direction: change > 0 ? 'up' : 'down',
    percentage: change,
  };
}

function getVarianceColor(
  direction: 'up' | 'down' | 'flat',
  higherIsBetter: boolean
): string {
  if (direction === 'flat') return 'text-muted-foreground';
  const isGood = higherIsBetter ? direction === 'up' : direction === 'down';
  return isGood ? 'text-green-600' : 'text-red-600';
}

function getVarianceBg(
  direction: 'up' | 'down' | 'flat',
  higherIsBetter: boolean
): string {
  if (direction === 'flat') return 'bg-muted';
  const isGood = higherIsBetter ? direction === 'up' : direction === 'down';
  return isGood ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30';
}

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') return <TrendingUp className="h-3 w-3" />;
  if (direction === 'down') return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

const statusBorderColors: Record<BenchmarkStatus, string> = {
  green: 'border-l-4 border-l-green-500',
  amber: 'border-l-4 border-l-yellow-500',
  red: 'border-l-4 border-l-red-500',
  none: '',
};

const statusLabels: Record<BenchmarkStatus, { text: string; className: string }> = {
  green: { text: 'Above benchmark', className: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/50' },
  amber: { text: 'Near benchmark', className: 'text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/50' },
  red: { text: 'Below benchmark', className: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50' },
  none: { text: '', className: '' },
};

// ─── Sense-Check Flag Renderers ──────────────────────────────────
const SEVERITY_STYLES: Record<FlagSeverity, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  critical: { icon: AlertCircle, bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900' },
  warning:  { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900' },
  info:     { icon: Info, bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900' },
};

function FlagBadge({ flag }: { flag: SenseCheckFlag }) {
  const style = SEVERITY_STYLES[flag.severity];
  const Icon = style.icon;
  return (
    <div className={`mt-2 rounded-md border px-2.5 py-1.5 ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-1.5">
        <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${style.text}`} />
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold leading-tight ${style.text}`}>{flag.title}</p>
          <p className={`text-[10px] leading-snug mt-0.5 opacity-80 ${style.text}`}>{flag.detail}</p>
          {flag.benchmark && (
            <p className={`text-[10px] font-medium mt-1 ${style.text}`}>
              {flag.benchmark.label}: {flag.benchmark.value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const METRIC_KEY_MAP: Record<string, string> = {
  'Revenue': 'revenue',
  'Gross Margin': 'gross_margin',
  'Expenses': 'expenses',
  'Net Profit': 'net_profit',
};

// ─── Inline Sparkline (pure SVG) ──────────────────────────────────
function Sparkline({
  data,
  higherIsBetter,
  width = 64,
  height = 24,
}: {
  data: number[];
  higherIsBetter: boolean;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const usableH = height - padding * 2;
  const usableW = width - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * usableW;
    const y = padding + usableH - ((v - min) / range) * usableH;
    return `${x},${y}`;
  });

  // Determine trend color from first to last value
  const first = data[0];
  const last = data[data.length - 1];
  const isUp = last > first;
  const isGood = higherIsBetter ? isUp : !isUp;
  const strokeColor = first === last
    ? 'rgba(156, 163, 175, 0.6)'
    : isGood
      ? 'rgba(34, 197, 94, 0.7)'
      : 'rgba(239, 68, 68, 0.7)';

  // Build area fill path
  const areaPath = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(' ')} L${padding + usableW},${height - padding} L${padding},${height - padding} Z`;
  const fillColor = first === last
    ? 'rgba(156, 163, 175, 0.08)'
    : isGood
      ? 'rgba(34, 197, 94, 0.08)'
      : 'rgba(239, 68, 68, 0.08)';

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on the latest value */}
      <circle
        cx={padding + usableW}
        cy={padding + usableH - ((last - min) / range) * usableH}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}

export function KPICards({
  revenue,
  grossProfit,
  expenses,
  netProfit,
  previousRevenue,
  previousGrossProfit,
  previousExpenses,
  previousNetProfit,
  priorYearRevenue,
  priorYearGrossProfit,
  priorYearExpenses,
  priorYearNetProfit,
  trendRevenue,
  trendGrossMargin,
  trendExpenses,
  trendNetProfit,
  benchmarkStatuses,
  senseCheckFlags = [],
  onCardClick,
}: KPICardsProps) {
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const prevGrossMargin = previousRevenue && previousRevenue > 0
    ? ((previousGrossProfit ?? 0) / previousRevenue) * 100
    : undefined;
  const pyGrossMargin = priorYearRevenue && priorYearRevenue > 0
    ? ((priorYearGrossProfit ?? 0) / priorYearRevenue) * 100
    : undefined;

  const cards: KPICardData[] = [
    {
      label: 'Revenue',
      value: revenue,
      previousValue: previousRevenue,
      priorYearValue: priorYearRevenue,
      trendData: trendRevenue,
      format: 'currency',
      higherIsBetter: true,
      benchmarkStatus: benchmarkStatuses?.revenue,
    },
    {
      label: 'Gross Margin',
      value: grossMargin,
      previousValue: prevGrossMargin,
      priorYearValue: pyGrossMargin,
      trendData: trendGrossMargin,
      format: 'percentage',
      higherIsBetter: true,
      benchmarkStatus: benchmarkStatuses?.grossMargin,
    },
    {
      label: 'Expenses',
      value: expenses,
      previousValue: previousExpenses,
      priorYearValue: priorYearExpenses,
      trendData: trendExpenses,
      format: 'currency',
      higherIsBetter: false,
      benchmarkStatus: benchmarkStatuses?.expenses,
    },
    {
      label: 'Net Profit',
      value: netProfit,
      previousValue: previousNetProfit,
      priorYearValue: priorYearNetProfit,
      trendData: trendNetProfit,
      format: 'currency',
      higherIsBetter: true,
      benchmarkStatus: benchmarkStatuses?.netProfit,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const variance = getVariance(card.value, card.previousValue);
        const color = getVarianceColor(variance.direction, card.higherIsBetter);
        const bg = getVarianceBg(variance.direction, card.higherIsBetter);

        const status = card.benchmarkStatus ?? 'none';
        const borderClass = statusBorderColors[status];
        const statusLabel = statusLabels[status];

        return (
          <Card
            key={card.label}
            className={`transition-shadow hover:shadow-md ${borderClass} ${onCardClick ? 'cursor-pointer' : ''}`}
            onClick={() => onCardClick?.(card.label.toLowerCase().replace(/\s+/g, '_'))}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              {(() => {
                const metricKey = card.label.toLowerCase().replace(/\s+/g, '_');
                const Icon = KPI_ICONS[metricKey] || BarChart3;
                return (
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      <FinancialTooltip term={card.label}>{card.label}</FinancialTooltip>
                    </CardTitle>
                  </div>
                );
              })()}
              <div className="flex items-center gap-1.5">
                {status !== 'none' && (
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusLabel.className}`}>
                    {statusLabel.text}
                  </span>
                )}
                {variance.direction !== 'flat' && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${bg} ${color}`}>
                    <TrendIcon direction={variance.direction} />
                    {formatPercent(Math.abs(variance.percentage))}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-2xl font-bold text-foreground">
                    {card.format === 'percentage'
                      ? formatPercent(card.value)
                      : formatCurrency(card.value)}
                  </span>
                  <SourceBadge source="actual" size="sm" />
                </div>
                {card.trendData && card.trendData.length >= 2 && (
                  <Sparkline
                    data={card.trendData}
                    higherIsBetter={card.higherIsBetter}
                  />
                )}
              </div>
              {/* PP/PY comparisons */}
              <div className="mt-1.5 space-y-0.5">
                {card.previousValue !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    PP: {card.format === 'percentage'
                      ? formatPercent(card.previousValue)
                      : formatCurrency(card.previousValue)}
                    {(() => {
                      const v = getVariance(card.value, card.previousValue);
                      if (v.direction === 'flat') return null;
                      const c = getVarianceColor(v.direction, card.higherIsBetter);
                      return (
                        <span className={`ml-1 ${c}`}>
                          ({v.direction === 'up' ? '+' : ''}{formatPercent(v.percentage)})
                        </span>
                      );
                    })()}
                  </p>
                )}
                {card.priorYearValue !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    PY: {card.format === 'percentage'
                      ? formatPercent(card.priorYearValue)
                      : formatCurrency(card.priorYearValue)}
                    {(() => {
                      const v = getVariance(card.value, card.priorYearValue);
                      if (v.direction === 'flat') return null;
                      const c = getVarianceColor(v.direction, card.higherIsBetter);
                      return (
                        <span className={`ml-1 ${c}`}>
                          ({v.direction === 'up' ? '+' : ''}{formatPercent(v.percentage)})
                        </span>
                      );
                    })()}
                  </p>
                )}
              </div>
              {/* Sense-check intelligence flags */}
              {(() => {
                const metricKey = METRIC_KEY_MAP[card.label] || '';
                const cardFlags = senseCheckFlags.filter(
                  (f) => f.metric === metricKey
                );
                // Show max 2 flags per card (most severe first)
                const sorted = [...cardFlags].sort((a, b) => {
                  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
                  return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
                });
                return sorted.slice(0, 2).map((flag) => (
                  <FlagBadge key={flag.id} flag={flag} />
                ));
              })()}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
