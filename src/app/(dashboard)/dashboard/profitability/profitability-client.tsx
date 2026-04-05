'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/components/providers/currency-context';
import { ReportControls, getDefaultReportState } from '@/components/financial/report-controls';
import type { ReportControlsState } from '@/components/financial/report-controls';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { ChallengeButton } from '@/components/shared/challenge-panel';
import { CrossRef } from '@/components/shared/in-page-link';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { DollarSign, Percent, BarChart3, PiggyBank } from 'lucide-react';
import { SmartChartTooltip } from '@/components/charts/smart-chart-tooltip';

/* ─── colour palette ─── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
};

const PIE_COLORS = [COLORS.blue, COLORS.rose, COLORS.amber, COLORS.violet, COLORS.cyan];

/* ─── Props ─── */
interface ProfitabilityProps {
  orgId: string;
  connected: boolean;
  periods: Array<{
    period: string;
    revenue: number;
    grossMargin: number;
    operatingMargin: number;
    netProfit: number;
    expenses: number;
  }>;
  expenseBreakdown: Array<{ name: string; value: number }>;
  lastSync: { completedAt: string | null };
}

/* ─── helper to format period YYYY-MM-01 to short label ─── */
function fmtPeriod(period: string): string {
  const d = new Date(period + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function ProfitabilityClient({
  orgId,
  connected,
  periods,
  expenseBreakdown,
  lastSync,
}: ProfitabilityProps) {
  const { format } = useCurrency();

  const availablePeriods = useMemo(() => periods.map((p) => p.period), [periods]);
  const { yearEndMonth } = useAccountingConfig();
  const globalPeriod = useGlobalPeriodContext();
  const [controls, setControls] = useState<ReportControlsState>(() => getDefaultReportState(availablePeriods, yearEndMonth));

  // Sync from global period selector
  const prevGlobalPeriodRef = useRef(globalPeriod.period);
  useEffect(() => {
    if (globalPeriod.period && globalPeriod.period !== prevGlobalPeriodRef.current) {
      prevGlobalPeriodRef.current = globalPeriod.period;
      setControls((prev) => ({
        ...prev,
        selectedPeriods: globalPeriod.selectedPeriods.filter((p) =>
          availablePeriods.includes(p)
        ),
      }));
    }
  }, [globalPeriod.period, globalPeriod.selectedPeriods, availablePeriods]);

  const filteredPeriods = useMemo(
    () => periods.filter((p) => controls.selectedPeriods.includes(p.period)),
    [periods, controls.selectedPeriods],
  );

  const hasData = connected && periods.length > 0;

  /* ─── computed summaries (from filtered periods) ─── */
  const totalRevenue = filteredPeriods.reduce((s, p) => s + p.revenue, 0);
  const avgGrossMargin = filteredPeriods.length > 0
    ? Math.round((filteredPeriods.reduce((s, p) => s + p.grossMargin, 0) / filteredPeriods.length) * 10) / 10
    : 0;
  const avgOperatingMargin = filteredPeriods.length > 0
    ? Math.round((filteredPeriods.reduce((s, p) => s + p.operatingMargin, 0) / filteredPeriods.length) * 10) / 10
    : 0;
  const totalNetProfit = filteredPeriods.reduce((s, p) => s + p.netProfit, 0);
  const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.value, 0);

  /* ─── CSV export data ─── */
  const csvData = useMemo(
    () =>
      filteredPeriods.map((p) => ({
        Period: fmtPeriod(p.period),
        Revenue: p.revenue,
        'Gross Margin %': p.grossMargin,
        'Operating Margin %': p.operatingMargin,
        'Net Profit': p.netProfit,
      })),
    [filteredPeriods],
  );

  /* ─── chart data (from filtered periods) ─── */
  const grossMarginData = filteredPeriods.map((p) => ({
    period: fmtPeriod(p.period),
    margin: p.grossMargin,
  }));

  const operatingMarginData = filteredPeriods.map((p) => ({
    period: fmtPeriod(p.period),
    margin: p.operatingMargin,
  }));

  const netProfitData = filteredPeriods.map((p) => ({
    period: fmtPeriod(p.period),
    profit: p.netProfit,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profitability</h1>
          <p className="text-muted-foreground text-sm">
            Margins, expenses, and profitability trends
          </p>
          <DataFreshness lastSyncAt={lastSync.completedAt} />
        </div>
        <div className="flex items-center gap-3">
          <ChallengeButton
            page="profitability"
            metricLabel="Profitability"
            period={filteredPeriods[filteredPeriods.length - 1]?.period}
          />
          <Link
            href="/dashboard"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>

      {hasData && (
        <ReportControls
          availablePeriods={availablePeriods}
          showComparison={false}
          showViewMode={false}
          onChange={setControls}
          state={controls}
          exportTitle="profitability"
          exportData={csvData}
        />
      )}

      {/* AI Narrative Summary */}
      {hasData && (
        <NarrativeSummary
          orgId={orgId}
          period={controls.selectedPeriods[controls.selectedPeriods.length - 1] ?? ''}
          narrativeEndpoint="narrative/profitability"
        />
      )}

      {/* No data banner */}
      {!hasData && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium">No Financial Data Available</p>
            <p className="text-muted-foreground text-sm mt-1">
              Connect your accounting software to see real profitability data.
            </p>
            <Link
              href="/integrations"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Integrations
            </Link>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* Summary stat cards with inline bullet bars */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Total Revenue" orgId={orgId}>Total Revenue</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {filteredPeriods.length} period{filteredPeriods.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                    <Percent className="h-4 w-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Gross Margin" orgId={orgId}>Avg Gross Margin</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgGrossMargin}%</p>
                <div className="mt-2 h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(Math.max(avgGrossMargin, 0), 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average across all periods
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-violet-100 dark:bg-violet-950 p-2">
                    <BarChart3 className="h-4 w-4 text-violet-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Operating Margin" orgId={orgId}>Avg Operating Margin</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgOperatingMargin}%</p>
                <div className="mt-2 h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${avgOperatingMargin >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.abs(avgOperatingMargin), 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Net profit / revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2">
                    <PiggyBank className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Net Profit" orgId={orgId}>Total Net Profit</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${totalNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {format(totalNetProfit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All periods combined
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gross Margin Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base"><FinancialTooltip term="Gross Margin" orgId={orgId}>Gross Margin Trend</FinancialTooltip></CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={grossMarginData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${Number(v ?? 0)}%`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<SmartChartTooltip chartData={grossMarginData} valueKey="margin" isPercentage />} />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      stroke={COLORS.emerald}
                      strokeWidth={2}
                      dot={{ r: 3, fill: COLORS.emerald }}
                      name="Gross Margin"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Operating Margin Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base"><FinancialTooltip term="Operating Margin" orgId={orgId}>Operating Margin Trend</FinancialTooltip></CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={operatingMarginData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${Number(v ?? 0)}%`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<SmartChartTooltip chartData={operatingMarginData} valueKey="margin" isPercentage />} />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      stroke={COLORS.blue}
                      strokeWidth={2}
                      dot={{ r: 3, fill: COLORS.blue }}
                      name="Operating Margin"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <FinancialTooltip term="Expense Breakdown" orgId={orgId}>Expense Breakdown</FinancialTooltip> ({format(totalExpenses)} total)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {expenseBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<SmartChartTooltip chartData={expenseBreakdown} valueKey="value" formatValue={format} />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Net Profit Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base"><FinancialTooltip term="Net Profit" orgId={orgId}>Net Profit Trend</FinancialTooltip></CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={netProfitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => format(Number(v ?? 0))}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<SmartChartTooltip chartData={netProfitData} valueKey="profit" formatValue={format} />} />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke={COLORS.emerald}
                      fill={COLORS.emerald}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      name="Net Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cross-references */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Related:</span>
            <CrossRef href="/financials/income-statement" label="Income Statement" />
            <CrossRef href="/variance" label="Variance Analysis" />
            <CrossRef href="/kpi" label="KPI Dashboard" />
          </div>
        </>
      )}
    </div>
  );
}
