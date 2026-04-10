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
  Target,
  Globe,
  Users,
  Banknote,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Circle,
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
  ComposedChart,
  Line,
  Area,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, chartAxisFormatter } from '@/lib/formatting/currency';
import { NumberLegend } from '@/components/data-primitives';
import type {
  ValuationData,
  BridgeStep,
  ComparableBenchmark,
  ProductMargin,
  ProfitabilityMilestone,
} from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface ValuationClientProps {
  data: ValuationData;
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
    businessPlan,
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
          Indicative enterprise and equity valuation — actuals from Xero, projections from{' '}
          {businessPlan.scenarioLinked ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              linked scenario
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              business plan (create a &quot;Business Plan&quot; scenario to auto-link)
            </span>
          )}
        </p>
      </div>

      <NumberLegend />

      {/* ── Current Fundraise Banner ── */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 dark:bg-indigo-900/50 p-2.5">
              <Banknote className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Current Raise</p>
              <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">£400k minimum</p>
            </div>
          </div>
          <div className="h-10 w-px bg-indigo-200 dark:bg-indigo-700 hidden sm:block" />
          <div>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">Pre-money Valuation</p>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">£5m minimum</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">Structure</p>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{businessPlan.fundraise.structure}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">Implied Revenue Multiple</p>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{businessPlan.fundraise.impliedRevenueMultiple.toFixed(1)}x</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">US Revenue Share</p>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{businessPlan.usRevenueShare}%</p>
          </div>
        </div>
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
          value={`${formatCurrencyCompact(minEquity)} – ${formatCurrencyCompact(maxEquity)}`}
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
                tickFormatter={chartAxisFormatter()}
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
                      {formatCurrencyCompact(cell.equityValue)}
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

      {/* ── Revenue Trajectory (Actuals + Projections) ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Revenue Trajectory
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Actual revenue from Xero (solid) and {businessPlan.scenarioLinked ? 'scenario' : 'business plan'} projections (faded)
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={businessPlan.revenueTrajectory}
              margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={chartAxisFormatter()} tick={{ fontSize: 12 }} />
              <RechartsTooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={40}>
                {businessPlan.revenueTrajectory.map((entry, index) => (
                  <Cell
                    key={`rev-traj-${index}`}
                    fill={entry.isProjection ? '#818cf8' : '#7c3aed'}
                    opacity={entry.isProjection ? 0.6 : 1}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#7c3aed"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* YoY badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {businessPlan.revenueTrajectory.filter((p) => p.yoyGrowth).map((p) => (
            <span
              key={p.year}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                p.isProjection
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
              )}
            >
              {p.year}: <ArrowUpRight className="h-3 w-3" />{p.yoyGrowth}
            </span>
          ))}
        </div>
      </div>

      {/* ── Product Margin Breakdown + Market Opportunity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Margins */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Product Margin Profile
          </h2>
          <div className="space-y-4">
            {businessPlan.productMargins.map((pm) => (
              <ProductMarginRow key={pm.product} margin={pm} />
            ))}
          </div>
        </div>

        {/* Market Opportunity + Key Metrics */}
        <div className="space-y-6">
          {/* Market Opportunity */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Market Opportunity
            </h2>
            <div className="space-y-3">
              {businessPlan.markets.map((m) => (
                <div key={m.market} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{m.market}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{m.size}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.sizeGBP}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Key Metrics</h2>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="h-3.5 w-3.5" />
                {businessPlan.teamSize} team
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {businessPlan.keyMetrics.map((km) => (
                <div key={km.label} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{km.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{km.value}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{km.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Profitability Path + Exit Scenario ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profitability Roadmap */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Path to Profitability
          </h2>
          <div className="space-y-4">
            {businessPlan.profitabilityPath.map((milestone) => (
              <MilestoneRow key={milestone.year} milestone={milestone} />
            ))}
          </div>
        </div>

        {/* Exit Scenario */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              {businessPlan.exitScenario.year} Exit Scenario
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Target Revenue</span>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {formatCurrency(businessPlan.exitScenario.targetRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Target EBITDA Margin</span>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {businessPlan.exitScenario.targetEbitdaMargin}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Implied EBITDA</span>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {formatCurrency(businessPlan.exitScenario.targetEbitda)}
              </span>
            </div>
            <div className="h-px bg-emerald-200 dark:bg-emerald-700 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Floor Multiple (Revenue)</span>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {businessPlan.exitScenario.floorMultiple}x
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Floor Valuation</span>
              <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                {formatCurrency(businessPlan.exitScenario.floorValuation)}
              </span>
            </div>
            <div className="h-px bg-emerald-200 dark:bg-emerald-700 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Investor Return (from £5m)</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200 dark:bg-emerald-800 px-3 py-1 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {businessPlan.exitScenario.investorReturnMultiple}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-400">
            Based on business plan projections. Floor valuation is conservative — multiple expected to be higher
            due to profitability and maturity at exit. Minority exit targeting partners with proven luxury sector expertise.
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

/* ================================================================== */
/*  Product Margin Row                                                 */
/* ================================================================== */

function ProductMarginRow({ margin }: { margin: ProductMargin }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{margin.product}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            GM: <span className="font-semibold text-gray-900 dark:text-white">{margin.grossMargin}%</span>
          </span>
          {margin.operatingMargin !== null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              OM: <span className="font-semibold text-gray-900 dark:text-white">{margin.operatingMargin}%</span>
            </span>
          )}
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all"
          style={{ width: `${margin.grossMargin}%`, backgroundColor: margin.color, opacity: 0.7 }}
        />
        {margin.operatingMargin !== null && (
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all"
            style={{ width: `${margin.operatingMargin}%`, backgroundColor: margin.color, opacity: 1 }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400 dark:text-gray-500">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Profitability Milestone Row                                        */
/* ================================================================== */

function MilestoneRow({ milestone }: { milestone: ProfitabilityMilestone }) {
  const statusConfig = {
    'achieved': { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Achieved' },
    'in-progress': { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'In Progress' },
    'planned': { icon: Circle, color: 'text-gray-400 dark:text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/50', label: 'Planned' },
  };

  const config = statusConfig[milestone.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('flex items-start gap-3 rounded-lg px-4 py-3', config.bg)}>
      <StatusIcon className={cn('h-5 w-5 mt-0.5 shrink-0', config.color)} />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{milestone.year}</span>
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', config.bg, config.color)}>
            {config.label}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{milestone.target}</p>
      </div>
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
