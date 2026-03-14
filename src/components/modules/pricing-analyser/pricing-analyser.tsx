'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MarginCategory, PricingAnalysisResult } from '@/types/playbook';

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

type PricingAnalyserProps = {
  orgId: string;
  initialData?: PricingAnalysisResult | null;
};

// Demo data for when no API data is available
const DEMO_DATA: PricingAnalysisResult = {
  orgId: '',
  categories: [
    { name: 'Professional Services', revenue: 120000, cost: 72000, margin: 48000, marginPct: 40 },
    { name: 'Product Sales', revenue: 85000, cost: 59500, margin: 25500, marginPct: 30 },
    { name: 'Support & Maintenance', revenue: 45000, cost: 18000, margin: 27000, marginPct: 60 },
    { name: 'Training', revenue: 30000, cost: 15000, margin: 15000, marginPct: 50 },
  ],
  overallMargin: 115500,
  overallMarginPct: 41.25,
  breakEvenVolume: 164500,
  marginTrend: [
    { period: '2024-07', margin: 37.2 },
    { period: '2024-08', margin: 38.5 },
    { period: '2024-09', margin: 36.8 },
    { period: '2024-10', margin: 39.1 },
    { period: '2024-11', margin: 40.3 },
    { period: '2024-12', margin: 41.25 },
  ],
  analysedAt: new Date().toISOString(),
};

export function PricingAnalyser({ orgId, initialData }: PricingAnalyserProps) {
  const data = initialData ?? { ...DEMO_DATA, orgId };
  const [priceChangePercent, setPriceChangePercent] = useState(0);

  // Deterministic what-if calculation
  const scenario = useMemo(() => {
    const elasticity = -0.5; // 1% price increase = 0.5% volume decrease
    const volumeImpactPercent = priceChangePercent * elasticity;
    const volumeMultiplier = 1 + volumeImpactPercent / 100;
    const priceMultiplier = 1 + priceChangePercent / 100;

    const totalRevenue = data.categories.reduce((sum, c) => sum + c.revenue, 0);
    const totalCost = data.categories.reduce((sum, c) => sum + c.cost, 0);

    // Revenue changes with both price and volume effects
    const newRevenue = roundCurrency(totalRevenue * priceMultiplier * volumeMultiplier);
    // Variable costs change with volume only (assume 60% of costs are variable)
    const variableCostPct = 0.6;
    const fixedCosts = totalCost * (1 - variableCostPct);
    const variableCosts = totalCost * variableCostPct * volumeMultiplier;
    const newTotalCost = roundCurrency(fixedCosts + variableCosts);
    const newMargin = roundCurrency(newRevenue - newTotalCost);
    const newMarginPct = newRevenue > 0 ? roundCurrency((newMargin / newRevenue) * 100) : 0;

    return {
      priceChangePercent,
      newRevenue,
      newMargin,
      newMarginPct,
      volumeImpactPercent,
      revenueDelta: newRevenue - totalRevenue,
      marginDelta: newMargin - data.overallMargin,
    };
  }, [priceChangePercent, data]);

  const marginChartData = data.categories.map((c) => ({
    name: c.name,
    margin: c.marginPct,
    revenue: c.revenue,
  }));

  const trendData = data.marginTrend.map((t) => ({
    period: t.period.replace('2024-', ''),
    margin: t.margin,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Overall Margin"
          value={`${data.overallMarginPct.toFixed(1)}%`}
          subtitle={formatCurrency(data.overallMargin)}
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.categories.reduce((s, c) => s + c.revenue, 0))}
          subtitle={`${data.categories.length} categories`}
        />
        <MetricCard
          title="Break-Even Volume"
          value={formatCurrency(data.breakEvenVolume)}
          subtitle="Revenue needed to break even"
        />
        <MetricCard
          title="Best Margin"
          value={`${Math.max(...data.categories.map((c) => c.marginPct)).toFixed(0)}%`}
          subtitle={data.categories.sort((a, b) => b.marginPct - a.marginPct)[0]?.name ?? ''}
        />
      </div>

      {/* Margin by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margin Profile by Category</CardTitle>
          <CardDescription>Gross margin percentage across revenue categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    name === 'margin' ? `${value ?? 0}%` : formatCurrency(value ?? 0),
                    name === 'margin' ? 'Margin' : 'Revenue',
                  ]}
                />
                <Bar dataKey="margin" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} name="margin" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* What-If Pricing Slider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What-If Pricing Analysis</CardTitle>
          <CardDescription>
            Adjust prices and see the projected impact on revenue and margins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Price Change</label>
              <span className={cn(
                'text-lg font-bold',
                priceChangePercent > 0 ? 'text-emerald-600' : priceChangePercent < 0 ? 'text-red-600' : ''
              )}>
                {priceChangePercent > 0 ? '+' : ''}{priceChangePercent}%
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={priceChangePercent}
              onChange={(e) => setPriceChangePercent(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-30%</span>
              <span>0%</span>
              <span>+30%</span>
            </div>
          </div>

          {/* Impact Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <ImpactCard
              title="New Revenue"
              value={formatCurrency(scenario.newRevenue)}
              delta={scenario.revenueDelta}
            />
            <ImpactCard
              title="New Margin"
              value={formatCurrency(scenario.newMargin)}
              delta={scenario.marginDelta}
            />
            <ImpactCard
              title="New Margin %"
              value={`${scenario.newMarginPct.toFixed(1)}%`}
              delta={scenario.newMarginPct - data.overallMarginPct}
              isPercent
            />
          </div>

          {/* Volume impact note */}
          <p className="text-xs text-muted-foreground">
            Assumes price elasticity of -0.5 (a {Math.abs(priceChangePercent)}% price
            {priceChangePercent >= 0 ? ' increase' : ' decrease'} leads to a{' '}
            {Math.abs(scenario.volumeImpactPercent).toFixed(1)}% volume
            {scenario.volumeImpactPercent >= 0 ? ' increase' : ' decrease'}).
          </p>
        </CardContent>
      </Card>

      {/* Margin Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margin Trend</CardTitle>
          <CardDescription>Overall margin percentage over recent periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Margin']}
                />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ImpactCard({
  title,
  value,
  delta,
  isPercent = false,
}: {
  title: string;
  value: string;
  delta: number;
  isPercent?: boolean;
}) {
  const isPositive = delta > 0;
  const isZero = Math.abs(delta) < 0.01;

  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {!isZero && (
        <p className={cn('mt-0.5 text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
          {isPositive ? '+' : ''}
          {isPercent ? `${delta.toFixed(1)}pp` : formatCurrency(delta)}
        </p>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}
