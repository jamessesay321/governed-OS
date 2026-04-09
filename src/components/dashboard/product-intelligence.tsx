'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/formatting/currency';
import {
  Package, Users, Tag, TrendingUp, BarChart3,
  ShoppingBag, Sparkles, AlertCircle,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

interface CategoryBreakdown {
  category: string;
  revenue: number;
  percentage: number;
}

interface ProductKPI {
  key: string;
  label: string;
  description: string;
  plainEnglish: string;
  value: number | null;
  formattedValue: string;
  format: string;
  higherIsBetter: boolean;
  category: string;
}

interface ProductMetricsData {
  period: string;
  industry: string;
  totalUnits: number;
  totalRevenue: number;
  uniqueCustomers: number;
  topCategory: string | null;
  categoryBreakdown: CategoryBreakdown[];
  kpis: ProductKPI[];
  metrics: Array<{
    period: string;
    category: string;
    unitsSold: number;
    totalRevenue: number;
    averagePrice: number;
    uniqueCustomers: number;
    customerNames: string[];
  }>;
}

interface ProductIntelligenceProps {
  orgId: string;
  period: string;
}

// ─── Colour Palette for Categories ──────────────────────────────────

const CATEGORY_COLOURS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
];

const CATEGORY_TEXT_COLOURS = [
  'text-blue-600',
  'text-emerald-600',
  'text-violet-600',
  'text-amber-600',
  'text-rose-600',
  'text-cyan-600',
  'text-orange-600',
  'text-teal-600',
  'text-pink-600',
  'text-indigo-600',
];

const CATEGORY_BG_COLOURS = [
  'bg-blue-50',
  'bg-emerald-50',
  'bg-violet-50',
  'bg-amber-50',
  'bg-rose-50',
  'bg-cyan-50',
  'bg-orange-50',
  'bg-teal-50',
  'bg-pink-50',
  'bg-indigo-50',
];

// ─── Sub-Components ────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  bgClass = 'bg-blue-50',
  textClass = 'text-blue-600',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
  bgClass?: string;
  textClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <div className={`shrink-0 rounded-lg p-2 ${bgClass}`}>
        <Icon className={`h-4 w-4 ${textClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function CategoryBar({
  category,
  revenue,
  percentage,
  maxRevenue,
  colourIndex,
}: {
  category: string;
  revenue: number;
  percentage: number;
  maxRevenue: number;
  colourIndex: number;
}) {
  const barPct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  const colourClass = CATEGORY_COLOURS[colourIndex % CATEGORY_COLOURS.length];

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-xs text-muted-foreground text-right shrink-0 truncate" title={category}>
        {category}
      </span>
      <div className="flex-1 relative h-6 rounded bg-muted/30 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded ${colourClass} transition-all`}
          style={{ width: `${Math.min(barPct, 100)}%` }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
          {formatCurrencyCompact(revenue)} ({formatPercent(percentage)})
        </span>
      </div>
    </div>
  );
}

