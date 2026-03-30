'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart as RechartsAreaChart,
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WidgetsClientProps {
  connected: boolean;
  revenueTrend: Array<{ period: string; revenue: number }>;
  pnlSummary: Array<{ name: string; value: number }>;
  cashTrend: Array<{ period: string; cash: number }>;
  expenseBreakdown: Array<{ name: string; value: number; color: string }>;
  kpis: Array<{ label: string; value: string; color: string }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPeriodLabel(period: string): string {
  const d = new Date(period + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Toggle switch component                                           */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-indigo-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Widget definitions                                                */
/* ------------------------------------------------------------------ */

interface WidgetDef {
  id: string;
  name: string;
  desc: string;
  render: (
    props: WidgetsClientProps,
    format: (n: number) => string
  ) => React.ReactNode;
}

const widgetDefs: WidgetDef[] = [
  {
    id: 'revenue-trend',
    name: 'Revenue Trend',
    desc: 'Monthly revenue over recent periods',
    render: (props, format) => {
      const data = props.revenueTrend.map((r) => ({
        label: formatPeriodLabel(r.period),
        revenue: r.revenue,
      }));
      if (data.length === 0) {
        return (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No revenue data
          </p>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={150}>
          <RechartsLineChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => format(v)}
            />
            <Tooltip
              formatter={(v) => [format(Number(v ?? 0)), 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      );
    },
  },
  {
    id: 'pl-summary',
    name: 'P&L Summary',
    desc: 'Latest period profit & loss breakdown',
    render: (props, format) => {
      if (props.pnlSummary.length === 0) {
        return (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No P&L data
          </p>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={props.pnlSummary}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => format(v)}
            />
            <Tooltip formatter={(v) => [format(Number(v ?? 0))]} />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    },
  },
  {
    id: 'cash-position',
    name: 'Cash Position',
    desc: 'Cash balance trajectory over recent periods',
    render: (props, format) => {
      const data = props.cashTrend.map((c) => ({
        label: formatPeriodLabel(c.period),
        cash: c.cash,
      }));
      if (data.length === 0) {
        return (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No cash data
          </p>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={150}>
          <RechartsAreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => format(v)}
            />
            <Tooltip
              formatter={(v) => [format(Number(v ?? 0)), 'Cash']}
            />
            <Area
              type="monotone"
              dataKey="cash"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#cashGrad)"
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      );
    },
  },
  {
    id: 'kpi-gauges',
    name: 'KPI Gauges',
    desc: 'Key performance indicators at a glance',
    render: (props) => {
      if (props.kpis.length === 0) {
        return (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No KPI data
          </p>
        );
      }
      return (
        <div className="grid grid-cols-2 gap-2 py-2">
          {props.kpis.map((k) => (
            <div
              key={k.label}
              className={`rounded-lg px-3 py-2 text-center ${k.color}`}
            >
              <p className="text-lg font-bold leading-tight">{k.value}</p>
              <p className="text-[10px] font-medium opacity-80">{k.label}</p>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'expense-breakdown',
    name: 'Expense Breakdown',
    desc: 'Category split of operating expenses',
    render: (props) => {
      if (props.expenseBreakdown.length === 0) {
        return (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No expense data
          </p>
        );
      }
      return (
        <div className="flex items-center gap-3">
          <ResponsiveContainer width="55%" height={150}>
            <RechartsPieChart>
              <Pie
                data={props.expenseBreakdown}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={55}
                innerRadius={30}
                paddingAngle={2}
              >
                {props.expenseBreakdown.map((e) => (
                  <Cell key={e.name} fill={e.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v ?? 0)}%`]} />
            </RechartsPieChart>
          </ResponsiveContainer>
          <ul className="flex flex-col gap-1 text-[11px]">
            {props.expenseBreakdown.map((e) => (
              <li key={e.name} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: e.color }}
                />
                <span className="text-muted-foreground">{e.name}</span>
                <span className="font-medium">{e.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      );
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function WidgetsClient(props: WidgetsClientProps) {
  const { format } = useCurrency();
  const hasData =
    props.revenueTrend.length > 0 || props.pnlSummary.length > 0;

  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(widgetDefs.map((w) => [w.id, true]))
  );

  const toggle = (id: string) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Widgets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle widgets on or off to customise your dashboard view.
          </p>
        </div>
        <Badge variant="secondary" className="mt-2 w-fit sm:mt-0">
          {enabledCount} of {widgetDefs.length} active
        </Badge>
      </div>

      {/* No-data banner */}
      {(!props.connected || !hasData) && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">
              {!props.connected
                ? 'No accounting platform connected'
                : 'No financial data available yet'}
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {!props.connected
                ? 'Connect your Xero account in Settings to see real widget data.'
                : 'Data will appear here once your first sync completes.'}
            </p>
            {!props.connected && (
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

      {/* Widget grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {widgetDefs.map((w) => (
          <Card
            key={w.id}
            className={`transition-all duration-200 ${
              enabled[w.id]
                ? 'border-border shadow-sm hover:shadow-md hover:border-indigo-400/50'
                : 'border-border/50 opacity-60 hover:opacity-80'
            }`}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-0.5 pr-4">
                <CardTitle className="text-sm font-semibold">
                  {w.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{w.desc}</p>
              </div>
              <Toggle
                checked={enabled[w.id]}
                onChange={() => toggle(w.id)}
              />
            </CardHeader>
            <CardContent className="pt-0">
              {w.render(props, format)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
