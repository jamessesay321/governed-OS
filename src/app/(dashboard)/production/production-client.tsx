'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { ExportButton } from '@/components/shared/export-button';
import type { ExportColumn } from '@/components/shared/export-button';
import {
  Factory,
  Package,
  Scissors,
  Truck,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
  Target,
  ArrowDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, chartAxisFormatter, formatPercent } from '@/lib/formatting/currency';
import type {
  ProductionLineCost,
  MaterialBreakdown,
  StockMovement,
  ProductionPeriodSummary,
  BiggestCOGSLine,
  GrossMarginImpact,
  WaterfallEntry,
} from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface ProductionClientProps {
  wipBalance: number;
  rawMaterialsBalance: number;
  finishedGoodsBalance: number;
  totalProductionCost: number;
  wipMovement: number;
  rawMaterialsMovement: number;
  finishedGoodsMovement: number;
  stockMovements: StockMovement[];
  materialBreakdown: MaterialBreakdown[];
  totalMaterials: number;
  productionLines: ProductionLineCost[];
  totalCogsProductionCost: number;
  shippingTotal: number;
  periodSummaries: ProductionPeriodSummary[];
  periods: string[];
  activeCustomerCount: number;
  averageCOGSPerCustomer: number;
  biggestCOGSLine: BiggestCOGSLine;
  grossMarginImpact: GrossMarginImpact;
  totalRevenue: number;
  waterfallData: WaterfallEntry[];
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
];

const MATERIAL_COLORS = ['#7c3aed', '#f59e0b', '#06b6d4'];

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */


