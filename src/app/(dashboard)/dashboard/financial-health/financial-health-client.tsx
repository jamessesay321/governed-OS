'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/components/providers/currency-context';
import { ReportControls, getDefaultReportState, type ReportControlsState } from '@/components/financial/report-controls';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { ChallengeButton } from '@/components/shared/challenge-panel';
import { CrossRef } from '@/components/shared/in-page-link';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { Scale, Building2, Wallet, Flame } from 'lucide-react';
import { SmartChartTooltip } from '@/components/charts/smart-chart-tooltip';
import { NumberLegend } from '@/components/data-primitives';

/* ─── colour palette ─── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
};

const RUNWAY_TARGET = 24;

interface FinancialHealthProps {
  orgId: string;
  connected: boolean;
  hasData: boolean;
  currentRatio: number;
  totalAssets: number;
  totalLiabilities: number;
  cashPosition: number;
  burnRates: Array<{ period: string; burn: number }>;
  cashByPeriod: Array<{ period: string; cash: number }>;
  runwayMonths: number;
  lastSync: { completedAt: string | null };
}

function formatPeriodLabel(period: string): string {
  const d = new Date(period + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function getRatioBadge(ratio: number) {
  if (ratio >= 1.5)
    return (
      <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-300">
        Strong (&gt;1.5)
      </Badge>
    );
  if (ratio >= 1.0)
    return (
      <Badge variant="outline" className="mt-1 text-amber-600 border-amber-300">
        Adequate (&gt;1.0)
      </Badge>
    );
  return (
    <Badge variant="outline" className="mt-1 text-rose-600 border-rose-300">
      Low (&lt;1.0)
    </Badge>
  );
}

export default function FinancialHealthClient({
  orgId,
  connected,
  hasData,
  currentRatio,
  totalAssets,
  cashPosition,
  burnRates,
  cashByPeriod,
  runwayMonths,
  lastSync,
}: FinancialHealthProps) {
  const { format } = useCurrency();

  const availablePeriods = useMemo(
    () => burnRates.map((b) => b.period).sort(),
    [burnRates]
  );

  const { yearEndMonth } = useAccountingConfig();
  const globalPeriod = useGlobalPeriodContext();
  const [controls, setControls] = useState<ReportControlsState>(() =>
    getDefaultReportState(availablePeriods, yearEndMonth)
  );

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

  const filteredBurnRates = useMemo(
    () => burnRates.filter((b) => controls.selectedPeriods.includes(b.period)),
    [burnRates, controls.selectedPeriods]
  );

  const filteredCashByPeriod = useMemo(
    () => cashByPeriod.filter((c) => controls.selectedPeriods.includes(c.period)),
    [cashByPeriod, controls.selectedPeriods]
  );

  const latestBurn = filteredBurnRates.length > 0 ? filteredBurnRates[filteredBurnRates.length - 1].burn : 0;
  const avgBurn =
    filteredBurnRates.length > 0
      ? filteredBurnRates.reduce((sum, b) => sum + b.burn, 0) / filteredBurnRates.length
      : 0;

  const chartBurnRates = filteredBurnRates.map((b) => ({
    label: formatPeriodLabel(b.period),
    burn: b.burn,
  }));

  const chartCashByPeriod = filteredCashByPeriod.map((c) => ({
    label: formatPeriodLabel(c.period),
    cash: c.cash,
  }));

  const csvData = useMemo(
    () =>
      filteredBurnRates.map((b) => {
        const cashEntry = filteredCashByPeriod.find((c) => c.period === b.period);
        return {
          Period: formatPeriodLabel(b.period),
          'Burn Rate': b.burn,
          'Cash Position': cashEntry?.cash ?? 0,
        };
      }),
    [filteredBurnRates, filteredCashByPeriod]
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Health</h1>
          <p className="text-muted-foreground text-sm">
            Cash flow, runway, and working-capital overview
          </p>
          <DataFreshness lastSyncAt={lastSync.completedAt} />
        </div>
        <div className="flex items-center gap-3">
          <ChallengeButton
            page="financial-health"
            metricLabel="Financial Health"
          />
          <Link
            href="/dashboard"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* No-data banner */}
      {(!connected || !hasData) && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">
              {!connected
                ? 'No accounting platform connected'
                : 'No financial data available yet'}
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {!connected
                ? 'Connect your Xero account in Settings to see real financial health metrics.'
                : 'Data will appear here once your first sync completes.'}
            </p>
            {!connected && (
              <Link
                href="/dashboard/settings"
                className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Go to Settings
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data type legend */}
      <NumberLegend />

      {/* AI Narrative Summary */}
      {hasData && (
        <NarrativeSummary
          orgId={orgId}
          period={controls.selectedPeriods[controls.selectedPeriods.length - 1] ?? ''}
          narrativeEndpoint="narrative/financial-health"
        />
      )}

      {hasData && (
        <>
          <ReportControls
            availablePeriods={availablePeriods}
            showComparison={false}
            showViewMode={false}
            showSearch={false}
            onChange={setControls}
            state={controls}
            exportTitle="financial-health"
            exportData={csvData}
          />

          {/* Stat cards row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-2">
                    <Scale className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Current Ratio" orgId={orgId}>Current Ratio</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{currentRatio.toFixed(2)}</p>
                {getRatioBadge(currentRatio)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Total Assets" orgId={orgId}>Total Assets</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(totalAssets)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Cash Position" orgId={orgId}>Cash Position</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(cashPosition)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-rose-100 dark:bg-rose-950 p-2">
                    <Flame className="h-4 w-4 text-rose-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <FinancialTooltip term="Monthly Burn" orgId={orgId}>Monthly Burn</FinancialTooltip>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(latestBurn)}</p>
                <p className="text-xs text-muted-foreground mt-1">Latest period</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Burn Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base"><FinancialTooltip term="Burn Rate Trend" orgId={orgId}>Burn Rate Trend</FinancialTooltip></CardTitle>
              </CardHeader>
              <CardContent>
                {chartBurnRates.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartBurnRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis
                        tickFormatter={(v) => format(Number(v ?? 0))}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<SmartChartTooltip chartData={chartBurnRates} valueKey="burn" formatValue={format} />} />
                      <Line
                        type="monotone"
                        dataKey="burn"
                        stroke={COLORS.rose}
                        strokeWidth={2}
                        dot={{ r: 4, fill: COLORS.rose }}
                        name="Burn Rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No burn rate data available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cash Position */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base"><FinancialTooltip term="Cash Position" orgId={orgId}>Cash Position</FinancialTooltip></CardTitle>
              </CardHeader>
              <CardContent>
                {chartCashByPeriod.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartCashByPeriod}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis
                        tickFormatter={(v) => format(Number(v ?? 0))}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<SmartChartTooltip chartData={chartCashByPeriod} valueKey="cash" formatValue={format} />} />
                      <Area
                        type="monotone"
                        dataKey="cash"
                        stroke={COLORS.blue}
                        fill={COLORS.blue}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        name="Cash Balance"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No cash position data available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Runway Gauge */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base"><FinancialTooltip term="Cash Runway" orgId={orgId}>Cash Runway</FinancialTooltip></CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 pt-4">
                <div className="w-full max-w-md">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">
                      {runwayMonths > 0 ? `${runwayMonths} months` : 'N/A'}
                    </span>
                    <span className="text-muted-foreground">
                      Target: {RUNWAY_TARGET} months
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((runwayMonths / RUNWAY_TARGET) * 100, 100)}%`,
                        background:
                          runwayMonths >= 12
                            ? `linear-gradient(90deg, ${COLORS.emerald}, ${COLORS.cyan})`
                            : runwayMonths >= 6
                              ? `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.amber})`
                              : `linear-gradient(90deg, ${COLORS.rose}, ${COLORS.rose})`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Based on {format(cashPosition)} cash and {format(avgBurn)}/mo average
                    burn.
                    {runwayMonths > 0 && runwayMonths < RUNWAY_TARGET && (
                      <> {(RUNWAY_TARGET - runwayMonths).toFixed(1)} months below target.</>
                    )}
                    {runwayMonths >= RUNWAY_TARGET && <> Target achieved.</>}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center mt-4 w-full max-w-md">
                  <div>
                    <p className="text-2xl font-bold">{format(cashPosition)}</p>
                    <p className="text-xs text-muted-foreground">Cash</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">÷ {format(avgBurn)}</p>
                    <p className="text-xs text-muted-foreground">Avg Burn</p>
                  </div>
                  <div>
                    <p
                      className={`text-2xl font-bold ${
                        runwayMonths >= 12
                          ? 'text-emerald-600'
                          : runwayMonths >= 6
                            ? 'text-amber-600'
                            : 'text-rose-600'
                      }`}
                    >
                      = {runwayMonths > 0 ? `${runwayMonths}mo` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Runway</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cross-references */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Related:</span>
            <CrossRef href="/financials/balance-sheet" label="Balance Sheet" />
            <CrossRef href="/financials/cash-flow" label="Cash Flow" />
            <CrossRef href="/dashboard/profitability" label="Profitability" />
            <CrossRef href="/kpi" label="KPI Dashboard" />
          </div>
        </>
      )}
    </div>
  );
}
