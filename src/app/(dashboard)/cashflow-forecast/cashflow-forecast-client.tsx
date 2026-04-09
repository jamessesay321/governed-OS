'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Banknote,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Flame,
  Shield,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, chartAxisFormatter } from '@/lib/formatting/currency';
import type { MonthlyCashProjection, DebtMaturityMarker } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface CashflowForecastClientProps {
  projections: MonthlyCashProjection[];
  maturityMarkers: DebtMaturityMarker[];
  actualCashPosition: number;
  totalMonthlyDebtRepayment: number;
  avgOperatingCashFlow: number;
  monthsOfRunway: number | null;
  breakevenMonthIndex: number;
  cashNegativeMonthIndex: number;
  activeFacilityCount: number;
  latestPeriod: string;
}

type Scenario = 'base' | 'up' | 'down';

/* ================================================================== */
/*  Client Component                                                   */
/* ================================================================== */

export function CashflowForecastClient({
  projections,
  maturityMarkers,
  actualCashPosition,
  totalMonthlyDebtRepayment,
  avgOperatingCashFlow,
  monthsOfRunway,
  breakevenMonthIndex,
  cashNegativeMonthIndex,
  activeFacilityCount,
  latestPeriod,
}: CashflowForecastClientProps) {
  const [scenario, setScenario] = useState<Scenario>('base');
  const [showTable, setShowTable] = useState(false);

  // Apply scenario multiplier to operating cash inflows
  const scenarioProjections = useMemo(() => {
    if (scenario === 'base') return projections;
    const multiplier = scenario === 'up' ? 1.1 : 0.9;
    const adjusted: MonthlyCashProjection[] = [];
    let runningCash = actualCashPosition;
    for (let i = 0; i < projections.length; i++) {
      const p = projections[i];
      const adjInflow = p.operatingCashInflow * multiplier;
      const netChange = adjInflow - p.debtRepayments - p.taxPayments;
      runningCash += netChange;
      adjusted.push({
        ...p,
        operatingCashInflow: adjInflow,
        netCashChange: netChange,
        closingCash: runningCash,
      });
    }
    return adjusted;
  }, [projections, scenario, actualCashPosition]);

  // Chart data
  const chartData = useMemo(() => {
    return scenarioProjections.map((p, i) => ({
      label: p.label,
      period: p.period,
      closingCash: Math.round(p.closingCash),
      // Include base case as comparison when scenario is active
      ...(scenario !== 'base' ? { baseCash: Math.round(projections[i].closingCash) } : {}),
    }));
  }, [scenarioProjections, projections, scenario]);

  // Find cash-negative month for this scenario
  const scenarioCashNegative = scenarioProjections.findIndex((p) => p.closingCash < 0);

  // Metrics for current scenario
  const scenarioRunway = useMemo(() => {
    const first3 = scenarioProjections.slice(0, 3);
    const avgNet = first3.reduce((s, p) => s + p.netCashChange, 0) / 3;
    if (avgNet >= 0) return null;
    return Math.floor(actualCashPosition / Math.abs(avgNet));
  }, [scenarioProjections, actualCashPosition]);

  const lowestCash = Math.min(...scenarioProjections.map((p) => p.closingCash));
  const lowestCashMonth = scenarioProjections.find((p) => p.closingCash === lowestCash);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cash Flow Forecast</h1>
        <p className="text-muted-foreground">
          24-month cash projection with actual debt repayment schedules
        </p>
      </div>

      {/* Scenario Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Scenario:</span>
        {(['base', 'up', 'down'] as Scenario[]).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border transition-colors',
              scenario === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-muted'
            )}
          >
            {s === 'base' ? 'Base Case' : s === 'up' ? '+10% Revenue' : '-10% Revenue'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Cash */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Banknote className="h-4 w-4" />
            Current Cash Position
          </div>
          <p className="text-2xl font-bold">{formatCurrency(actualCashPosition)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            As of {new Date(latestPeriod).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Monthly Debt Burden */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Monthly Debt Repayments
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(totalMonthlyDebtRepayment)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {activeFacilityCount} active facilities
          </p>
        </div>

        {/* Months of Runway */}
        <div className={cn(
          'rounded-xl border p-5',
          (scenarioRunway ?? monthsOfRunway) !== null && (scenarioRunway ?? monthsOfRunway)! < 3
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : (scenarioRunway ?? monthsOfRunway) !== null && (scenarioRunway ?? monthsOfRunway)! < 6
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-card'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Flame className="h-4 w-4" />
            Cash Runway
          </div>
          <p className="text-2xl font-bold">
            {(scenarioRunway ?? monthsOfRunway) !== null
              ? `${scenarioRunway ?? monthsOfRunway} months`
              : 'Net positive'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {(scenarioRunway ?? monthsOfRunway) !== null
              ? 'Before cash runs out'
              : 'Operating cash covers debt'}
          </p>
        </div>

        {/* Critical Date */}
        <div className={cn(
          'rounded-xl border p-5',
          scenarioCashNegative >= 0 && scenarioCashNegative < 6
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : scenarioCashNegative >= 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            {scenarioCashNegative >= 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Shield className="h-4 w-4 text-emerald-600" />
            )}
            {scenarioCashNegative >= 0 ? 'Cash Negative' : 'Cash Safe'}
          </div>
          <p className="text-2xl font-bold">
            {scenarioCashNegative >= 0
              ? scenarioProjections[scenarioCashNegative].label
              : 'Not in window'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {scenarioCashNegative >= 0
              ? `Cash goes below zero in month ${scenarioCashNegative + 1}`
              : 'Cash stays positive for 24 months'}
          </p>
        </div>
      </div>

      {/* Lowest Point Warning */}
      {lowestCash < actualCashPosition * 0.3 && lowestCashMonth && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Lowest projected cash: {formatCurrency(lowestCash)} in {lowestCashMonth.label}
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              This represents a {Math.round(((actualCashPosition - lowestCash) / actualCashPosition) * 100)}%
              decline from current position. Consider accelerating collections or reducing discretionary spend.
            </p>
          </div>
        </div>
      )}

      {/* Cash Runway Chart */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">24-Month Cash Projection</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval={2}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={chartAxisFormatter()}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                width={80}
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value ?? 0)),
                  String(name) === 'closingCash' ? 'Closing Cash' : 'Base Case',
                ]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />

              {/* Zero line */}
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} />

              {/* Debt maturity markers */}
              {maturityMarkers.map((m) => {
                const idx = chartData.findIndex((d) => d.period === m.period);
                if (idx < 0) return null;
                return (
                  <ReferenceLine
                    key={m.facilityName}
                    x={chartData[idx].label}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{
                      value: m.facilityName.length > 15
                        ? m.facilityName.substring(0, 15) + '…'
                        : m.facilityName,
                      position: 'top',
                      style: { fontSize: 9, fill: '#92400e' },
                    }}
                  />
                );
              })}

              {/* Base case dashed line when scenario active */}
              {scenario !== 'base' && (
                <Line
                  type="monotone"
                  dataKey="baseCash"
                  stroke="#9ca3af"
                  strokeDasharray="5 5"
                  dot={false}
                  name="Base Case"
                  strokeWidth={1.5}
                />
              )}

              {/* Main cash area */}
              <Area
                type="monotone"
                dataKey="closingCash"
                stroke="#7c3aed"
                fill="url(#cashGradient)"
                strokeWidth={2.5}
                dot={false}
                name="Closing Cash"
              />

              <defs>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Maturity Legend */}
        {maturityMarkers.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Debt Maturities in Window</p>
            <div className="flex flex-wrap gap-3">
              {maturityMarkers.map((m) => (
                <span
                  key={m.facilityName}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                >
                  <Calendar className="h-3 w-3" />
                  {m.facilityName} · {formatCurrencyCompact(m.balance)} · {new Date(m.maturityDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cash Flow Breakdown */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Monthly Cash Flow Breakdown</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Operating Inflow
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Debt Repayments
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              Tax Payments
            </div>
          </div>
        </div>

        {/* Stacked Bar Summary */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-[900px] pb-2">
            {scenarioProjections.map((p) => {
              const maxVal = Math.max(
                ...scenarioProjections.map((x) => Math.abs(x.operatingCashInflow) + x.debtRepayments + x.taxPayments)
              );
              const barHeight = 120;
              const inflowH = maxVal > 0 ? (Math.abs(p.operatingCashInflow) / maxVal) * barHeight : 0;
              const debtH = maxVal > 0 ? (p.debtRepayments / maxVal) * barHeight : 0;
              const taxH = maxVal > 0 ? (p.taxPayments / maxVal) * barHeight : 0;

              return (
                <div key={p.period} className="flex-1 min-w-[36px] group relative">
                  <div className="flex flex-col items-center gap-0.5" style={{ height: barHeight }}>
                    <div className="flex flex-col justify-end flex-1 w-full gap-0.5">
                      {p.taxPayments > 0 && (
                        <div
                          className="w-full rounded-t bg-amber-400"
                          style={{ height: `${taxH}px` }}
                        />
                      )}
                      {p.debtRepayments > 0 && (
                        <div
                          className="w-full bg-red-400"
                          style={{ height: `${debtH}px` }}
                        />
                      )}
                      <div
                        className={cn(
                          'w-full rounded-b',
                          p.operatingCashInflow >= 0 ? 'bg-emerald-400' : 'bg-red-300'
                        )}
                        style={{ height: `${inflowH}px` }}
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-center text-muted-foreground mt-1 truncate">
                    {p.label.split(' ')[0]}
                  </p>
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs whitespace-nowrap">
                      <p className="font-medium mb-1">{p.label}</p>
                      <p className="text-emerald-600">Inflow: {formatCurrency(p.operatingCashInflow)}</p>
                      <p className="text-red-600">Debt: -{formatCurrency(p.debtRepayments)}</p>
                      {p.taxPayments > 0 && (
                        <p className="text-amber-600">Tax: -{formatCurrency(p.taxPayments)}</p>
                      )}
                      <hr className="my-1" />
                      <p className={cn('font-medium', p.netCashChange >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                        Net: {formatCurrency(p.netCashChange)}
                      </p>
                      <p className="text-muted-foreground">
                        Balance: {formatCurrency(p.closingCash)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expandable Table */}
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mt-4 pt-4 border-t w-full"
        >
          {showTable ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {showTable ? 'Hide' : 'Show'} detailed table
        </button>

        {showTable && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground sticky left-0 bg-card">Period</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Operating</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Debt</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Tax</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Net Change</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Closing Cash</th>
                </tr>
              </thead>
              <tbody>
                {scenarioProjections.map((p) => (
                  <tr key={p.period} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium sticky left-0 bg-card">{p.label}</td>
                    <td className={cn('py-2 px-3 text-right', p.operatingCashInflow >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formatCurrency(p.operatingCashInflow)}
                    </td>
                    <td className="py-2 px-3 text-right text-red-600">
                      -{formatCurrency(p.debtRepayments)}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-600">
                      {p.taxPayments > 0 ? `-${formatCurrency(p.taxPayments)}` : '—'}
                    </td>
                    <td className={cn('py-2 px-3 text-right font-medium', p.netCashChange >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                      {formatCurrency(p.netCashChange)}
                    </td>
                    <td className={cn('py-2 px-3 text-right font-bold', p.closingCash >= 0 ? '' : 'text-red-700')}>
                      {formatCurrency(p.closingCash)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debt Repayment Schedule Summary */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1">Debt Impact Summary</h2>
        <p className="text-sm text-muted-foreground mb-4">
          How debt repayments affect your projected cash position
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Annual Debt Cost</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(totalMonthlyDebtRepayment * 12)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCurrency(totalMonthlyDebtRepayment)}/month × 12
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Avg Operating Cash Flow</p>
            <p className={cn('text-xl font-bold', avgOperatingCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {formatCurrency(avgOperatingCashFlow)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on first 3 months forecast
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Debt Service Coverage</p>
            <p className={cn(
              'text-xl font-bold',
              totalMonthlyDebtRepayment > 0 && avgOperatingCashFlow / totalMonthlyDebtRepayment >= 1.25
                ? 'text-emerald-600'
                : totalMonthlyDebtRepayment > 0 && avgOperatingCashFlow / totalMonthlyDebtRepayment >= 1
                  ? 'text-amber-600'
                  : 'text-red-600'
            )}>
              {totalMonthlyDebtRepayment > 0
                ? `${(avgOperatingCashFlow / totalMonthlyDebtRepayment).toFixed(2)}x`
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalMonthlyDebtRepayment > 0 && avgOperatingCashFlow / totalMonthlyDebtRepayment >= 1.25
                ? 'Healthy — operating cash covers debt'
                : totalMonthlyDebtRepayment > 0 && avgOperatingCashFlow / totalMonthlyDebtRepayment >= 1
                  ? 'Tight — minimal headroom'
                  : 'Below 1x — cash shortfall risk'}
            </p>
          </div>
        </div>

        {/* Next Maturities */}
        {maturityMarkers.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium mb-3">Upcoming Debt Maturities</h3>
            <div className="space-y-2">
              {maturityMarkers.slice(0, 5).map((m) => {
                const daysUntil = Math.ceil(
                  (new Date(m.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={m.facilityName}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      daysUntil < 30
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                        : daysUntil < 90
                          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                          : ''
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{m.facilityName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.maturityDate).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(m.balance)}</p>
                      <p className={cn(
                        'text-xs font-medium',
                        daysUntil < 30 ? 'text-red-600' : daysUntil < 90 ? 'text-amber-600' : 'text-muted-foreground'
                      )}>
                        {daysUntil}d
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
