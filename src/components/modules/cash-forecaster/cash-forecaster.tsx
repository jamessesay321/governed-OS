'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatting/currency';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { cn } from '@/lib/utils';
import type { CashForecastResult } from '@/types/playbook';

type CashForecasterProps = {
  orgId: string;
};

export function CashForecaster({ orgId }: CashForecasterProps) {
  const [data, setData] = useState<CashForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(10000);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/modules/cash-forecast/${orgId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.result);
          if (json.result?.alertThreshold) {
            setAlertThreshold(json.result.alertThreshold);
          }
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="h-6 w-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Unable to generate cash forecast. Ensure financial data is available.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.weeks.map((w) => ({
    week: `W${w.weekNumber}`,
    weekStart: new Date(w.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    balance: w.closingBalance,
    cashIn: w.cashIn,
    cashOut: w.cashOut,
    netFlow: w.netCashFlow,
  }));

  const isRunwayDanger = data.runwayWeeks < 8;
  const isBurning = data.burnRate > 0;
  const minBalance = Math.min(...data.weeks.map((w) => w.closingBalance));
  const willBreachThreshold = minBalance < alertThreshold;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Current Cash"
          value={formatCurrency(data.currentCash)}
          subtitle="Available balance"
        />
        <KPICard
          title="Burn Rate"
          value={isBurning ? formatCurrency(data.burnRate) : 'Net positive'}
          subtitle={isBurning ? 'per week' : 'Cash generating'}
          danger={isBurning}
        />
        <KPICard
          title="Cash Runway"
          value={data.runwayWeeks > 52 ? '52+ weeks' : `${data.runwayWeeks} weeks`}
          subtitle={isRunwayDanger ? 'Below safe threshold' : 'At current burn rate'}
          danger={isRunwayDanger}
        />
        <KPICard
          title="Alert Threshold"
          value={formatCurrency(alertThreshold)}
          subtitle={willBreachThreshold ? 'Will be breached' : 'Safe'}
          danger={willBreachThreshold}
        />
      </div>

      {/* Cash Runway Visual */}
      {isBurning && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cash Runway</CardTitle>
            <CardDescription>Visual countdown at current burn rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 weeks</span>
                <span>{Math.min(data.runwayWeeks, 52)} weeks</span>
                <span>52 weeks</span>
              </div>
              <div className="h-4 w-full rounded-full bg-muted">
                <div
                  className={cn(
                    'h-4 rounded-full transition-all',
                    data.runwayWeeks > 26
                      ? 'bg-emerald-500'
                      : data.runwayWeeks > 13
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min((data.runwayWeeks / 52) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 13-Week Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">13-Week Cash Flow Projection</CardTitle>
          <CardDescription>Rolling forecast based on AR/AP patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="weekStart"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompact(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [formatCurrency(Number(value ?? 0)), '']}
                  labelFormatter={(label) => `Week of ${label}`}
                />
                <ReferenceLine
                  y={alertThreshold}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Alert Threshold',
                    position: 'right',
                    fill: 'hsl(var(--destructive))',
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#cashBalance)"
                  strokeWidth={2}
                  name="Closing Balance"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Alert Threshold Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alert Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              Cash alert threshold:
            </label>
            <input
              type="number"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="w-40 rounded-md border bg-background px-3 py-1.5 text-sm"
              step={1000}
              min={0}
            />
            <span className="text-xs text-muted-foreground">
              Alert when projected cash drops below this level
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground">
          <FinancialTooltip term={title}>{title}</FinancialTooltip>
        </p>
        <p className={cn('mt-1 text-2xl font-bold', danger && 'text-destructive')}>
          {value}
        </p>
        <p className={cn('mt-0.5 text-xs', danger ? 'text-destructive/80' : 'text-muted-foreground')}>
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

// formatCurrency imported from @/lib/formatting/currency

function formatCompact(value: number): string {
  return formatCurrencyCompact(value);
}
