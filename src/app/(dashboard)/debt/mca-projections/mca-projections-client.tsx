'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calendar,
  ChevronDown,
  ChevronRight,
  Percent,
  TrendingDown,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/formatting/currency';
import { ExportButton, type ExportColumn } from '@/components/shared/export-button';
import Link from 'next/link';
import type { MCAProjectionResult } from '@/lib/financial/mca-projection';
import { periodLabel } from '@/lib/financial/mca-projection';

// ─── Props ─────────────────────────────────────────────────────────

interface MCAProjectionsClientProps {
  projections: MCAProjectionResult[];
  hasData: boolean;
  hasSourceBreakdown: boolean;
  historicalShopifyRevenue: { period: string; amount: number }[];
  historicalStripeRevenue: { period: string; amount: number }[];
}

// ─── Formatters ────────────────────────────────────────────────────

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `\u00A3${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `\u00A3${(value / 1_000).toFixed(0)}K`;
  return `\u00A3${value}`;
}

function sweepSourceLabel(source: string): string {
  switch (source) {
    case 'shopify': return 'Shopify';
    case 'stripe': return 'Stripe';
    case 'both': return 'Shopify + Stripe';
    default: return source;
  }
}

function sweepSourceBadgeColor(source: string): string {
  switch (source) {
    case 'shopify': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'stripe': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  }
}

// Distinct chart colours for each facility
const FACILITY_COLORS = ['#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb', '#db2777'];

// ─── Component ─────────────────────────────────────────────────────

export function MCAProjectionsClient({
  projections,
  hasData,
  hasSourceBreakdown,
  historicalShopifyRevenue,
  historicalStripeRevenue,
}: MCAProjectionsClientProps) {
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);

  // ── Summary metrics ──
  const summary = useMemo(() => {
    if (projections.length === 0) {
      return {
        totalBalance: 0,
        weightedSweepRate: 0,
        totalMonthlySweep: 0,
        earliestPayoff: null as string | null,
        latestPayoff: null as string | null,
      };
    }

    const totalBalance = projections.reduce(
      (sum, p) => sum + p.facility.currentBalance, 0,
    );

    // Weighted average sweep rate by balance
    const weightedSweepRate = totalBalance > 0
      ? projections.reduce(
          (sum, p) => sum + p.facility.sweepPercentage * p.facility.currentBalance, 0,
        ) / totalBalance
      : 0;

    const totalMonthlySweep = projections.reduce(
      (sum, p) => sum + p.averageMonthlyRepayment, 0,
    );

    const payoffDates = projections
      .map((p) => p.estimatedPayoffDate)
      .filter((d): d is string => d !== null)
      .sort();

    return {
      totalBalance,
      weightedSweepRate,
      totalMonthlySweep,
      earliestPayoff: payoffDates[0] ?? null,
      latestPayoff: payoffDates[payoffDates.length - 1] ?? null,
    };
  }, [projections]);

  // ── Chart data: combined balance decline across all facilities ──
  const chartData = useMemo(() => {
    if (projections.length === 0) return [];

    // Get the longest projection timeline
    const maxMonths = Math.max(
      ...projections.map((p) => p.monthlyProjections.length),
    );

    const data: Record<string, unknown>[] = [];
    for (let i = 0; i < maxMonths; i++) {
      const row: Record<string, unknown> = {};
      let hasPeriod = false;

      for (let j = 0; j < projections.length; j++) {
        const proj = projections[j];
        const mp = proj.monthlyProjections[i];
        if (mp) {
          if (!hasPeriod) {
            row.period = mp.period;
            row.label = periodLabel(mp.period);
            hasPeriod = true;
          }
          row[`balance_${j}`] = Math.round(mp.closingBalance);
        }
      }

      if (hasPeriod) data.push(row);
    }
    return data;
  }, [projections]);

  // ── Export data ──
  const exportData = useMemo(() => {
    const rows: Record<string, unknown>[] = [];
    for (const proj of projections) {
      for (const mp of proj.monthlyProjections) {
        rows.push({
          facility: proj.facility.facilityName,
          period: mp.period,
          projected_revenue: mp.projectedRevenue,
          sweep_amount: mp.sweepAmount,
          opening_balance: mp.openingBalance,
          closing_balance: mp.closingBalance,
          is_paid_off: mp.isPaidOff ? 'Yes' : 'No',
        });
      }
    }
    return rows;
  }, [projections]);

  const exportColumns: ExportColumn[] = [
    { header: 'Facility', key: 'facility', format: 'text' },
    { header: 'Period', key: 'period', format: 'text' },
    { header: 'Projected Revenue', key: 'projected_revenue', format: 'currency' },
    { header: 'Sweep Amount', key: 'sweep_amount', format: 'currency' },
    { header: 'Opening Balance', key: 'opening_balance', format: 'currency' },
    { header: 'Closing Balance', key: 'closing_balance', format: 'currency' },
    { header: 'Paid Off', key: 'is_paid_off', format: 'text' },
  ];

  // ── Empty state ──
  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/debt"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Debt
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center">
          <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Active MCA Facilities</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            There are no active Merchant Cash Advance facilities to project.
            MCA facilities are tracked in the Debt Command Centre with
            facility_type = &apos;mca&apos;.
          </p>
          <Link
            href="/debt"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline"
          >
            Go to Debt Command Centre
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/debt"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Debt
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MCA Repayment Projections</h1>
          <p className="text-muted-foreground">
            Projected payoff dates based on cashflow -- estimates only, actual dates depend on revenue
          </p>
        </div>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          filename="mca-projections"
          title="MCA Repayment Projections"
          subtitle="Projected repayment timeline based on historical revenue"
        />
      </div>

      {/* Warning Banner */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">
            These projections are estimates based on historical cashflow patterns
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
            Actual repayment timelines will vary with revenue. MCA repayments are a percentage
            sweep of income through {hasSourceBreakdown ? 'Shopify and Stripe' : 'payment processors'} --
            faster revenue means faster payoff.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Banknote className="h-4 w-4" />
            Total MCA Balance
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {projections.length} active {projections.length === 1 ? 'facility' : 'facilities'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Percent className="h-4 w-4" />
            Weighted Avg Sweep Rate
          </div>
          <p className="text-2xl font-bold">{fmtPct(summary.weightedSweepRate)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Weighted by outstanding balance
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Est. Monthly Sweep Total
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalMonthlySweep)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Average across all MCAs
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            Payoff Window
          </div>
          <p className="text-2xl font-bold">
            {summary.earliestPayoff
              ? `~${periodLabel(summary.earliestPayoff)}`
              : 'Unknown'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.earliestPayoff && summary.latestPayoff && summary.earliestPayoff !== summary.latestPayoff
              ? `${periodLabel(summary.earliestPayoff)} to ${periodLabel(summary.latestPayoff)}`
              : summary.earliestPayoff
                ? 'Estimated earliest payoff'
                : 'Insufficient revenue data to project'}
          </p>
        </div>
      </div>

      {/* Per-Facility Cards */}
      {projections.map((proj, idx) => {
        const f = proj.facility;
        const amountRepaid = f.totalToRepay - f.currentBalance;
        const progressPct = f.totalToRepay > 0
          ? Math.min(100, (amountRepaid / f.totalToRepay) * 100)
          : 0;
        const isExpanded = expandedFacility === f.id;

        return (
          <div key={f.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Card Header */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{f.facilityName}</h3>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      sweepSourceBadgeColor(f.sweepSource),
                    )}>
                      {sweepSourceLabel(f.sweepSource)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {f.lender} -- {fmtPct(f.sweepPercentage)} of {sweepSourceLabel(f.sweepSource)} revenue
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Effective APR</p>
                  <p className={cn(
                    'text-lg font-bold',
                    proj.effectiveAPR > 0.30 ? 'text-red-600' :
                    proj.effectiveAPR > 0.15 ? 'text-amber-600' :
                    'text-emerald-600',
                  )}>
                    {proj.effectiveAPR > 0 ? fmtPct(proj.effectiveAPR) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Repaid: {formatCurrency(amountRepaid)}</span>
                  <span>Remaining: {formatCurrency(f.currentBalance)}</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      progressPct > 75 ? 'bg-emerald-500' :
                      progressPct > 40 ? 'bg-amber-500' :
                      'bg-red-500',
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {progressPct.toFixed(0)}% complete -- {formatCurrency(f.totalToRepay)} total to repay
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Original Amount</p>
                  <p className="font-semibold">{formatCurrency(f.originalAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fixed Fee</p>
                  <p className="font-semibold">{formatCurrency(f.fixedFee)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total to Repay</p>
                  <p className="font-semibold">{formatCurrency(f.totalToRepay)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Remaining Balance</p>
                  <p className="font-bold text-red-600">{formatCurrency(f.currentBalance)}</p>
                </div>
              </div>

              {/* Estimated Payoff */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estimated Payoff</span>
                </div>
                <p className="text-lg font-bold">
                  {proj.estimatedPayoffDate
                    ? `~${periodLabel(proj.estimatedPayoffDate)} (${proj.estimatedMonthsRemaining} months)`
                    : 'Cannot project -- insufficient revenue data'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Avg monthly sweep: {formatCurrency(proj.averageMonthlyRepayment)}
                </p>
              </div>

              {/* 3-Scenario Table */}
              <div className="mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left text-xs font-medium text-muted-foreground">Scenario</th>
                      <th className="py-2 text-right text-xs font-medium text-muted-foreground">Revenue Assumption</th>
                      <th className="py-2 text-right text-xs font-medium text-muted-foreground">Payoff Date</th>
                      <th className="py-2 text-right text-xs font-medium text-muted-foreground">Months</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 text-red-600 font-medium">Pessimistic</td>
                      <td className="py-2 text-right text-muted-foreground">-20% revenue</td>
                      <td className="py-2 text-right">
                        {proj.scenarios.pessimistic.payoffDate
                          ? periodLabel(proj.scenarios.pessimistic.payoffDate)
                          : 'Beyond window'}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {proj.scenarios.pessimistic.months ?? '-'}
                      </td>
                    </tr>
                    <tr className="border-b bg-muted/30">
                      <td className="py-2 font-medium">Baseline</td>
                      <td className="py-2 text-right text-muted-foreground">Current trend</td>
                      <td className="py-2 text-right font-semibold">
                        {proj.scenarios.baseline.payoffDate
                          ? periodLabel(proj.scenarios.baseline.payoffDate)
                          : 'Beyond window'}
                      </td>
                      <td className="py-2 text-right font-bold">
                        {proj.scenarios.baseline.months ?? '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-emerald-600 font-medium">Optimistic</td>
                      <td className="py-2 text-right text-muted-foreground">+20% revenue</td>
                      <td className="py-2 text-right">
                        {proj.scenarios.optimistic.payoffDate
                          ? periodLabel(proj.scenarios.optimistic.payoffDate)
                          : 'Beyond window'}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {proj.scenarios.optimistic.months ?? '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expandable Monthly Table */}
            <div className="border-t">
              <button
                onClick={() => setExpandedFacility(isExpanded ? null : f.id)}
                className="flex items-center gap-2 w-full px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {isExpanded ? 'Hide' : 'Show'} monthly projection table
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2 text-left font-medium text-muted-foreground">Period</th>
                        <th className="py-2 px-2 text-right font-medium text-muted-foreground">
                          Revenue ({sweepSourceLabel(f.sweepSource)})
                        </th>
                        <th className="py-2 px-2 text-right font-medium text-muted-foreground">
                          Sweep ({fmtPct(f.sweepPercentage)})
                        </th>
                        <th className="py-2 px-2 text-right font-medium text-muted-foreground">Opening Bal</th>
                        <th className="py-2 px-2 text-right font-medium text-muted-foreground">Closing Bal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proj.monthlyProjections.map((mp) => (
                        <tr
                          key={mp.period}
                          className={cn(
                            'border-b hover:bg-muted/50',
                            mp.isPaidOff && 'bg-emerald-50 dark:bg-emerald-950/20',
                          )}
                        >
                          <td className="py-1.5 px-2 font-medium">{periodLabel(mp.period)}</td>
                          <td className="py-1.5 px-2 text-right">{formatCurrency(mp.projectedRevenue)}</td>
                          <td className="py-1.5 px-2 text-right text-red-600">
                            -{formatCurrency(mp.sweepAmount)}
                          </td>
                          <td className="py-1.5 px-2 text-right">{formatCurrency(mp.openingBalance)}</td>
                          <td className={cn(
                            'py-1.5 px-2 text-right font-medium',
                            mp.isPaidOff ? 'text-emerald-600' : '',
                          )}>
                            {formatCurrency(mp.closingBalance)}
                            {mp.isPaidOff && (
                              <span className="ml-1.5 text-emerald-600 text-[10px] font-semibold">PAID OFF</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Balance Decline Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">Balance Decline Projection</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Projected remaining balance over time for each MCA facility (baseline scenario)
          </p>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={fmtAxis}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  width={80}
                />
                <RechartsTooltip
                  formatter={(value, name) => {
                    const idx = parseInt(String(name).replace('balance_', ''), 10);
                    const label = projections[idx]?.facility.facilityName ?? String(name);
                    return [formatCurrency(Number(value ?? 0)), label];
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend
                  formatter={(value: string) => {
                    const idx = parseInt(value.replace('balance_', ''), 10);
                    return projections[idx]?.facility.facilityName ?? value;
                  }}
                />
                <ReferenceLine y={0} stroke="#059669" strokeDasharray="5 5" strokeWidth={2} label="Paid Off" />

                <defs>
                  {projections.map((_, idx) => (
                    <linearGradient key={idx} id={`mcaGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={FACILITY_COLORS[idx % FACILITY_COLORS.length]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={FACILITY_COLORS[idx % FACILITY_COLORS.length]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>

                {projections.map((_, idx) => (
                  <Area
                    key={idx}
                    type="monotone"
                    dataKey={`balance_${idx}`}
                    stroke={FACILITY_COLORS[idx % FACILITY_COLORS.length]}
                    fill={`url(#mcaGrad_${idx})`}
                    strokeWidth={2}
                    dot={false}
                    name={`balance_${idx}`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Source Revenue Note */}
      {!hasSourceBreakdown && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
            Revenue source breakdown not available
          </p>
          <p className="text-blue-700 dark:text-blue-400">
            The projection is using an estimated split of total revenue (75% Shopify / 25% Stripe).
            For more accurate projections, tag revenue accounts in your chart of accounts with
            the payment source (e.g. &quot;Shopify Sales&quot;, &quot;Stripe Consultation Income&quot;).
          </p>
        </div>
      )}
    </div>
  );
}
