'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  Building2,
  Landmark,
  Scale,
  BarChart3,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/formatting/currency';
import type {
  ValuationData,
  BridgeStep,
  ComparableBenchmark,
} from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface ValuationClientProps {
  data: ValuationData;
}

/* ================================================================== */
/*  Compact formatter for axes / cells                                 */
/* ================================================================== */

function fmtCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `£${(amount / 1_000).toFixed(0)}k`;
  return formatCurrency(amount);
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `£${(value / 1_000).toFixed(0)}k`;
  return `£${value}`;
}

/* ================================================================== */
/*  Sensitivity cell colour                                            */
/* ================================================================== */

function sensitivityColor(value: number, min: number, max: number): string {
  if (max === min) return 'bg-gray-100 dark:bg-gray-800';
  const ratio = (value - min) / (max - min);
  if (ratio >= 0.8) return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
  if (ratio >= 0.6) return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400';
  if (ratio >= 0.4) return 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300';
  if (ratio >= 0.2) return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400';
  return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400';
}

/* ================================================================== */
/*  Bridge chart colour                                                */
/* ================================================================== */

function bridgeColor(type: BridgeStep['type']): string {
  switch (type) {
    case 'base': return '#7c3aed';
    case 'add': return '#10b981';
    case 'subtract': return '#ef4444';
  }
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function ValuationClient({ data }: ValuationClientProps) {
  const {
    metrics,
    revenueMultiples,
    ebitdaMultiples,
    sensitivityMatrix,
    ebitdaScenarioLabels,
    ebitdaMultipleValues,
    bridge,
    comparables,
    hasData,
    midEbitdaMultiple,
  } = data;

  // Equity range from EBITDA multiples
  const equityValues = ebitdaMultiples.map((m) => m.equityValue);
  const minEquity = Math.min(...equityValues);
  const maxEquity = Math.max(...equityValues);

  // Sensitivity min/max for colouring
  const allSensValues = sensitivityMatrix.map((s) => s.equityValue);
  const sensMin = Math.min(...allSensValues);
  const sensMax = Math.max(...allSensValues);

  // Build sensitivity rows grouped by multiple
  const sensRows = useMemo(() => {
    return ebitdaMultipleValues.map((m) => {
      const cells = ebitdaScenarioLabels.map((label) => {
        const cell = sensitivityMatrix.find(
          (s) => s.multiple === m && s.ebitdaScenarioLabel === label,
        );
        return cell ?? { ebitdaScenarioLabel: label, ebitdaScenarioValue: 0, multiple: m, equityValue: 0 };
      });
      return { multiple: m, cells };
    });
  }, [ebitdaMultipleValues, ebitdaScenarioLabels, sensitivityMatrix]);

  // Bridge chart data — waterfall using stacked bars
  const bridgeChartData = useMemo(() => {
    return bridge.map((step, i) => {
      // For waterfall: invisible base + visible bar
      if (step.type === 'base') {
        return {
          label: step.label,
          invisible: 0,
          value: step.value,
          fill: bridgeColor(step.type),
        };
      }
      // For add/subtract: show the delta from previous cumulative
      const prevCumulative = i > 0 ? bridge[i - 1].cumulative : 0;
      const isNegative = step.value < 0;
      return {
        label: step.label,
        invisible: isNegative ? step.cumulative : prevCumulative,
        value: Math.abs(step.value),
        fill: bridgeColor(step.type),
      };
    });
  }, [bridge]);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Valuation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Indicative valuation based on financial data from Xero
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No Financial Data Available
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Connect your Xero account and sync financial data to generate a business valuation.
            The valuation engine requires at least 12 months of normalised financial data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Valuation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Indicative enterprise and equity valuation using revenue and EBITDA multiples
        </p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Annual Revenue"
          value={formatCurrency(metrics.annualRevenue)}
          subtext="Trailing 12 months"
          icon={<TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
          accentClass="border-l-violet-500"
        />
        <MetricCard
          label="EBITDA"
          value={formatCurrency(metrics.ebitda)}
          subtext="Trailing 12 months"
          icon={<BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          accentClass="border-l-emerald-500"
        />
        <MetricCard
          label="Net Debt"
          value={formatCurrency(metrics.netDebt)}
          subtext="Active facilities"
          icon={<Landmark className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          accentClass="border-l-amber-500"
        />
        <MetricCard
          label="Implied Equity Range"
          value={`${fmtCompact(minEquity)} – ${fmtCompact(maxEquity)}`}
          subtext={`EBITDA multiples ${ebitdaMultipleValues[0]}x–${ebitdaMultipleValues[ebitdaMultipleValues.length - 1]}x`}
          icon={<Scale className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
          accentClass="border-l-cyan-500"
        />
      </div>

      {/* ── Valuation Methods Table ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Valuation Methods
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Method</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Multiple</th>
                <th className="text-right py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">Enterprise Value</th>
                <th className="text-right py-3 font-medium text-gray-500 dark:text-gray-400">Equity Value</th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue multiples */}
              {revenueMultiples.map((rm, i) => (
                <tr
                  key={`rev-${rm.multiple}`}
                  className={cn(
                    'border-b border-gray-100 dark:border-gray-800',
                    i === 0 && 'bg-violet-50/50 dark:bg-violet-950/10',
                  )}
                >
                  <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">
                    {i === 0 ? 'Revenue Multiple' : ''}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-gray-900 dark:text-white">{rm.multiple}x</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-gray-900 dark:text-white">
                    {formatCurrency(rm.enterpriseValue)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-gray-900 dark:text-white">
                    {formatCurrency(rm.equityValue)}
                  </td>
                </tr>
              ))}
              {/* Spacer */}
              <tr>
                <td colSpan={4} className="py-1" />
              </tr>
              {/* EBITDA multiples */}
              {ebitdaMultiples.map((em, i) => (
                <tr
                  key={`ebitda-${em.multiple}`}
                  className={cn(
                    'border-b border-gray-100 dark:border-gray-800',
                    i === 0 && 'bg-emerald-50/50 dark:bg-emerald-950/10',
                  )}
                >
                  <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">
                    {i === 0 ? 'EBITDA Multiple' : ''}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-gray-900 dark:text-white">{em.multiple}x</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-gray-900 dark:text-white">
                    {formatCurrency(em.enterpriseValue)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-gray-900 dark:text-white">
                    {formatCurrency(em.equityValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EV-to-Equity Bridge ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          EV-to-Equity Bridge
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Waterfall from Enterprise Value ({midEbitdaMultiple}x EBITDA) to Equity Value
        </p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bridgeChartData}
              margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <RechartsTooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Value']}
                contentStyle={{
                  backgroundColor: 'var(--color-gray-900, #111827)',
                  border: '1px solid var(--color-gray-700, #374151)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              {/* Invisible base for waterfall effect */}
              <Bar dataKey="invisible" stackId="bridge" fill="transparent" />
              <Bar dataKey="value" stackId="bridge" radius={[4, 4, 0, 0]}>
                {bridgeChartData.map((entry, index) => (
                  <Cell key={`bridge-cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Bridge summary row */}
        <div className="mt-4 flex flex-wrap gap-3">
          {bridge.map((step) => (
            <div
              key={step.label}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                step.type === 'base' && 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
                step.type === 'add' && 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
                step.type === 'subtract' && 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
              )}
            >
              <span className="font-medium">{step.label}:</span>
              <span className="font-mono">{formatCurrency(Math.abs(step.value))}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sensitivity Matrix ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Sensitivity Analysis
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Equity value under different EBITDA scenarios and multiples
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 pr-3 font-medium text-gray-500 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-900">
                  EBITDA Multiple
                </th>
                {ebitdaScenarioLabels.map((label) => (
                  <th
                    key={label}
                    className={cn(
                      'py-3 px-3 text-center font-medium',
                      label === 'Base'
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400',
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensRows.map((row) => (
                <tr key={row.multiple} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2.5 pr-3 font-mono font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900">
                    {row.multiple}x
                  </td>
                  {row.cells.map((cell) => (
                    <td
                      key={`${cell.multiple}-${cell.ebitdaScenarioLabel}`}
                      className={cn(
                        'py-2.5 px-3 text-center font-mono text-sm rounded',
                        sensitivityColor(cell.equityValue, sensMin, sensMax),
                        cell.ebitdaScenarioLabel === 'Base' && 'font-semibold ring-1 ring-gray-300 dark:ring-gray-600',
                      )}
                    >
                      {fmtCompact(cell.equityValue)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950/40" />
            Higher valuation
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-50 dark:bg-red-950/30" />
            Lower valuation
          </span>
        </div>
      </div>

      {/* ── Comparable Multiples ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Sector Comparables
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Fashion &amp; retail sector benchmarks vs Alonuko position
        </p>
        <div className="space-y-5">
          {comparables.map((comp) => (
            <ComparableRow key={comp.metric} comp={comp} />
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
          <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Sector benchmarks are indicative ranges for UK fashion/retail SMEs. Actual transaction
            multiples vary based on growth rate, brand strength, recurring revenue mix, and market
            conditions. This is not a formal valuation and should not be used for transaction purposes
            without professional advice.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Metric Card                                                        */
/* ================================================================== */

function MetricCard({
  label,
  value,
  subtext,
  icon,
  accentClass,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5',
        'border-l-4',
        accentClass,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}

/* ================================================================== */
/*  Comparable Row (visual range indicator)                            */
/* ================================================================== */

function ComparableRow({ comp }: { comp: ComparableBenchmark }) {
  // Position the Alonuko marker within the range visualisation
  // Extend the visual range slightly beyond sector bounds
  const rangeMin = Math.min(comp.sectorLow * 0.5, comp.alonukoValue * 0.8);
  const rangeMax = Math.max(comp.sectorHigh * 1.5, comp.alonukoValue * 1.2);
  const rangeSpan = rangeMax - rangeMin;

  const sectorLeftPct = rangeSpan > 0 ? ((comp.sectorLow - rangeMin) / rangeSpan) * 100 : 0;
  const sectorWidthPct = rangeSpan > 0 ? ((comp.sectorHigh - comp.sectorLow) / rangeSpan) * 100 : 50;
  const markerPct = rangeSpan > 0 ? ((comp.alonukoValue - rangeMin) / rangeSpan) * 100 : 50;

  const isInRange = comp.alonukoValue >= comp.sectorLow && comp.alonukoValue <= comp.sectorHigh;
  const isAbove = comp.alonukoValue > comp.sectorHigh;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{comp.metric}</span>
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isInRange && 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
            isAbove && 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
            !isInRange && !isAbove && 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
          )}
        >
          {comp.alonukoValue.toFixed(1)}{comp.unit}
        </span>
      </div>
      {/* Visual range bar */}
      <div className="relative h-6 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {/* Sector range */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-gray-300 dark:bg-gray-600 opacity-50"
          style={{ left: `${sectorLeftPct}%`, width: `${sectorWidthPct}%` }}
        />
        {/* Alonuko marker */}
        <div
          className={cn(
            'absolute top-0 bottom-0 w-1 rounded-full',
            isInRange ? 'bg-emerald-500' : isAbove ? 'bg-violet-500' : 'bg-amber-500',
          )}
          style={{ left: `${Math.min(Math.max(markerPct, 1), 99)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400 dark:text-gray-500">
        <span>Sector: {comp.sectorLow}{comp.unit}</span>
        <span>{comp.sectorHigh}{comp.unit}</span>
      </div>
    </div>
  );
}
