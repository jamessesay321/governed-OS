'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { formatCurrency, formatPercent, formatCurrencyCompact } from '@/lib/formatting/currency';
import {
  TrendingUp, TrendingDown, Minus, ArrowLeft,
  Sparkles, DollarSign, BarChart3, PieChart, Wallet, Flag, ShieldAlert,
} from 'lucide-react';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { useChallenge } from '@/components/shared/challenge-panel';
import { CrossRef } from '@/components/shared/in-page-link';
import { ProductIntelligence } from '@/components/dashboard/product-intelligence';

// ─── Types ─────────────────────────────────────────────────────────

type PnLData = {
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

type ComplianceAlert = {
  label: string;
  status: 'ok' | 'warning' | 'critical';
  detail: string;
};

interface ExecutiveSummaryClientProps {
  orgId: string;
  orgName: string;
  displayName: string;
  industry: string;
  connected: boolean;
  lastSyncAt: string | null;
  hasData: boolean;
  periods: string[];
  pnlByPeriod: Record<string, PnLData>;
  cashPosition: number;
  totalAssets: number;
  totalLiabilities: number;
  companyNumber?: string;
  complianceAlerts?: ComplianceAlert[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function variance(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { pct: 0, direction: 'flat' };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, direction: 'flat' };
  return { pct, direction: pct > 0 ? 'up' : 'down' };
}

function TrendBadge({
  current,
  previous,
  higherIsBetter = true,
}: {
  current: number;
  previous: number;
  higherIsBetter?: boolean;
}) {
  const v = variance(current, previous);
  if (v.direction === 'flat') return null;
  const isGood = higherIsBetter ? v.direction === 'up' : v.direction === 'down';
  const Icon = v.direction === 'up' ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(v.pct).toFixed(1)}%
    </span>
  );
}

