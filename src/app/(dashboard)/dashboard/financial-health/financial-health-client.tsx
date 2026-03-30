'use client';

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
  connected: boolean;
  hasData: boolean;
  currentRatio: number;
  totalAssets: number;
  totalLiabilities: number;
  cashPosition: number;
  burnRates: Array<{ period: string; burn: number }>;
  cashByPeriod: Array<{ period: string; cash: number }>;
  runwayMonths: number;
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
  connected,
  hasData,
  currentRatio,
  totalAssets,
  cashPosition,
  burnRates,
  cashByPeriod,
  runwayMonths,
}: FinancialHealthProps) {
  const { format } = useCurrency();

  const latestBurn = burnRates.length > 0 ? burnRates[burnRates.length - 1].burn : 0;
  const avgBurn =
    burnRates.length > 0
      ? burnRates.reduce((sum, b) => sum + b.burn, 0) / burnRates.length
      : 0;

  const chartBurnRates = burnRates.map((b) => ({
    label: formatPeriodLabel(b.period),
    burn: b.burn,
  }));

  const chartCashByPeriod = cashByPeriod.map((c) => ({
    label: formatPeriodLabel(c.period),
    cash: c.cash,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Health</h1>
          <p className="text-muted-foreground text-sm">
            Cash flow, runway, and working-capital overview
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          ← Back to Dashboard
        </Link>
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

      {hasData && (
        <>
          {/* Stat cards row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Ratio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{currentRatio.toFixed(2)}</p>
                {getRatioBadge(currentRatio)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(totalAssets)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cash Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{format(cashPosition)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Burn
                </CardTitle>
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
                <CardTitle className="text-base">Burn Rate Trend</CardTitle>
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
                      <Tooltip formatter={(v) => [format(Number(v ?? 0)), 'Burn Rate']} />
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
                <CardTitle className="text-base">Cash Position</CardTitle>
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
                      <Tooltip formatter={(v) => [format(Number(v ?? 0)), 'Cash Balance']} />
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
                <CardTitle className="text-base">Cash Runway</CardTitle>
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
        </>
      )}
    </div>
  );
}