function DonutChart({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  // SVG donut chart
  const total = breakdown.reduce((s, b) => s + Math.max(b.revenue, 0), 0);
  if (total === 0) return null;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  const segments = breakdown.filter((b) => b.revenue > 0).slice(0, 8);

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0">
        {segments.map((seg, i) => {
          const fraction = seg.revenue / total;
          const dashLength = fraction * circumference;
          const offset = cumulativeOffset;
          cumulativeOffset += dashLength;

          // Map colour classes to actual hex values for SVG
          const colours = [
            '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e',
            '#06b6d4', '#f97316', '#14b8a6', '#ec4899', '#6366f1',
          ];

          return (
            <circle
              key={seg.category}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={colours[i % colours.length]}
              strokeWidth="16"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
        })}
        {/* Centre hole */}
        <circle cx="50" cy="50" r="30" fill="white" className="dark:fill-gray-950" />
        <text x="50" y="48" textAnchor="middle" className="text-[8px] fill-muted-foreground">
          {segments.length}
        </text>
        <text x="50" y="57" textAnchor="middle" className="text-[6px] fill-muted-foreground">
          categories
        </text>
      </svg>

      {/* Legend */}
      <div className="space-y-1.5 min-w-0">
        {segments.map((seg, i) => (
          <div key={seg.category} className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${CATEGORY_COLOURS[i % CATEGORY_COLOURS.length]}`}
            />
            <span className="truncate text-muted-foreground" title={seg.category}>
              {seg.category}
            </span>
            <span className="ml-auto font-medium shrink-0">
              {formatPercent(seg.percentage)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerList({
  metrics,
}: {
  metrics: ProductMetricsData['metrics'];
}) {
  // Collect unique customers with their total spend
  const customerSpend = new Map<string, number>();
  for (const m of metrics) {
    for (const name of m.customerNames) {
      customerSpend.set(name, (customerSpend.get(name) ?? 0) + m.totalRevenue / Math.max(m.uniqueCustomers, 1));
    }
  }

  const sorted = Array.from(customerSpend.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      {sorted.map(([name, spend]) => (
        <div key={name} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[200px]">{name}</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {formatCurrencyCompact(spend)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function ProductIntelligence({ orgId, period }: ProductIntelligenceProps) {
  const [data, setData] = useState<ProductMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !period) return;

    setLoading(true);
    setError(null);

    fetch(`/api/intelligence/product-metrics/${orgId}?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [orgId, period]);

  const maxCategoryRevenue = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.categoryBreakdown.map((c) => c.revenue), 0);
  }, [data]);

  // Filter out "Uncategorised" for cleaner display
  const displayBreakdown = useMemo(() => {
    if (!data) return [];
    return data.categoryBreakdown.filter((c) => c.revenue > 0);
  }, [data]);

  // Split KPIs by category
  const productKPIs = useMemo(() => data?.kpis.filter((k) => k.category === 'product') ?? [], [data]);
  const customerKPIs = useMemo(() => data?.kpis.filter((k) => k.category === 'customer') ?? [], [data]);
  const efficiencyKPIs = useMemo(() => data?.kpis.filter((k) => k.category === 'efficiency') ?? [], [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Product Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Analysing line items...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Product Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            No line-item data available for this period.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalRevenue === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Product Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">
            No invoice line items found for this period. Product intelligence requires synced invoices with line-item detail.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card with Key Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-violet-500" />
              Product Intelligence
            </CardTitle>
            {data.industry && (
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-medium text-violet-700">
                <Sparkles className="h-3 w-3 mr-1" />
                {data.industry}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={ShoppingBag}
              label="Total Units"
              value={new Intl.NumberFormat('en-GB').format(data.totalUnits)}
              subtitle={`across ${displayBreakdown.length} categories`}
              bgClass="bg-blue-50"
              textClass="text-blue-600"
            />
            <MetricCard
              icon={Users}
              label="Unique Customers"
              value={new Intl.NumberFormat('en-GB').format(data.uniqueCustomers)}
              bgClass="bg-emerald-50"
              textClass="text-emerald-600"
            />
            <MetricCard
              icon={Tag}
              label="Avg Price"
              value={data.totalUnits > 0 ? formatCurrency(data.totalRevenue / data.totalUnits) : 'N/A'}
              bgClass="bg-amber-50"
              textClass="text-amber-600"
            />
            <MetricCard
              icon={TrendingUp}
              label="Top Category"
              value={data.topCategory ?? 'None'}
              subtitle={
                displayBreakdown.length > 0
                  ? `${formatPercent(displayBreakdown[0].percentage)} of revenue`
                  : undefined
              }
              bgClass="bg-violet-50"
              textClass="text-violet-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown + Donut */}
      {displayBreakdown.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Donut Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart breakdown={displayBreakdown} />
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                Category Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayBreakdown.slice(0, 8).map((cat, i) => (
                <CategoryBar
                  key={cat.category}
                  category={cat.category}
                  revenue={cat.revenue}
                  percentage={cat.percentage}
                  maxRevenue={maxCategoryRevenue}
                  colourIndex={i}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Industry KPIs */}
      {data.kpis.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Industry KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Product KPIs */}
              {productKPIs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Product</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {productKPIs.filter((k) => !k.key.startsWith('product_mix_')).map((kpi) => (
                      <div
                        key={kpi.key}
                        className="rounded-lg border p-3 hover:bg-muted/20 transition-colors"
                        title={kpi.plainEnglish}
                      >
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <p className="text-lg font-bold">{kpi.formattedValue}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.plainEnglish}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer KPIs */}
              {customerKPIs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Customer</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {customerKPIs.map((kpi) => (
                      <div
                        key={kpi.key}
                        className="rounded-lg border p-3 hover:bg-muted/20 transition-colors"
                        title={kpi.plainEnglish}
                      >
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <p className="text-lg font-bold">{kpi.formattedValue}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.plainEnglish}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Efficiency KPIs */}
              {efficiencyKPIs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Efficiency</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {efficiencyKPIs.map((kpi) => (
                      <div
                        key={kpi.key}
                        className="rounded-lg border p-3 hover:bg-muted/20 transition-colors"
                        title={kpi.plainEnglish}
                      >
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <p className="text-lg font-bold">{kpi.formattedValue}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.plainEnglish}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      {data.uniqueCustomers > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerList metrics={data.metrics} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
