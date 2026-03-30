'use client';

import Link from 'next/link';
import {
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/components/providers/currency-context';

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
}

/* ─── helper to format period YYYY-MM-01 to short label ─── */
function fmtPeriod(period: string): string {
  const d = new Date(period + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function ProfitabilityClient({
  connected,
  periods,
  expenseBreakdown,
}: ProfitabilityProps) {
  const { format } = useCurrency();

  const hasData = connected && periods.length > 0;

  /* ─── computed summaries ─── */
  const totalRevenue = periods.reduce((s, p) => s + p.revenue, 0);
  const avgGrossMargin = periods.length > 0
    ? Math.round((periods.reduce((s, p) => s + p.grossMargin, 0) / periods.length) * 10) / 10
    : 0;
  const avgOperatingMargin = periods.length > 0
    ? Math.round((periods.reduce((s, p) => s + p.operatingMargin, 0) / periods.length) * 10) / 10
    : 0;
  const totalNetProfit = periods.reduce((s, p) => s + p.netProfit, 0);
  const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.value, 0);

  /* ─── chart data ─── */
  const grossMarginData = periods.map((p) => ({
    period: fmtPeriod(p.period),
    margin: p.grossMargin,
  }));

  const operatingMarginData = periods.map((p) => ({
    period: fmtPeriod(p.period),
    margin: p.operatingMargin,
  }));

  const netProfitData = periods.map((p) => ({
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
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

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
          {/* Summary stat cards */}
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
                  Across {periods.length} period{periods.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Gross Margin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgGrossMargin}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average across all periods
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Operating Margin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgOperatingMargin}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Net profit / revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Net Profit
                </CardTitle>
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
                <CardTitle className="text-base">Gross Margin Trend</CardTitle>
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
                    <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
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
                <CardTitle className="text-base">Operating Margin Trend</CardTitle>
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
                    <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`} />
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
                  Expense Breakdown ({format(totalExpenses)} total)
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
                    <Tooltip formatter={(v) => format(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Net Profit Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Net Profit Trend</CardTitle>
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
                    <Tooltip formatter={(v) => format(Number(v ?? 0))} />
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
        </>
      )}
    </div>
  );
}
