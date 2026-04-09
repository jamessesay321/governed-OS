'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatCurrency, formatPercent, chartAxisFormatter } from '@/lib/formatting/currency';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { CrossRef } from '@/components/shared/in-page-link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountRow {
  name: string;
  code: string;
  accountId: string;
  amount: number;
}

export interface DrillDownProps {
  category: string;
  period: string;
  compareMode: string;
  comparePeriod: string | null;
  currentAccounts: AccountRow[];
  baselineAccounts: AccountRow[];
  totalActual: number;
  totalBaseline: number;
}

const COMPARE_LABELS: Record<string, string> = {
  budget: 'Budget',
  prev_month: 'Previous Month',
  prev_quarter: 'Previous Quarter',
  prev_year: 'Same Month Last Year',
};

// Revenue-like categories where higher = favourable
const REVENUE_CATEGORIES = new Set([
  'revenue',
  'gross_profit',
  'net_profit',
]);

function formatPeriodLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DrillDownClient({
  category,
  period,
  compareMode,
  comparePeriod,
  currentAccounts,
  baselineAccounts,
  totalActual,
  totalBaseline,
}: DrillDownProps) {
  const { openDrill } = useDrillDown();

  const isRevenueCategory = REVENUE_CATEGORIES.has(category);
  const totalVariance = totalActual - totalBaseline;
  const totalVariancePct =
    totalBaseline !== 0
      ? (totalVariance / Math.abs(totalBaseline)) * 100
      : 0;

  // Build a map from accountId -> baseline amount
  const baselineMap = new Map<string, number>();
  for (const acc of baselineAccounts) {
    baselineMap.set(acc.accountId, acc.amount);
  }

  // Merge current and baseline into combined rows with variance
  const seenIds = new Set<string>();
  const mergedRows: Array<{
    name: string;
    code: string;
    accountId: string;
    actual: number;
    baseline: number;
    variance: number;
    variancePct: number;
    direction: 'favourable' | 'adverse' | 'on_target';
  }> = [];

  for (const acc of currentAccounts) {
    seenIds.add(acc.accountId);
    const baseline = baselineMap.get(acc.accountId) ?? 0;
    const variance = acc.amount - baseline;
    const variancePct = baseline !== 0 ? (variance / Math.abs(baseline)) * 100 : 0;
    const direction =
      variance === 0
        ? ('on_target' as const)
        : (isRevenueCategory ? variance > 0 : variance < 0)
          ? ('favourable' as const)
          : ('adverse' as const);

    mergedRows.push({
      name: acc.name,
      code: acc.code,
      accountId: acc.accountId,
      actual: acc.amount,
      baseline,
      variance,
      variancePct,
      direction,
    });
  }

  // Add accounts that exist in baseline but not in current
  for (const acc of baselineAccounts) {
    if (!seenIds.has(acc.accountId)) {
      const variance = 0 - acc.amount;
      const variancePct = acc.amount !== 0 ? (variance / Math.abs(acc.amount)) * 100 : 0;
      const direction =
        variance === 0
          ? ('on_target' as const)
          : (isRevenueCategory ? variance > 0 : variance < 0)
            ? ('favourable' as const)
            : ('adverse' as const);

      mergedRows.push({
        name: acc.name,
        code: acc.code,
        accountId: acc.accountId,
        actual: 0,
        baseline: acc.amount,
        variance,
        variancePct,
        direction,
      });
    }
  }

  // Sort by absolute variance descending (biggest movers first)
  mergedRows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  // Chart data: top 10 by absolute variance
  const chartData = mergedRows.slice(0, 10).map((row) => ({
    name: row.name.length > 20 ? row.name.slice(0, 18) + '...' : row.name,
    fullName: row.name,
    variance: row.variance,
    fill: row.direction === 'favourable' ? '#16a34a' : row.direction === 'adverse' ? '#dc2626' : '#6b7280',
  }));

  const categoryLabel = category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  function handleRowClick(row: (typeof mergedRows)[number]) {
    openDrill({
      type: 'account',
      accountId: row.accountId,
      accountName: row.name,
      accountCode: row.code,
      amount: row.actual,
      period,
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Back link */}
      <Link
        href="/variance"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Variance Analysis
      </Link>

      {/* Title with badges */}
      <div>
        <h2 className="text-2xl font-bold">
          Variance Drill-Down: {categoryLabel}
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{formatPeriodLabel(period)}</Badge>
          <Badge variant="secondary">
            vs {COMPARE_LABELS[compareMode] ?? compareMode}
          </Badge>
          {comparePeriod && (
            <Badge variant="outline" className="text-muted-foreground">
              {formatPeriodLabel(comparePeriod)}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Baseline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBaseline)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalVariance === 0
                  ? ''
                  : (isRevenueCategory ? totalVariance > 0 : totalVariance < 0)
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            >
              {totalVariance >= 0 ? '+' : ''}
              {formatCurrency(totalVariance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalVariance === 0
                  ? ''
                  : (isRevenueCategory ? totalVariance > 0 : totalVariance < 0)
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            >
              {totalVariancePct >= 0 ? '+' : ''}
              {formatPercent(totalVariancePct)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account-level table */}
      <Card>
        <CardHeader>
          <CardTitle>Account-Level Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {mergedRows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No account-level data available for this category.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right w-[80px]">Var %</TableHead>
                  <TableHead className="text-center w-[80px]">Direction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedRows.map((row) => (
                  <TableRow
                    key={row.accountId}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell className="text-sm font-medium">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {row.code}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.actual)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(row.baseline)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm font-medium ${
                        row.direction === 'favourable'
                          ? 'text-green-600'
                          : row.direction === 'adverse'
                            ? 'text-red-600'
                            : ''
                      }`}
                    >
                      {row.variance >= 0 ? '+' : ''}
                      {formatCurrency(row.variance)}
                    </TableCell>
                    <TableCell
                      className={`text-right text-xs ${
                        row.direction === 'favourable'
                          ? 'text-green-600'
                          : row.direction === 'adverse'
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {row.variancePct >= 0 ? '+' : ''}
                      {formatPercent(row.variancePct)}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.direction === 'favourable' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Fav
                        </span>
                      ) : row.direction === 'adverse' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <TrendingDown className="h-3.5 w-3.5" />
                          Adv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Minus className="h-3.5 w-3.5" />
                          On Target
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Horizontal bar chart — top 10 by absolute variance */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Variance Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={chartAxisFormatter()}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      formatCurrency(Number(value ?? 0)),
                      'Variance',
                    ]}
                    labelFormatter={(label: React.ReactNode) => {
                      const labelStr = String(label ?? '');
                      const item = chartData.find((d) => d.name === labelStr);
                      return item?.fullName ?? labelStr;
                    }}
                  />
                  <Bar dataKey="variance" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/financials/income-statement" label="Income Statement" />
        <CrossRef href="/financials/budget" label="Budget Overview" />
        <CrossRef href="/kpi" label="KPI Dashboard" />
      </div>
    </div>
  );
}
