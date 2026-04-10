'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/components/providers/currency-context';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import { ChallengeButton } from '@/components/shared/challenge-panel';
import { CrossRef } from '@/components/shared/in-page-link';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { ExportButton } from '@/components/shared/export-button';
import type { ExportColumn } from '@/components/shared/export-button';
import { NumberLegend } from '@/components/data-primitives';
import { SmartChartTooltip } from '@/components/charts/smart-chart-tooltip';
import {
  Users, Scissors, Camera, Store,
  TrendingUp, Package, Receipt, Building2,
} from 'lucide-react';
import type {
  FashionUnitEconomicsSummary,
  FashionKPI,
  CostAccount,
} from '@/lib/financial/fashion-unit-economics';
import { FASHION_COST_LABELS } from '@/lib/financial/fashion-unit-economics';
import type { FashionCostCategory } from '@/lib/financial/fashion-unit-economics';

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

function severityColor(severity?: 'good' | 'warning' | 'critical'): string {
  switch (severity) {
    case 'good': return 'text-emerald-600';
    case 'warning': return 'text-amber-600';
    case 'critical': return 'text-rose-600';
    default: return 'text-foreground';
  }
}

function severityBg(severity?: 'good' | 'warning' | 'critical'): string {
  switch (severity) {
    case 'good': return 'bg-emerald-100 dark:bg-emerald-950';
    case 'warning': return 'bg-amber-100 dark:bg-amber-950';
    case 'critical': return 'bg-rose-100 dark:bg-rose-950';
    default: return 'bg-slate-100 dark:bg-slate-800';
  }
}

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

  // Track selected period
  const [selectedPeriod, setSelectedPeriod] = useState(
    globalPeriod.period || availablePeriods[availablePeriods.length - 1] || ''
  );

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

  const summary = currentData?.summary;

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
            <p className="text-muted-foreground">
              No data available for the selected period.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cost breakdown by category for pie chart
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

  // Per-bride trend across periods
  const brideTrendData = periodSummaries.map((ps) => ({
    period: fmtPeriod(ps.period),
    revenuePerBride: Math.round(ps.summary.perBride.revenuePerBride),
    marginPerBride: Math.round(ps.summary.perBride.grossMarginPerBride),
    brides: ps.summary.perBride.brideCount,
  }));

  // Production cost trend
  const productionTrendData = periodSummaries.map((ps) => ({
    period: fmtPeriod(ps.period),
    fullyLoaded: Math.round(ps.summary.production.fullyLoadedCostPerGarment),
    labour: Math.round(ps.summary.production.labourCostPerGarment),
    fabric: Math.round(ps.summary.production.fabricCostPerGarment),
  }));

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

      {/* Data type legend */}
      <NumberLegend />

      {/* ─── KPI Cards (Top 8) ─── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summary.kpis.map((kpi) => (
          <Card key={kpi.key}>
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
              {kpi.severity && (
                <Badge
                  variant={kpi.severity === 'good' ? 'default' : kpi.severity === 'warning' ? 'secondary' : 'destructive'}
                  className="mt-1"
                >
                  {kpi.severity === 'good' ? 'On Track' : kpi.severity === 'warning' ? 'Watch' : 'Action Needed'}
                </Badge>
              )}
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
                <div className="font-semibold text-right">{summary.perBride.brideCount}</div>

                <div className="text-muted-foreground">Bridal revenue</div>
                <div className="font-semibold text-right">{format(summary.perBride.totalBridalRevenue)}</div>

                <div className="text-muted-foreground">Revenue per bride</div>
                <div className="font-semibold text-right text-emerald-600">{format(summary.perBride.revenuePerBride)}</div>

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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-rose-600" />
            <div>
              <CardTitle>Production Economics</CardTitle>
              <CardDescription>
                UK production cost per garment — labour, premises, and materials
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: Production cost breakdown */}
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

                <div className="border-t pt-2 font-medium text-muted-foreground">
                  Fully loaded cost / garment
                </div>
                <div className="border-t pt-2 font-bold text-right text-rose-600">
                  {format(summary.production.fullyLoadedCostPerGarment)}
                </div>

                <div className="pt-2 text-muted-foreground">Total production staff cost</div>
                <div className="pt-2 font-semibold text-right">{format(summary.production.totalProductionStaffCost)}</div>
              </div>

              {/* Staff breakdown */}
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
            </div>

            {/* Right: Production cost trend */}
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
                summary.collection.collectionCostPct < 15 ? 'text-emerald-600' :
                summary.collection.collectionCostPct < 25 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {summary.collection.collectionCostPct.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Fashion norm: 8-15%</p>
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
              <CardDescription>
                Events, travel, and accommodation costs for trunk shows
              </CardDescription>
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
              <CardDescription>
                Online (Shopify) vs In-Person (Consultation) channel margin comparison
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Online channel */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700">Online</Badge>
              </div>
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

            {/* Consultation channel */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950 text-violet-700">Consultation</Badge>
              </div>
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
          <CardTitle>Fashion Cost Classification</CardTitle>
          <CardDescription>
            All cost accounts classified into fashion-specific categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie chart */}
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

            {/* Table */}
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

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/dashboard/profitability" label="Profitability" />
        <CrossRef href="/financials/income-statement" label="Income Statement" />
        <CrossRef href="/revenue" label="Revenue Breakdown" />
        <CrossRef href="/costs" label="Cost Analysis" />
        <CrossRef href="/staff-costs" label="Staff Costs" />
      </div>
    </div>
  );
}
