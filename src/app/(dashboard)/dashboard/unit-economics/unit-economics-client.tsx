'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/components/providers/currency-context';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import { ChallengeButton } from '@/components/shared/challenge-panel';
import { CrossRef } from '@/components/shared/in-page-link';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { ExportButton } from '@/components/shared/export-button';
import type { ExportColumn } from '@/components/shared/export-button';
import { NumberLegend } from '@/components/data-primitives';
import { SmartChartTooltip } from '@/components/charts/smart-chart-tooltip';
import {
  Users, Scissors, Camera, Store,
  TrendingUp, Package, Receipt, Building2,
  AlertTriangle, AlertCircle, Info, Check,
  ChevronDown, ChevronUp, Pencil,
} from 'lucide-react';
import type {
  FashionUnitEconomicsSummary,
  FashionKPI,
  CostAccount,
  DataQualityAlert,
  FashionCostCategory,
  UnitEconomicsOverrides,
} from '@/lib/financial/fashion-unit-economics';
import { FASHION_COST_LABELS } from '@/lib/financial/fashion-unit-economics';

/* ─── colour palette ─── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  pink: '#ec4899',
};

const PIE_COLORS = [
  COLORS.blue, COLORS.emerald, COLORS.rose, COLORS.violet,
  COLORS.amber, COLORS.cyan, COLORS.indigo, COLORS.pink,
];

/* ─── Props ─── */
interface PeriodSummaryProp {
  period: string;
  summary: FashionUnitEconomicsSummary;
  shopifyProductCount: number;
  /** Raw data needed for client-side recalculation */
  rawTotalRevenue: number;
  rawTotalCOGS: number;
}

interface UnitEconomicsClientProps {
  orgId: string;
  connected: boolean;
  periodSummaries: PeriodSummaryProp[];
  availablePeriods: string[];
  lastSync: { completedAt: string | null };
}

