'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, PieChart, Pie, Cell,
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
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';

/* ─── colour palette ─── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
};

const PIE_COLORS = [COLORS.blue, COLORS.emerald, COLORS.violet, COLORS.amber, COLORS.cyan];

/* ─── Props ─── */
interface RevenueProps {
  orgId: string;
  connected: boolean;
  periods: Array<{
    period: string;
    revenue: number;
    growthPct: number;
  }>;
  revenueByAccount: Array<{ name: string; value: number }>;
  lastSync: { completedAt: string | null };
}

/* ─── helper to format period YYYY-MM-01 to short label ─── */
function fmtPeriod(period: string): string {
  const d = new Date(period + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function RevenueClient({
  orgId,
  connected,
  periods,
  revenueByAccount,
  lastSync,
}: RevenueProps) {
  const { format } = useCurrency();

  const availablePeriods = useMemo(() => periods.map((p) => p.period), [periods]);
  const { yearEndMonth } = useAccountingConfig();
  const globalPeriod = useGlobalPeriodContext();
  const [controls, setControls] = useState<ReportControlsState>(() => getDefaultReportState(availablePeriods, yearEndMonth));

  // Sync from global period selector when it changes
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
  const latestRevenue = filteredPeriods.length > 0 ? filteredPeriods[filteredPeriods.length - 1].revenue : 0;
  const avgMonthlyRevenue = filteredPeriods.length > 0
    ? Math.round(totalRevenue / filteredPeriods.length)
    : 0;

  // Revenue growth: latest period vs first period
  const firstRevenue = filteredPeriods.length > 0 ? filteredPeriods[0].revenue : 0;
  const revenueGrowthPct = firstRevenue > 0
    ? Math.round(((latestRevenue - firstRevenue) / firstRevenue) * 1000) / 10
    : 0;

  /* ─── CSV export data ─── */
  const csvData = useMemo(
    () =>
      filteredPeriods.map((p) => ({
        Period: fmtPeriod(p.period),
        Revenue: p.revenue,
        'Growth %': p.growthPct,
      })),
    [filteredPeriods],
  );

  /* ─── chart data (from filtered periods) ─── */
  const revenueTrendData = filteredPeriods.map((p) => ({
    period: fmtPeriod(p.period),
    revenue: p.revenue,
  }));

  const growthRateData = filteredPeriods.slice(1).map((p) => ({
    period: fmtPeriod(p.period),
    rate: p.growthPct,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="text-muted-foreground text-sm">
            Revenue mix, growth trends, and account breakdown
          </p>
          <DataFreshness lastSyncAt={lastSync.completedAt} />
        </div>
        <div className="flex items-center gap-3">
          <ChallengeButton
            page="revenue"
            metricLabel="Revenue"
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
          exportTitle="revenue"
          exportData={csvData}
        />
      )}

      {/* AI Narrative Summary */}
      {hasData && (
        <NarrativeSummary
          orgId={orgId}
          period={controls.selectedPeriods[controls.selectedPeriods.length - 1] ?? ''}
          narrativeEndpoint="narrative/revenue"
        />
      )}

      {/* No data banner */}
      {!hasData && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium">No Revenue Data Available</p>
            <p className="text-muted-foreground text-sm mt-1">
              Connect your accounting software to see real revenue data.
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
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Latest Month Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(latestRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredPeriods.length > 0 ? fmtPeriod(filteredPeriods[filteredPeriods.length - 1].period) : '-'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(avgMonthlyRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mean across all periods
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenue Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${revenueGrowthPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {revenueGrowthPct >= 0 ? '+' : ''}{revenueGrowthPct}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Latest vs first period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue by Account */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Account</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByAccount}
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
                      {revenueByAccount.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => format(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => format(Number(v ?? 0))}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(v) => format(Number(v ?? 0))} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.blue}
                      strokeWidth={2}
                      dot={{ r: 3, fill: COLORS.blue }}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Growth Rate */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Revenue Growth Rate (MoM %)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={growthRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${Number(v ?? 0)}%`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke={COLORS.emerald}
                      strokeWidth={2}
                      dot={{ r: 3, fill: COLORS.emerald }}
                      name="Growth %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cross-references */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Related:</span>
            <CrossRef href="/financials/income-statement" label="Income Statement" />
            <CrossRef href="/dashboard/profitability" label="Profitability" />
            <CrossRef href="/variance" label="Variance Analysis" />
            <CrossRef href="/kpi" label="KPI Dashboard" />
          </div>
        </>
      )}
    </div>
  );
}