/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function ProductionClient({
  wipBalance,
  rawMaterialsBalance,
  finishedGoodsBalance,
  totalProductionCost,
  wipMovement,
  rawMaterialsMovement,
  finishedGoodsMovement,
  stockMovements,
  materialBreakdown,
  totalMaterials,
  productionLines,
  totalCogsProductionCost,
  shippingTotal,
  periodSummaries,
  activeCustomerCount,
  averageCOGSPerCustomer,
  biggestCOGSLine,
  grossMarginImpact,
  totalRevenue,
  waterfallData,
}: ProductionClientProps) {
  const { openDrill } = useDrillDown();
  const hasData = periodSummaries.length > 0;

  // Stacked bar data for CoGS by product line
  const stackedData = useMemo(() => {
    const lineNames = productionLines.filter((l) => l.total > 0).map((l) => l.name);
    return periodSummaries.map((p) => {
      const row: Record<string, number | string> = { label: p.label };
      for (const name of lineNames) {
        row[name] = Math.round(p.byLine[name] ?? 0);
      }
      return row;
    });
  }, [periodSummaries, productionLines]);

  const stackedLineNames = useMemo(() => {
    return productionLines.filter((l) => l.total > 0).map((l) => l.name);
  }, [productionLines]);

  // Materials pie data
  const materialPieData = useMemo(() => {
    return materialBreakdown
      .filter((m) => m.total > 0)
      .map((m) => ({ name: m.name, value: Math.round(m.total) }));
  }, [materialBreakdown]);

  // Stock movement area data
  const stockMovementData = useMemo(() => {
    return stockMovements.map((s) => ({
      label: s.label,
      WIP: Math.round(s.wip),
      'Raw Materials': Math.round(s.rawMaterials),
      'Finished Goods': Math.round(s.finishedGoods),
    }));
  }, [stockMovements]);

  // Waterfall chart data — each bar shows the invisible base + visible portion
  const waterfallChartData = useMemo(() => {
    return waterfallData.map((entry) => {
      if (entry.type === 'revenue') {
        // Revenue: starts at 0, visible bar goes up to value
        return {
          name: entry.name,
          base: 0,
          positive: entry.value,
          negative: 0,
          result: 0,
          total: entry.value,
        };
      } else if (entry.type === 'cost') {
        // Cost: invisible base up to previous running total, visible bar drops down
        const costAmount = Math.abs(entry.value);
        return {
          name: entry.name,
          base: entry.runningTotal,
          positive: 0,
          negative: costAmount,
          result: 0,
          total: entry.runningTotal,
        };
      } else {
        // Result: starts at 0, shows final gross profit
        return {
          name: entry.name,
          base: 0,
          positive: 0,
          negative: 0,
          result: Math.max(entry.value, 0),
          total: entry.value,
        };
      }
    });
  }, [waterfallData]);

  // 10% reduction scenario
  const reducedMargin = useMemo(() => {
    if (totalRevenue <= 0 || !biggestCOGSLine.total) return grossMarginImpact.grossMargin;
    const reducedCost = biggestCOGSLine.total * 0.9;
    const savings = biggestCOGSLine.total - reducedCost;
    const newGrossProfit = grossMarginImpact.grossProfit + savings;
    return (newGrossProfit / totalRevenue) * 100;
  }, [totalRevenue, biggestCOGSLine, grossMarginImpact]);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WIP & Production Intelligence</h1>
          <p className="text-muted-foreground">
            Work-in-progress, stock movements, and production cost analysis
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-semibold">No Production Data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your accounting software to see production intelligence.
          </p>
        </div>
      </div>
    );
  }

  // Export data — one row per active production line
  const exportData = useMemo(() => {
    return productionLines
      .filter((l) => l.total > 0)
      .map((l) => ({
        name: l.name,
        code: l.code,
        total: l.total,
        pctOfTotal: l.pctOfTotal / 100, // ExportButton formats as percentage (0–1 scale)
      }));
  }, [productionLines]);

  const exportColumns: ExportColumn[] = [
    { header: 'Product Line', key: 'name', format: 'text' },
    { header: 'Code', key: 'code', format: 'text' },
    { header: 'Total CoGS Cost', key: 'total', format: 'currency' },
    { header: '% of Total CoGS', key: 'pctOfTotal', format: 'percentage' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WIP & Production Intelligence</h1>
          <p className="text-muted-foreground">
            Work-in-progress, stock movements, and production cost analysis
          </p>
        </div>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          filename="production-cost-by-product-line"
          title="WIP & Production Intelligence"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WIP Balance */}
        <div className={cn(
          'rounded-xl border p-5',
          'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Factory className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            WIP Balance
          </div>
          <p className="text-2xl font-bold">{formatCurrencyCompact(Math.abs(wipBalance))}</p>
          <p className={cn(
            'text-xs mt-1 font-medium flex items-center gap-1',
            wipMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}>
            {wipMovement >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatCurrencyCompact(Math.abs(wipMovement))} movement
          </p>
        </div>

        {/* Raw Materials */}
        <div className={cn(
          'rounded-xl border p-5',
          'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Scissors className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Raw Materials
          </div>
          <p className="text-2xl font-bold">{formatCurrencyCompact(Math.abs(rawMaterialsBalance))}</p>
          <p className={cn(
            'text-xs mt-1 font-medium flex items-center gap-1',
            rawMaterialsMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}>
            {rawMaterialsMovement >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatCurrencyCompact(Math.abs(rawMaterialsMovement))} movement
          </p>
        </div>

        {/* Finished Goods */}
        <div className={cn(
          'rounded-xl border p-5',
          'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Finished Goods
          </div>
          <p className="text-2xl font-bold">{formatCurrencyCompact(Math.abs(finishedGoodsBalance))}</p>
          <p className={cn(
            'text-xs mt-1 font-medium flex items-center gap-1',
            finishedGoodsMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}>
            {finishedGoodsMovement >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatCurrencyCompact(Math.abs(finishedGoodsMovement))} movement
          </p>
        </div>

        {/* Total Production Cost */}
        <div className={cn(
          'rounded-xl border p-5',
          'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Truck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Total Production Cost
          </div>
          <p className="text-2xl font-bold">{formatCurrencyCompact(totalProductionCost)}</p>
          <p className="text-xs mt-1 text-muted-foreground">
            CoGS {formatCurrencyCompact(totalCogsProductionCost)} + Materials {formatCurrencyCompact(totalMaterials)} + Shipping {formatCurrencyCompact(shippingTotal)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Pipeline: Stacked Bar of CoGS by Product Line */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Production Pipeline by Product Line</h2>
          {stackedLineNames.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedData} margin={{ left: 10, right: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    className="fill-gray-500 dark:fill-gray-400"
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tickFormatter={chartAxisFormatter()}
                    tick={{ fontSize: 10 }}
                    className="fill-gray-500 dark:fill-gray-400"
                  />
                  <RechartsTooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0))]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  {stackedLineNames.map((name, i) => (
                    <Bar key={name} dataKey={name} stackId="cogs" fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No CoGS data available</p>
          )}
        </div>

        {/* Materials Breakdown: Pie Chart */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Materials Breakdown</h2>
          {materialPieData.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={materialPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${(name ?? '')} ${formatPercent(percent ?? 0, true)}`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {materialPieData.map((_, i) => (
                      <Cell key={i} fill={MATERIAL_COLORS[i % MATERIAL_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Cost']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No material cost data available</p>
          )}
        </div>
      </div>

      {/* Stock Movement Trend: Area Chart */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Stock Movement Trend</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Opening minus Closing values per period — positive means stock consumed, negative means stock built up
        </p>
        {stockMovementData.length > 0 ? (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockMovementData} margin={{ left: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickFormatter={chartAxisFormatter()}
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                />
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0))]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="WIP"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Raw Materials"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Finished Goods"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No stock movement data available</p>
        )}
      </div>

      {/* Product-Line Profitability Hint */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Production Cost by Product Line</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Cost of Goods Sold per product line as a percentage of total CoGS
        </p>
        <div className="space-y-3">
          {productionLines.filter((l) => l.total > 0).map((line, i) => (
            <div
              key={line.code}
              className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2 transition-colors"
              onClick={() => {
                openDrill({
                  type: 'custom',
                  title: line.name,
                  subtitle: `${formatCurrency(line.total)} — ${formatPercent(line.pctOfTotal)} of total CoGS`,
                  rows: [
                    { label: 'Product Line Code', value: line.code },
                    { label: 'Total Cost', value: formatCurrency(line.total) },
                    { label: '% of Total CoGS', value: formatPercent(line.pctOfTotal) },
                    { label: 'Total CoGS', value: formatCurrency(totalCogsProductionCost) },
                  ],
                });
              }}
            >
              <div className="w-40 truncate text-sm font-medium">{line.name}</div>
              <div className="flex-1">
                <div className="h-6 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(line.pctOfTotal, 100)}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
              <div className="w-20 text-right text-sm font-medium">
                {formatPercent(line.pctOfTotal)}
              </div>
              <div className="w-24 text-right text-sm text-muted-foreground">
                {formatCurrencyCompact(line.total)}
              </div>
            </div>
          ))}
        </div>
        {productionLines.filter((l) => l.total > 0).length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No product-line CoGS data available
          </p>
        )}
      </div>

      {/* ── Customer Cost Attribution Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Cost Attribution Card */}
        <div className={cn(
          'rounded-xl border p-6',
          'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
        )}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold">Customer Cost Attribution</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Average COGS per Customer</p>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(averageCOGSPerCustomer)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/50">
              <div>
                <p className="text-xs text-muted-foreground">Active Customers</p>
                <p className="text-xl font-semibold">{activeCustomerCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total COGS</p>
                <p className="text-xl font-semibold">{formatCurrencyCompact(totalCogsProductionCost)}</p>
              </div>
            </div>
            {activeCustomerCount === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No client records found. Run client resolution to populate.
              </p>
            )}
          </div>
        </div>

        {/* Biggest COGS Line Impact Card */}
        <div className={cn(
          'rounded-xl border p-6',
          'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
        )}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-lg font-semibold">Biggest COGS Line Impact</h2>
          </div>
          {biggestCOGSLine.total > 0 ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Largest Production Line</p>
                <p className="text-2xl font-bold tracking-tight">{biggestCOGSLine.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-semibold">
                    {formatCurrencyCompact(biggestCOGSLine.total)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      ({formatPercent(biggestCOGSLine.percentOfRevenue)} of revenue)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Per Customer</p>
                  <p className="text-lg font-semibold">{formatCurrency(biggestCOGSLine.perCustomer)}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200/50 dark:border-rose-800/50">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" />
                  If <span className="font-medium text-foreground">{biggestCOGSLine.name}</span> were reduced by 10%, gross margin would improve from{' '}
                  <span className="font-semibold text-foreground">{formatPercent(grossMarginImpact.grossMargin)}</span> to{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPercent(reducedMargin)}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No COGS line data available
            </p>
          )}
        </div>
      </div>

      {/* ── Gross Margin Waterfall ── */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Gross Margin Waterfall</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Revenue minus each COGS line to arrive at Gross Profit
          {grossMarginImpact.grossMargin !== 0 && (
            <span className="ml-2 font-medium">
              — Gross Margin: <span className={cn(
                grossMarginImpact.grossMargin >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              )}>{formatPercent(grossMarginImpact.grossMargin)}</span>
            </span>
          )}
        </p>
        {waterfallChartData.length > 2 ? (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={waterfallChartData} margin={{ left: 10, right: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tickFormatter={chartAxisFormatter()}
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                />
                <RechartsTooltip
                  formatter={(value, name) => {
                    if (name === 'base') return [null, null];
                    const label = name === 'positive' ? 'Revenue' : name === 'negative' ? 'Cost' : 'Gross Profit';
                    return [formatCurrency(Number(value ?? 0)), label];
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  itemStyle={{ padding: 0 }}
                />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                {/* Invisible base bar */}
                <Bar dataKey="base" stackId="waterfall" fill="transparent" />
                {/* Revenue (green) */}
                <Bar dataKey="positive" stackId="waterfall" fill="#10b981" radius={[4, 4, 0, 0]} />
                {/* Cost deductions (red) */}
                <Bar dataKey="negative" stackId="waterfall" fill="#ef4444" radius={[4, 4, 0, 0]} />
                {/* Result bar (blue) */}
                <Bar dataKey="result" stackId="waterfall" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Insufficient data for waterfall chart
          </p>
        )}
      </div>
    </div>
  );
}