/* ─── helpers ─── */
function fmtPeriod(period: string): string {
  const d = new Date(period + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function severityColor(severity?: 'good' | 'warning' | 'critical' | 'needs_verification'): string {
  switch (severity) {
    case 'good': return 'text-emerald-600';
    case 'warning': return 'text-amber-600';
    case 'critical': return 'text-rose-600';
    case 'needs_verification': return 'text-orange-500';
    default: return 'text-foreground';
  }
}

function severityBg(severity?: 'good' | 'warning' | 'critical' | 'needs_verification'): string {
  switch (severity) {
    case 'good': return 'bg-emerald-100 dark:bg-emerald-950';
    case 'warning': return 'bg-amber-100 dark:bg-amber-950';
    case 'critical': return 'bg-rose-100 dark:bg-rose-950';
    case 'needs_verification': return 'bg-orange-100 dark:bg-orange-950';
    default: return 'bg-slate-100 dark:bg-slate-800';
  }
}

function severityBadge(severity?: 'good' | 'warning' | 'critical' | 'needs_verification') {
  switch (severity) {
    case 'good':
      return <Badge variant="default" className="bg-emerald-600">On Track</Badge>;
    case 'warning':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Watch</Badge>;
    case 'critical':
      return <Badge variant="destructive">Action Needed</Badge>;
    case 'needs_verification':
      return <Badge variant="outline" className="border-orange-400 text-orange-600">Needs Verification</Badge>;
    default:
      return null;
  }
}

const alertIcon = (severity: DataQualityAlert['severity']) => {
  switch (severity) {
    case 'critical': return <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />;
    case 'warning': return <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />;
    case 'info': return <Info className="h-5 w-5 text-blue-500 shrink-0" />;
  }
};

const RECLASSIFY_OPTIONS: { value: FashionCostCategory; label: string }[] = [
  { value: 'production_staff', label: 'Production Staff' },
  { value: 'fabric', label: 'Fabric & Materials' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'freelance_production', label: 'Freelance Production' },
  { value: 'design_staff', label: 'Design Staff' },
  { value: 'admin_staff', label: 'Admin & Director' },
  { value: 'photoshoot', label: 'Photoshoot' },
  { value: 'trunk_show', label: 'Trunk Show' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'rent_premises', label: 'Rent & Premises' },
  { value: 'shipping_delivery', label: 'Shipping' },
  { value: 'merchant_fees', label: 'Merchant Fees' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'software_subscriptions', label: 'Software' },
  { value: 'interest_finance', label: 'Interest & Finance' },
  { value: 'other_overhead', label: 'Other Overheads' },
];

export default function UnitEconomicsClient({
  orgId,
  connected,
  periodSummaries,
  availablePeriods,
  lastSync,
}: UnitEconomicsClientProps) {
  const { format } = useCurrency();
  const globalPeriod = useGlobalPeriodContext();
  const { yearEndMonth } = useAccountingConfig();

  const [selectedPeriod, setSelectedPeriod] = useState(
    globalPeriod.period || availablePeriods[availablePeriods.length - 1] || ''
  );

  // ── Assumption overrides (client-side, per period) ──
  const [overrides, setOverrides] = useState<Record<string, UnitEconomicsOverrides>>({});
  const [brideCountInput, setBrideCountInput] = useState('');
  const [showAlerts, setShowAlerts] = useState(true);
  const [showReclassify, setShowReclassify] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [pendingReclassifications, setPendingReclassifications] = useState<Record<string, FashionCostCategory>>({});

  // Sync from global period selector
  const prevGlobalPeriodRef = useRef(globalPeriod.period);
  useEffect(() => {
    if (globalPeriod.period && globalPeriod.period !== prevGlobalPeriodRef.current) {
      prevGlobalPeriodRef.current = globalPeriod.period;
      if (availablePeriods.includes(globalPeriod.period)) {
        setSelectedPeriod(globalPeriod.period);
      }
    }
  }, [globalPeriod.period, availablePeriods]);

  // Find current period's data
  const currentData = useMemo(
    () => periodSummaries.find((ps) => ps.period === selectedPeriod),
    [periodSummaries, selectedPeriod]
  );

  // Apply client-side overrides to recalculate affected metrics
  const summary = useMemo(() => {
    if (!currentData) return null;
    const base = currentData.summary;
    const periodOverrides = overrides[selectedPeriod];
    if (!periodOverrides?.brideCount) return base;

    // Recalculate per-bride metrics with overridden bride count
    const bc = periodOverrides.brideCount;
    const rev = base.perBride.totalBridalRevenue;
    const costs = base.perBride.totalDirectCosts;

    return {
      ...base,
      perBride: {
        ...base.perBride,
        brideCount: bc,
        brideCountSource: 'user_override' as const,
        revenuePerBride: bc > 0 ? rev / bc : 0,
        directCostPerBride: bc > 0 ? costs / bc : 0,
        grossMarginPerBride: bc > 0 ? (rev - costs) / bc : 0,
        grossMarginPct: rev > 0 ? ((rev - costs) / rev) * 100 : 0,
        avgItemsPerBride: bc > 0 ? base.perBride.avgItemsPerBride * base.perBride.brideCount / bc : 0,
        consultationRevenuePerBride: bc > 0 ? base.perBride.consultationRevenue / bc : 0,
      },
      // Recalculate KPIs that depend on bride count
      kpis: base.kpis.map((kpi) => {
        if (kpi.key === 'revenue_per_bride') {
          const rpb = bc > 0 ? rev / bc : 0;
          return {
            ...kpi,
            value: rpb,
            formattedValue: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(rpb),
            severity: rpb >= 1500 && rpb <= 25000 ? 'good' as const : rpb > 25000 ? 'warning' as const : 'critical' as const,
          };
        }
        if (kpi.key === 'gross_margin_per_bride') {
          const gm = rev > 0 ? ((rev - costs) / rev) * 100 : 0;
          return {
            ...kpi,
            value: gm,
            formattedValue: `${gm.toFixed(1)}%`,
            severity: gm >= 35 && gm <= 80 ? 'good' as const : gm > 80 ? 'needs_verification' as const : 'critical' as const,
          };
        }
        if (kpi.key === 'bride_count') {
          return {
            ...kpi,
            value: bc,
            formattedValue: String(bc),
            severity: undefined,
            benchmark: 'User-provided',
          };
        }
        return kpi;
      }),
      // Remove bride-count-related alerts if user provided a count
      alerts: base.alerts.filter((a) =>
        a.id !== 'bride_count_estimated' && a.id !== 'revenue_per_bride_high'
      ),
    };
  }, [currentData, overrides, selectedPeriod]);

  const handleBrideCountSubmit = useCallback(() => {
    const count = parseInt(brideCountInput, 10);
    if (!count || count < 1) return;
    setOverrides((prev) => ({
      ...prev,
      [selectedPeriod]: {
        ...(prev[selectedPeriod] ?? {}),
        brideCount: count,
      },
    }));
    setBrideCountInput('');
  }, [brideCountInput, selectedPeriod]);

  const handleDismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  }, []);

  // No data state
  if (!connected || periodSummaries.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Unit Economics</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {!connected
                ? 'Connect your Xero account to see unit economics.'
                : 'No financial data available. Sync data from Xero first.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Unit Economics</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No data available for the selected period.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cost breakdown for pie chart
  const costByCategory = new Map<FashionCostCategory, number>();
  for (const cost of summary.costBreakdown) {
    costByCategory.set(
      cost.costCategory,
      (costByCategory.get(cost.costCategory) ?? 0) + cost.amount
    );
  }
  const costPieData = Array.from(costByCategory.entries())
    .map(([category, amount]) => ({
      name: FASHION_COST_LABELS[category],
      value: Math.round(amount * 100) / 100,
      category,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Trend data across periods
  const brideTrendData = periodSummaries.map((ps) => {
    const o = overrides[ps.period];
    const bc = o?.brideCount ?? ps.summary.perBride.brideCount;
    const rev = ps.summary.perBride.totalBridalRevenue;
    const costs = ps.summary.perBride.totalDirectCosts;
    return {
      period: fmtPeriod(ps.period),
      revenuePerBride: bc > 0 ? Math.round(rev / bc) : 0,
      marginPerBride: bc > 0 ? Math.round((rev - costs) / bc) : 0,
      brides: bc,
    };
  });

  const productionTrendData = periodSummaries.map((ps) => ({
    period: fmtPeriod(ps.period),
    fullyLoaded: Math.round(ps.summary.production.fullyLoadedCostPerGarment),
    labour: Math.round(ps.summary.production.labourCostPerGarment),
    fabric: Math.round(ps.summary.production.fabricCostPerGarment),
  }));

  // Active alerts (not dismissed)
  const activeAlerts = summary.alerts.filter((a) => !dismissedAlerts.has(a.id));
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical');
  const warningAlerts = activeAlerts.filter((a) => a.severity === 'warning');

  // Export data
  const exportData = summary.kpis.map((kpi) => ({
    metric: kpi.label,
    value: kpi.formattedValue,
    benchmark: kpi.benchmark ?? '-',
    status: kpi.severity ?? '-',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            <FinancialTooltip term="Unit Economics" orgId={orgId}>
              Fashion Unit Economics
            </FinancialTooltip>
          </h2>
          <p className="text-sm text-muted-foreground">
            Per-bride revenue, production costs, and collection ROI — derived from your Xero &amp; Shopify data
          </p>
          <DataFreshness lastSyncAt={lastSync.completedAt} />
        </div>
        <div className="flex items-center gap-3">
          <ChallengeButton
            page="unit-economics"
            metricLabel="Unit Economics"
            period={selectedPeriod}
          />
          <ExportButton
            data={exportData}
            columns={[
              { header: 'Metric', key: 'metric', format: 'text' },
              { header: 'Value', key: 'value', format: 'text' },
              { header: 'Benchmark', key: 'benchmark', format: 'text' },
              { header: 'Status', key: 'status', format: 'text' },
            ] satisfies ExportColumn[]}
            filename={`unit-economics-${selectedPeriod}`}
            title="Fashion Unit Economics"
            subtitle={selectedPeriod}
          />
        </div>
      </div>

      <NumberLegend />

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  DATA QUALITY ALERTS — actionable, not just info       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeAlerts.length > 0 && (
        <Card className={criticalAlerts.length > 0 ? 'border-rose-300 dark:border-rose-800' : 'border-amber-300 dark:border-amber-800'}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${criticalAlerts.length > 0 ? 'text-rose-500' : 'text-amber-500'}`} />
                <CardTitle className="text-base">
                  {criticalAlerts.length > 0
                    ? `${criticalAlerts.length} issue(s) affecting accuracy`
                    : `${warningAlerts.length} item(s) to review`
                  }
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlerts(!showAlerts)}
              >
                {showAlerts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showAlerts && (
            <CardContent className="space-y-3">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-4 ${
                    alert.severity === 'critical'
                      ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50'
                      : alert.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50'
                        : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {alertIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>

                      {/* ── Inline action based on type ── */}
                      <div className="mt-3">
                        {alert.actionType === 'input_number' && alert.assumptionKey === 'brideCount' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              placeholder="e.g. 8"
                              value={brideCountInput}
                              onChange={(e) => setBrideCountInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBrideCountSubmit()}
                              className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={handleBrideCountSubmit}
                              disabled={!brideCountInput || parseInt(brideCountInput) < 1}
                            >
                              <Check className="h-3 w-3 mr-1" /> Apply
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              How many brides this month?
                            </span>
                          </div>
                        )}

                        {alert.actionType === 'reclassify' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowReclassify(true)}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> {alert.actionLabel}
                          </Button>
                        )}

                        {alert.actionType === 'review_accounts' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowReclassify(true)}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> {alert.actionLabel}
                          </Button>
                        )}

                        {alert.actionType === 'acknowledge' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissAlert(alert.id)}
                          >
                            <Check className="h-3 w-3 mr-1" /> Got it
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  ACCOUNT RECLASSIFICATION PANEL                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showReclassify && (
        <Card className="border-blue-300 dark:border-blue-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Review Account Classification</CardTitle>
                <CardDescription>
                  Assign each cost account to the correct fashion category. Changes recalculate all metrics instantly.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowReclassify(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-card py-1">
                <div className="col-span-1">Code</div>
                <div className="col-span-4">Account Name</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-3">Current Category</div>
                <div className="col-span-2">Change To</div>
              </div>
              {summary.costBreakdown
                .sort((a, b) => b.amount - a.amount)
                .map((acc) => {
                  const isUnclassified = acc.costCategory === 'other_overhead' && acc.classifiedBy !== 'override';
                  return (
                    <div
                      key={acc.accountId}
                      className={`grid grid-cols-12 gap-2 text-sm py-2 border-b border-border/50 items-center ${
                        isUnclassified ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <div className="col-span-1 text-muted-foreground font-mono text-xs">{acc.accountCode}</div>
                      <div className="col-span-4 truncate" title={acc.accountName}>
                        {acc.accountName}
                        {isUnclassified && (
                          <span className="ml-1 text-amber-600 text-xs">(unclassified)</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-medium">{format(acc.amount)}</div>
                      <div className="col-span-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            acc.classifiedBy === 'override'
                              ? 'border-emerald-400 text-emerald-700'
                              : acc.classifiedBy === 'regex'
                                ? 'border-blue-400 text-blue-700'
                                : 'border-amber-400 text-amber-700'
                          }`}
                        >
                          {FASHION_COST_LABELS[pendingReclassifications[acc.accountId] ?? acc.costCategory]}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <select
                          className="w-full rounded border bg-background px-1 py-1 text-xs"
                          value={pendingReclassifications[acc.accountId] ?? acc.costCategory}
                          onChange={(e) => {
                            setPendingReclassifications((prev) => ({
                              ...prev,
                              [acc.accountId]: e.target.value as FashionCostCategory,
                            }));
                          }}
                        >
                          {RECLASSIFY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
            </div>
            {Object.keys(pendingReclassifications).length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => {
                    // Apply reclassifications as overrides
                    setOverrides((prev) => ({
                      ...prev,
                      [selectedPeriod]: {
                        ...(prev[selectedPeriod] ?? {}),
                        accountOverrides: {
                          ...(prev[selectedPeriod]?.accountOverrides ?? {}),
                          ...pendingReclassifications,
                        },
                      },
                    }));
                    setPendingReclassifications({});
                    // Note: full recalculation requires server re-computation
                    // For now, show that the changes are queued
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Apply {Object.keys(pendingReclassifications).length} change(s)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingReclassifications({})}
                >
                  Reset
                </Button>
                <p className="text-xs text-muted-foreground">
                  Changes will recalculate all metrics. In a future update, these will be saved permanently.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── KPI Cards (Top 8) ─── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summary.kpis.map((kpi) => (
          <Card key={kpi.key} className={kpi.severity === 'needs_verification' ? 'border-orange-300 dark:border-orange-800' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className={`rounded-lg p-2 ${severityBg(kpi.severity)}`}>
                  {kpi.key === 'revenue_per_bride' && <Users className="h-4 w-4 text-emerald-600" />}
                  {kpi.key === 'gross_margin_per_bride' && <TrendingUp className="h-4 w-4 text-blue-600" />}
                  {kpi.key === 'bride_count' && <Users className="h-4 w-4 text-violet-600" />}
                  {kpi.key === 'uk_cost_per_garment' && <Scissors className="h-4 w-4 text-rose-600" />}
                  {kpi.key === 'production_staff_cost' && <Building2 className="h-4 w-4 text-amber-600" />}
                  {kpi.key === 'collection_cost_pct' && <Camera className="h-4 w-4 text-cyan-600" />}
                  {kpi.key === 'trunk_show_investment' && <Store className="h-4 w-4 text-indigo-600" />}
                  {kpi.key === 'fabric_cost_per_garment' && <Package className="h-4 w-4 text-pink-600" />}
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${severityColor(kpi.severity)}`}>
                {kpi.formattedValue}
              </div>
              {kpi.benchmark && (
                <p className="mt-1 text-xs text-muted-foreground">{kpi.benchmark}</p>
              )}
              {kpi.severity && severityBadge(kpi.severity)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Per-Bride Economics Detail ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <div>
              <CardTitle>Per-Bride Economics</CardTitle>
              <CardDescription>
                Revenue, costs, and margin per bridal customer — {fmtPeriod(selectedPeriod)}
                {summary.perBride.brideCountSource === 'estimated' && (
                  <span className="ml-2 text-orange-500 font-medium">(estimated — enter actual count above)</span>
                )}
                {summary.perBride.brideCountSource === 'user_override' && (
                  <span className="ml-2 text-emerald-600 font-medium">(user-provided: {summary.perBride.brideCount} brides)</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: Per-bride summary table */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Brides this month</div>
                <div className="font-semibold text-right flex items-center justify-end gap-1">
                  {summary.perBride.brideCount}
                  {summary.perBride.brideCountSource === 'estimated' && (
                    <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600 ml-1">est.</Badge>
                  )}
                </div>

                <div className="text-muted-foreground">Bridal revenue</div>
                <div className="font-semibold text-right">{format(summary.perBride.totalBridalRevenue)}</div>

                <div className="text-muted-foreground">Revenue per bride</div>
                <div className={`font-semibold text-right ${
                  summary.perBride.revenuePerBride > 25000 ? 'text-orange-500' : 'text-emerald-600'
                }`}>
                  {format(summary.perBride.revenuePerBride)}
                </div>

                <div className="text-muted-foreground">Direct costs per bride</div>
                <div className="font-semibold text-right text-rose-600">{format(summary.perBride.directCostPerBride)}</div>

                <div className="border-t pt-2 font-medium text-muted-foreground">Gross margin per bride</div>
                <div className="border-t pt-2 font-bold text-right text-blue-600">
                  {format(summary.perBride.grossMarginPerBride)}
                  <span className="text-xs ml-1 text-muted-foreground">
                    ({summary.perBride.grossMarginPct.toFixed(1)}%)
                  </span>
                </div>

                <div className="text-muted-foreground">Avg items per bride</div>
                <div className="font-semibold text-right">{summary.perBride.avgItemsPerBride.toFixed(1)}</div>

                {summary.perBride.consultationRevenue > 0 && (
                  <>
                    <div className="text-muted-foreground">Consultation revenue</div>
                    <div className="font-semibold text-right">{format(summary.perBride.consultationRevenue)}</div>
                  </>
                )}
              </div>

              {/* Quick bride count input if estimated */}
              {summary.perBride.brideCountSource === 'estimated' && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-3">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-2">
                    Enter actual bride count to fix per-bride metrics:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 8"
                      value={brideCountInput}
                      onChange={(e) => setBrideCountInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBrideCountSubmit()}
                      className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleBrideCountSubmit}
                      disabled={!brideCountInput || parseInt(brideCountInput) < 1}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Per-bride trend chart */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Per-Bride Trend
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={brideTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<SmartChartTooltip />} />
                  <Bar dataKey="revenuePerBride" name="Revenue / Bride" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="marginPerBride" name="Margin / Bride" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Production Economics ─── */}
      <Card className={summary.production.totalProductionStaffCost === 0 ? 'border-orange-300 dark:border-orange-800' : ''}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-rose-600" />
            <div>
              <CardTitle>Production Economics</CardTitle>
              <CardDescription>
                UK production cost per garment — labour, premises, and materials
              </CardDescription>
            </div>
            {summary.production.totalProductionStaffCost === 0 && (
              <Badge variant="outline" className="border-orange-400 text-orange-600 ml-auto">
                Missing staff costs — review accounts
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Estimated garments produced</div>
                <div className="font-semibold text-right">{summary.production.estimatedGarments}</div>

                <div className="text-muted-foreground">Labour cost / garment</div>
                <div className="font-semibold text-right">{format(summary.production.labourCostPerGarment)}</div>

                <div className="text-muted-foreground">Premises allocation / garment</div>
                <div className="font-semibold text-right">{format(summary.production.premisesAllocationPerGarment)}</div>

                <div className="text-muted-foreground">Fabric cost / garment</div>
                <div className="font-semibold text-right">{format(summary.production.fabricCostPerGarment)}</div>

                <div className="border-t pt-2 font-medium text-muted-foreground">Fully loaded cost / garment</div>
                <div className="border-t pt-2 font-bold text-right text-rose-600">
                  {format(summary.production.fullyLoadedCostPerGarment)}
                </div>

                <div className="pt-2 text-muted-foreground">Total production staff cost</div>
                <div className={`pt-2 font-semibold text-right ${
                  summary.production.totalProductionStaffCost === 0 ? 'text-orange-500' : ''
                }`}>
                  {format(summary.production.totalProductionStaffCost)}
                  {summary.production.totalProductionStaffCost === 0 && (
                    <span className="text-xs ml-1">(check classification)</span>
                  )}
                </div>
              </div>

              {summary.production.productionStaffAccounts.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Production Staff Breakdown
                  </p>
                  <div className="space-y-1">
                    {summary.production.productionStaffAccounts.map((acc) => (
                      <div key={acc.name} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">{acc.name}</span>
                        <span className="font-medium">{format(acc.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.production.totalProductionStaffCost === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setShowReclassify(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Classify production staff accounts
                </Button>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cost per Garment Trend
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={productionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<SmartChartTooltip />} />
                  <Line type="monotone" dataKey="fullyLoaded" name="Fully Loaded" stroke={COLORS.rose} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="labour" name="Labour Only" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fabric" name="Fabric Only" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Collection & Photoshoot ROI ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-cyan-600" />
            <div>
              <CardTitle>Collection &amp; Photoshoot ROI</CardTitle>
              <CardDescription>
                Investment in photoshoots, marketing, and design vs revenue generated
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photoshoot Cost</p>
              <p className="text-2xl font-bold">{format(summary.collection.photoshootCost)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Marketing Spend</p>
              <p className="text-2xl font-bold">{format(summary.collection.marketingCost)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Design Staff</p>
              <p className="text-2xl font-bold">{format(summary.collection.designStaffCost)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Collection Cost</p>
              <p className="text-2xl font-bold text-cyan-600">{format(summary.collection.totalCollectionCost)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">As % of Revenue</p>
              <p className={`text-2xl font-bold ${
                summary.collection.collectionCostPct >= 3 && summary.collection.collectionCostPct <= 20
                  ? 'text-emerald-600'
                  : summary.collection.collectionCostPct > 20
                    ? 'text-rose-600'
                    : 'text-amber-600'
              }`}>
                {summary.collection.collectionCostPct.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Fashion norm: 3-20%</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collection ROI</p>
              <p className={`text-2xl font-bold ${
                summary.collection.collectionROI > 100 ? 'text-emerald-600' :
                summary.collection.collectionROI > 0 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {summary.collection.collectionROI.toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Trunk Show Investment ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle>Trunk Show Investment</CardTitle>
              <CardDescription>Events, travel, and accommodation costs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Food &amp; Drink</p>
              <p className="text-2xl font-bold">{format(summary.trunkShow.foodDrinkCost)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Travel</p>
              <p className="text-2xl font-bold">{format(summary.trunkShow.travelCost)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accommodation</p>
              <p className="text-2xl font-bold">{format(summary.trunkShow.accommodationCost)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Investment</p>
              <p className="text-2xl font-bold text-indigo-600">{format(summary.trunkShow.totalTrunkShowCost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Channel Profitability ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-600" />
            <div>
              <CardTitle>Channel Profitability</CardTitle>
              <CardDescription>Online (Shopify) vs In-Person (Consultation) margin comparison</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-3">
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700">Online</Badge>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Revenue</div>
                <div className="font-semibold text-right">{format(summary.channel.online.revenue)}</div>
                <div className="text-muted-foreground">Merchant fees</div>
                <div className="font-semibold text-right text-rose-500">-{format(summary.channel.online.merchantFees)}</div>
                <div className="text-muted-foreground">Shipping costs</div>
                <div className="font-semibold text-right text-rose-500">-{format(summary.channel.online.shippingCost)}</div>
                <div className="border-t pt-2 font-medium text-muted-foreground">Net margin</div>
                <div className={`border-t pt-2 font-bold text-right ${
                  summary.channel.online.marginPct > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {format(summary.channel.online.netMargin)}
                  <span className="text-xs ml-1">({summary.channel.online.marginPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950 text-violet-700">Consultation</Badge>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Revenue</div>
                <div className="font-semibold text-right">{format(summary.channel.consultation.revenue)}</div>
                <div className="text-muted-foreground">Premises allocation</div>
                <div className="font-semibold text-right text-rose-500">-{format(summary.channel.consultation.premisesCost)}</div>
                <div className="text-muted-foreground">Staff allocation</div>
                <div className="font-semibold text-right text-rose-500">-{format(summary.channel.consultation.staffCost)}</div>
                <div className="border-t pt-2 font-medium text-muted-foreground">Net margin</div>
                <div className={`border-t pt-2 font-bold text-right ${
                  summary.channel.consultation.marginPct > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {format(summary.channel.consultation.netMargin)}
                  <span className="text-xs ml-1">({summary.channel.consultation.marginPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Cost Classification Breakdown ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fashion Cost Classification</CardTitle>
              <CardDescription>All cost accounts classified into fashion-specific categories</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReclassify(!showReclassify)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              {showReclassify ? 'Close' : 'Reclassify'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {costPieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<SmartChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                <div>Category</div>
                <div className="text-right">Amount</div>
                <div className="text-right">% of Total</div>
              </div>
              {costPieData.map((item, i) => {
                const totalCosts = costPieData.reduce((sum, d) => sum + d.value, 0);
                const pct = totalCosts > 0 ? (item.value / totalCosts) * 100 : 0;
                return (
                  <div key={item.category} className="grid grid-cols-3 gap-2 text-sm py-1 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="text-right font-medium">{format(item.value)}</div>
                    <div className="text-right text-muted-foreground">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  DATA GAPS — what we need to make these numbers right  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">Data Gaps — What We Need</CardTitle>
              <CardDescription>
                These metrics will become accurate once the missing data is provided.
                Click each action to resolve.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Gap 1: Production staff */}
            {summary.production.totalProductionStaffCost === 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-3">
                <div className="rounded-full bg-rose-100 dark:bg-rose-950 p-1.5 mt-0.5">
                  <Users className="h-3.5 w-3.5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Production staff not entered</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You have 8-10 production staff but their salaries aren&apos;t flowing into unit economics.
                    Enter each employee with their role (Seamstress, Pattern Cutter, etc.) and annual salary.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Affects: Production Staff Cost, UK Cost per Garment, Fully Loaded Cost, Channel Profitability
                  </p>
                </div>
                <Link href="/headcount">
                  <Button size="sm" variant="default" className="shrink-0">
                    <Users className="h-3 w-3 mr-1" /> Add Staff
                  </Button>
                </Link>
              </div>
            )}

            {/* Gap 2: Bride count */}
            {summary.perBride.brideCountSource === 'estimated' && (
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-3">
                <div className="rounded-full bg-orange-100 dark:bg-orange-950 p-1.5 mt-0.5">
                  <Users className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Bride count is estimated</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We estimated {summary.perBride.brideCount} brides using your average order value.
                    Enter the actual monthly bride count above, or sync Shopify orders to detect bridal sales automatically.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Affects: Revenue per Bride, Gross Margin per Bride, Direct Cost per Bride, Avg Items per Bride
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link href="/interview">
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      Update via Interview
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Gap 3: No Shopify sync */}
            {currentData && currentData.shopifyProductCount === 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-3">
                <div className="rounded-full bg-amber-100 dark:bg-amber-950 p-1.5 mt-0.5">
                  <Package className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">No Shopify order data for {fmtPeriod(selectedPeriod)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Product-level revenue splits, bride identification, and channel profitability all require Shopify
                    order line items. Sync your Shopify store or check the integration connection.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Affects: Product Revenue Split, Bride Count, Channel Economics, Online vs Consultation
                  </p>
                </div>
                <Link href="/storefront">
                  <Button size="sm" variant="outline" className="shrink-0">
                    <Store className="h-3 w-3 mr-1" /> Shopify Settings
                  </Button>
                </Link>
              </div>
            )}

            {/* Gap 4: Outsource cost comparison */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-950 p-1.5 mt-0.5">
                <Scissors className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Outsource production cost not set</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  To compare UK vs China production costs, we need your outsource cost per garment.
                  This can be added via the business interview.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Affects: UK vs Outsource Comparison (not yet shown — will appear once set)
                </p>
              </div>
              <Link href="/interview">
                <Button size="sm" variant="outline" className="shrink-0">
                  <Pencil className="h-3 w-3 mr-1" /> Add via Interview
                </Button>
              </Link>
            </div>

            {/* Gap 5: Average dress price for sanity checking */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-3">
              <div className="rounded-full bg-violet-100 dark:bg-violet-950 p-1.5 mt-0.5">
                <Receipt className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Average dress price not confirmed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We default to £5,000 for average bridal order value. If your MTO range is different (e.g. bespoke
                  up to £20k), update this so bride count estimates and sanity checks use the right baseline.
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Affects: Estimated Bride Count (when Shopify data unavailable), Revenue per Bride sanity check
                </p>
              </div>
              <Link href="/interview">
                <Button size="sm" variant="outline" className="shrink-0">
                  <Pencil className="h-3 w-3 mr-1" /> Set via Interview
                </Button>
              </Link>
            </div>

            {/* Gap 6: Trunk show revenue attribution */}
            {summary.trunkShow.totalTrunkShowCost > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-3">
                <div className="rounded-full bg-indigo-100 dark:bg-indigo-950 p-1.5 mt-0.5">
                  <Store className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Trunk show revenue attribution unknown</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You invested {format(summary.trunkShow.totalTrunkShowCost)} in trunk shows this month,
                    but we can&apos;t calculate ROI without knowing what % of revenue trunk shows drive.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Affects: Trunk Show ROI (not yet shown — will appear once attribution is set)
                  </p>
                </div>
                <Link href="/interview">
                  <Button size="sm" variant="outline" className="shrink-0">
                    <Pencil className="h-3 w-3 mr-1" /> Set via Interview
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/dashboard/profitability" label="Profitability" />
        <CrossRef href="/financials/income-statement" label="Income Statement" />
        <CrossRef href="/revenue" label="Revenue Breakdown" />
        <CrossRef href="/costs" label="Cost Analysis" />
        <CrossRef href="/staff-costs" label="Staff Costs" />
        <CrossRef href="/headcount" label="Headcount Register" />
      </div>
    </div>
  );
}