function BulletGraph({
  value,
  target,
  max,
  label,
  color = 'bg-blue-500',
}: {
  value: number;
  target?: number;
  max: number;
  label: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  const targetPct = target && max > 0 ? Math.min((Math.abs(target) / max) * 100, 100) : undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium font-mono">{formatCurrencyCompact(value)}</span>
      </div>
      <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
        {targetPct !== undefined && (
          <div
            className="absolute inset-y-0 w-0.5 bg-slate-800"
            style={{ left: `${targetPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function formatPeriodLabel(period: string): string {
  if (!period) return '';
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDataFreshness(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Not synced';
  const syncDate = new Date(lastSyncAt);
  const now = new Date();
  const hours = Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'Synced just now';
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Synced ${days}d ago`;
}

// ─── Waterfall Data ─────────────────────────────────────────────────

function buildWaterfallBars(pnl: PnLData) {
  return [
    { label: 'Revenue', value: pnl.revenue, color: 'bg-blue-500', cumulative: pnl.revenue },
    { label: 'COGS', value: -pnl.costOfSales, color: 'bg-red-400', cumulative: pnl.grossProfit },
    { label: 'Gross Profit', value: pnl.grossProfit, color: 'bg-emerald-500', cumulative: pnl.grossProfit },
    { label: 'OpEx', value: -pnl.expenses, color: 'bg-orange-400', cumulative: pnl.netProfit },
    { label: 'Net Profit', value: pnl.netProfit, color: pnl.netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-500', cumulative: pnl.netProfit },
  ];
}

// ─── Component ──────────────────────────────────────────────────────

export function ExecutiveSummaryClient({
  orgId,
  orgName,
  displayName,
  industry,
  connected,
  lastSyncAt,
  hasData,
  periods,
  pnlByPeriod,
  cashPosition,
  totalAssets,
  totalLiabilities,
  companyNumber = '',
  complianceAlerts = [],
}: ExecutiveSummaryClientProps) {
  const { period: globalPeriod } = useGlobalPeriodContext();
  const { openDrill } = useDrillDown();
  const { openChallenge } = useChallenge();

  // Use global period, fall back to latest
  const currentPeriod = useMemo(() => {
    if (globalPeriod && periods.includes(globalPeriod)) return globalPeriod;
    return periods[0] ?? '';
  }, [globalPeriod, periods]);

  const currentPnl = pnlByPeriod[currentPeriod];

  // Previous period (one month back)
  const sortedPeriods = useMemo(() => [...periods].sort(), [periods]);
  const periodIdx = sortedPeriods.indexOf(currentPeriod);
  const previousPeriod = periodIdx > 0 ? sortedPeriods[periodIdx - 1] : null;
  const previousPnl = previousPeriod ? pnlByPeriod[previousPeriod] : null;

  // Same month last year
  const lastYearPeriod = useMemo(() => {
    if (!currentPeriod) return null;
    const d = new Date(currentPeriod);
    d.setFullYear(d.getFullYear() - 1);
    const target = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    return pnlByPeriod[target] ? target : null;
  }, [currentPeriod, pnlByPeriod]);
  const lastYearPnl = lastYearPeriod ? pnlByPeriod[lastYearPeriod] : null;

  const firstName = displayName?.split(' ')[0] || 'there';

  // Waterfall bars
  const waterfallBars = currentPnl ? buildWaterfallBars(currentPnl) : [];
  const maxWaterfall = currentPnl ? Math.max(currentPnl.revenue, Math.abs(currentPnl.netProfit)) : 1;

  // Gross margin %
  const grossMarginPct = currentPnl && currentPnl.revenue > 0
    ? (currentPnl.grossProfit / currentPnl.revenue) * 100
    : 0;
  const prevGrossMarginPct = previousPnl && previousPnl.revenue > 0
    ? (previousPnl.grossProfit / previousPnl.revenue) * 100
    : 0;
  const netMarginPct = currentPnl && currentPnl.revenue > 0
    ? (currentPnl.netProfit / currentPnl.revenue) * 100
    : 0;

  // Current ratio
  const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 0;

  if (!hasData || !currentPnl) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
            Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold mt-2">Executive Summary</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {connected
                ? 'No financial data yet. Trigger a sync to pull data from Xero.'
                : 'Connect your Xero account to generate an executive summary.'}
            </p>
            <Link
              href={connected ? '/financials' : '/integrations'}
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {connected ? 'Go to Financials' : 'Connect Xero'}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
            Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold mt-2">Executive Summary</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orgName ? `${orgName} \u2014 ` : ''}{formatPeriodLabel(currentPeriod)}
            {industry && (
              <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                {industry}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              openChallenge({
                page: 'executive-summary',
                metricLabel: 'Executive Summary',
                period: currentPeriod,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Flag a number for review"
          >
            <Flag className="h-3.5 w-3.5" />
            Challenge
          </button>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatDataFreshness(lastSyncAt)}</p>
            <p className="mt-0.5">Source: Xero</p>
          </div>
        </div>
      </div>

      {/* AI Narrative Lead */}
      <NarrativeSummary orgId={orgId} period={currentPeriod} />

      {/* KPI Bullet Graphs — 5 key metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue */}
            <div
              className="space-y-1 cursor-pointer rounded-lg p-3 -m-3 hover:bg-muted/30 transition-colors"
              onClick={() =>
                openDrill({
                  type: 'kpi',
                  kpiKey: 'revenue',
                  label: 'Revenue',
                  value: currentPnl.revenue,
                  formattedValue: formatCurrency(currentPnl.revenue),
                  period: currentPeriod,
                })
              }
            >
              <div className="flex items-center justify-between">
                <FinancialTooltip term="revenue" orgId={orgId}><span className="text-sm font-medium">Revenue</span></FinancialTooltip>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatCurrency(currentPnl.revenue)}</span>
                  {previousPnl && (
                    <TrendBadge current={currentPnl.revenue} previous={previousPnl.revenue} />
                  )}
                </div>
              </div>
              {previousPnl && (
                <p className="text-[11px] text-muted-foreground">
                  vs {formatCurrencyCompact(previousPnl.revenue)} last month
                  {lastYearPnl && ` | ${formatCurrencyCompact(lastYearPnl.revenue)} same month last year`}
                </p>
              )}
              <BulletGraph
                value={currentPnl.revenue}
                target={previousPnl?.revenue}
                max={Math.max(currentPnl.revenue, previousPnl?.revenue ?? 0) * 1.2}
                label=""
                color="bg-blue-500"
              />
            </div>

            {/* Gross Margin */}
            <div className="space-y-1 rounded-lg p-3 -m-3">
              <div className="flex items-center justify-between">
                <FinancialTooltip term="gross_margin" orgId={orgId}><span className="text-sm font-medium">Gross Margin</span></FinancialTooltip>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatPercent(grossMarginPct)}</span>
                  {previousPnl && (
                    <TrendBadge current={grossMarginPct} previous={prevGrossMarginPct} />
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Gross profit: {formatCurrency(currentPnl.grossProfit)}
              </p>
              <BulletGraph
                value={grossMarginPct}
                target={prevGrossMarginPct || undefined}
                max={100}
                label=""
                color="bg-emerald-500"
              />
            </div>

            {/* Net Profit */}
            <div
              className="space-y-1 cursor-pointer rounded-lg p-3 -m-3 hover:bg-muted/30 transition-colors"
              onClick={() =>
                openDrill({
                  type: 'kpi',
                  kpiKey: 'net_profit',
                  label: 'Net Profit',
                  value: currentPnl.netProfit,
                  formattedValue: formatCurrency(currentPnl.netProfit),
                  period: currentPeriod,
                })
              }
            >
              <div className="flex items-center justify-between">
                <FinancialTooltip term="net_profit" orgId={orgId}><span className="text-sm font-medium">Net Profit</span></FinancialTooltip>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${currentPnl.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(currentPnl.netProfit)}
                  </span>
                  {previousPnl && (
                    <TrendBadge current={currentPnl.netProfit} previous={previousPnl.netProfit} />
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatPercent(netMarginPct)} margin
                {previousPnl && ` | vs ${formatCurrency(previousPnl.netProfit)} last month`}
              </p>
              <BulletGraph
                value={currentPnl.netProfit}
                target={previousPnl?.netProfit}
                max={Math.max(Math.abs(currentPnl.netProfit), Math.abs(previousPnl?.netProfit ?? 0)) * 1.3}
                label=""
                color={currentPnl.netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
              />
            </div>

            {/* Expenses */}
            <div
              className="space-y-1 cursor-pointer rounded-lg p-3 -m-3 hover:bg-muted/30 transition-colors"
              onClick={() =>
                openDrill({
                  type: 'kpi',
                  kpiKey: 'expenses',
                  label: 'Operating Expenses',
                  value: currentPnl.expenses,
                  formattedValue: formatCurrency(currentPnl.expenses),
                  period: currentPeriod,
                })
              }
            >
              <div className="flex items-center justify-between">
                <FinancialTooltip term="operating_expenses" orgId={orgId}><span className="text-sm font-medium">Operating Expenses</span></FinancialTooltip>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatCurrency(currentPnl.expenses)}</span>
                  {previousPnl && (
                    <TrendBadge
                      current={currentPnl.expenses}
                      previous={previousPnl.expenses}
                      higherIsBetter={false}
                    />
                  )}
                </div>
              </div>
              {previousPnl && (
                <p className="text-[11px] text-muted-foreground">
                  vs {formatCurrencyCompact(previousPnl.expenses)} last month
                </p>
              )}
              <BulletGraph
                value={currentPnl.expenses}
                target={previousPnl?.expenses}
                max={Math.max(currentPnl.expenses, previousPnl?.expenses ?? 0) * 1.2}
                label=""
                color="bg-orange-500"
              />
            </div>

            {/* Cash Position */}
            <div className="space-y-1 rounded-lg p-3 -m-3">
              <div className="flex items-center justify-between">
                <FinancialTooltip term="cash_position" orgId={orgId}><span className="text-sm font-medium">Cash Position</span></FinancialTooltip>
                <span className={`text-lg font-bold ${cashPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(cashPosition)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Current ratio: {currentRatio.toFixed(2)}x
                {totalAssets > 0 && ` | Assets: ${formatCurrencyCompact(totalAssets)}`}
              </p>
              <BulletGraph
                value={cashPosition}
                max={totalAssets > 0 ? totalAssets : Math.abs(cashPosition) * 2}
                label=""
                color={cashPosition >= 0 ? 'bg-blue-500' : 'bg-red-500'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual P&L Waterfall */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            P&L Waterfall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {waterfallBars.map((bar) => {
              const pct = maxWaterfall > 0 ? (Math.abs(bar.value) / maxWaterfall) * 100 : 0;
              return (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted-foreground text-right shrink-0">
                    {bar.label}
                  </span>
                  <div className="flex-1 relative h-6 rounded bg-muted/30 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded ${bar.color} transition-all`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                      {formatCurrencyCompact(bar.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Context */}
      {(previousPnl || lastYearPnl) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Period Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Metric</th>
                    <th className="text-right py-2 px-3 font-medium">Current</th>
                    {previousPnl && (
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Last Month</th>
                    )}
                    {lastYearPnl && (
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Last Year</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Revenue', key: 'revenue' as const, higherIsBetter: true },
                    { label: 'Gross Profit', key: 'grossProfit' as const, higherIsBetter: true },
                    { label: 'Operating Expenses', key: 'expenses' as const, higherIsBetter: false },
                    { label: 'Net Profit', key: 'netProfit' as const, higherIsBetter: true },
                  ].map((row) => (
                    <tr key={row.key} className="border-b last:border-b-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold">
                        {formatCurrency(currentPnl[row.key])}
                      </td>
                      {previousPnl && (
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-muted-foreground">
                          <div className="flex items-center justify-end gap-1.5">
                            {formatCurrency(previousPnl[row.key])}
                            <TrendBadge
                              current={currentPnl[row.key]}
                              previous={previousPnl[row.key]}
                              higherIsBetter={row.higherIsBetter}
                            />
                          </div>
                        </td>
                      )}
                      {lastYearPnl && (
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-muted-foreground">
                          <div className="flex items-center justify-end gap-1.5">
                            {formatCurrency(lastYearPnl[row.key])}
                            <TrendBadge
                              current={currentPnl[row.key]}
                              previous={lastYearPnl[row.key]}
                              higherIsBetter={row.higherIsBetter}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Intelligence */}
      <ProductIntelligence orgId={orgId} period={currentPeriod} />

      {/* UK Compliance Status */}
      {complianceAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Compliance Status
              {companyNumber && (
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Company #{companyNumber}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {complianceAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    alert.status === 'critical'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : alert.status === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <span className="font-medium">{alert.label}</span>
                  <span className="text-xs">{alert.detail}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Filing deadlines based on Companies House records.{' '}
              <Link href="/settings" className="underline hover:text-foreground">
                Update company details
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/kpi" label="KPI Dashboard" />
        <CrossRef href="/dashboard/profitability" label="Profitability" />
        <CrossRef href="/dashboard/financial-health" label="Financial Health" />
        <CrossRef href="/dashboard/revenue" label="Revenue Analysis" />
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/financials/income-statement" className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
          <DollarSign className="h-5 w-5 text-blue-500 mb-1" />
          <p className="text-sm font-medium">Income Statement</p>
          <p className="text-xs text-muted-foreground">Full P&L detail by account</p>
        </Link>
        <Link href="/financials/balance-sheet" className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
          <Wallet className="h-5 w-5 text-emerald-500 mb-1" />
          <p className="text-sm font-medium">Balance Sheet</p>
          <p className="text-xs text-muted-foreground">Assets, liabilities & equity</p>
        </Link>
        <Link href="/variance" className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
          <BarChart3 className="h-5 w-5 text-orange-500 mb-1" />
          <p className="text-sm font-medium">Variance Analysis</p>
          <p className="text-xs text-muted-foreground">Budget vs actual with AI drivers</p>
        </Link>
      </div>
    </div>
  );
}
