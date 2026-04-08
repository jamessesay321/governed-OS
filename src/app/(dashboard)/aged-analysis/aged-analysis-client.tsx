'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import {
  Users,
  Receipt,
  Clock,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  RefreshCcw,
  ArrowUpDown,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/formatting/currency';
import { ExportButton } from '@/components/shared/export-button';
import type { AgedAnalysisData, AgingBucket } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface AgedAnalysisClientProps {
  data: AgedAnalysisData;
}

type TabKey = 'debtors' | 'creditors' | 'working-capital';

/* ================================================================== */
/*  Colours                                                            */
/* ================================================================== */

const BUCKET_COLORS: Record<AgingBucket['colour'], string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

const CHART_COLORS = {
  debtors: '#6366f1',   // indigo
  creditors: '#f43f5e', // rose
  workingCapital: '#0ea5e9', // sky
  dso: '#8b5cf6',       // violet
  dpo: '#ec4899',       // pink
};

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */

function fmtCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `\u00A3${(amount / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `\u00A3${(amount / 1_000).toFixed(0)}k`;
  return formatCurrency(amount);
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `\u00A3${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `\u00A3${(value / 1_000).toFixed(0)}k`;
  return `\u00A3${value}`;
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function DonutChart({
  buckets,
  title,
}: {
  buckets: AgingBucket[];
  title: string;
}) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);

  const renderLabel = ({
    name,
    percent,
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
  }: {
    name?: string;
    percent?: number;
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
  }) => {
    const RADIAN = Math.PI / 180;
    const cxVal = cx ?? 0;
    const cyVal = cy ?? 0;
    const midVal = midAngle ?? 0;
    const innerVal = innerRadius ?? 0;
    const outerVal = outerRadius ?? 0;
    const radius = innerVal + (outerVal - innerVal) * 1.4;
    const x = cxVal + radius * Math.cos(-midVal * RADIAN);
    const y = cyVal + radius * Math.sin(-midVal * RADIAN);

    if ((percent ?? 0) < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#6b7280"
        textAnchor={x > cxVal ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
      >
        {(name ?? '')} {`${(((percent ?? 0)) * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={buckets.map((b) => ({ name: b.label, value: b.amount, colour: b.colour }))}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              label={renderLabel}
              labelLine={false}
            >
              {buckets.map((b, i) => (
                <Cell key={i} fill={BUCKET_COLORS[b.colour]} strokeWidth={0} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Amount']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Center label */}
      <div className="text-center -mt-4">
        <p className="text-lg font-bold">{fmtCompact(total)}</p>
        <p className="text-xs text-muted-foreground">Total Outstanding</p>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: BUCKET_COLORS[b.colour] }}
            />
            <span className="text-muted-foreground">{b.label}</span>
            <span className="ml-auto font-medium">{fmtCompact(b.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopAccountsBar({
  accounts,
  title,
  colour,
  onBarClick,
}: {
  accounts: { accountName: string; amount: number }[];
  title: string;
  colour: string;
  onBarClick?: (account: { accountName: string; amount: number }) => void;
}) {
  const chartData = accounts.map((a) => ({
    name: a.accountName.length > 20 ? a.accountName.substring(0, 20) + '...' : a.accountName,
    fullName: a.accountName,
    amount: a.amount,
  }));

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
          No account data available
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis
                type="number"
                tickFormatter={fmtAxis}
                tick={{ fontSize: 10, fill: '#6b7280' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 10, fill: '#6b7280' }}
              />
              <RechartsTooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Outstanding']}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.name === label);
                  return item?.fullName ?? String(label);
                }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar
                dataKey="amount"
                fill={colour}
                radius={[0, 4, 4, 0]}
                barSize={18}
                className={onBarClick ? 'cursor-pointer' : ''}
                onClick={(_data, _index) => {
                  if (onBarClick && _data) {
                    const payload = _data as unknown as Record<string, unknown>;
                    const fullName = payload.fullName as string | undefined;
                    const name = payload.name as string | undefined;
                    const match = accounts.find(
                      (a) =>
                        a.accountName === fullName ||
                        a.accountName.substring(0, 20) + '...' === name
                    );
                    if (match) onBarClick(match);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function AgedAnalysisClient({ data }: AgedAnalysisClientProps) {
  const { openDrill } = useDrillDown();
  const [activeTab, setActiveTab] = useState<TabKey>('debtors');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'debtors', label: 'Debtors' },
    { key: 'creditors', label: 'Creditors' },
    { key: 'working-capital', label: 'Working Capital' },
  ];

  // Cash conversion cycle data derived from trend
  const cccData = useMemo(() => {
    return data.dsoTrend?.map((d) => ({
      ...d,
      ccc: d.dso - d.dpo,
    })) ?? [];
  }, [data.dsoTrend]);

  if (!data.hasData) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Aged Analysis &mdash; Debtors &amp; Creditors
          </h1>
          <p className="mt-1 text-muted-foreground">
            Understand your receivables and payables aging profile.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">No Financial Data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your accounting software to generate your aged analysis.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Connect Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Aged Analysis &mdash; Debtors &amp; Creditors
          </h1>
          <p className="mt-1 text-muted-foreground">
            Receivables and payables aging, DSO/DPO, and working capital cycle.
          </p>
        </div>
        <ExportButton
          data={[
            ...data.topDebtorAccounts.map((a) => ({
              type: 'Debtor',
              name: a.accountName,
              current: data.debtorBuckets[0]?.amount ?? 0,
              thirtyDays: data.debtorBuckets[1]?.amount ?? 0,
              sixtyDays: data.debtorBuckets[2]?.amount ?? 0,
              ninetyPlusDays: data.debtorBuckets[3]?.amount ?? 0,
              total: a.amount,
            })),
            ...data.topCreditorAccounts.map((a) => ({
              type: 'Creditor',
              name: a.accountName,
              current: data.creditorBuckets[0]?.amount ?? 0,
              thirtyDays: data.creditorBuckets[1]?.amount ?? 0,
              sixtyDays: data.creditorBuckets[2]?.amount ?? 0,
              ninetyPlusDays: data.creditorBuckets[3]?.amount ?? 0,
              total: a.amount,
            })),
          ]}
          columns={[
            { header: 'Type', key: 'type', format: 'text' },
            { header: 'Name', key: 'name', format: 'text' },
            { header: 'Current', key: 'current', format: 'currency' },
            { header: '30 Days', key: 'thirtyDays', format: 'currency' },
            { header: '60 Days', key: 'sixtyDays', format: 'currency' },
            { header: '90+ Days', key: 'ninetyPlusDays', format: 'currency' },
            { header: 'Total Outstanding', key: 'total', format: 'currency' },
          ]}
          filename="aged-analysis"
          title="Aged Analysis — Debtors & Creditors"
          subtitle={`Total Debtors: ${formatCurrency(data.totalDebtors)} · Total Creditors: ${formatCurrency(data.totalCreditors)} · DSO: ${data.dso} days · DPO: ${data.dpo} days`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Debtors */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Users className="h-4 w-4 text-indigo-500" />
            Total Debtors
          </div>
          <p className="text-2xl font-bold text-indigo-600">
            {formatCurrency(data.totalDebtors)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Owed to you</p>
        </div>

        {/* Total Creditors */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Receipt className="h-4 w-4 text-rose-500" />
            Total Creditors
          </div>
          <p className="text-2xl font-bold text-rose-600">
            {formatCurrency(data.totalCreditors)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">You owe</p>
        </div>

        {/* DSO */}
        <div className={cn(
          'rounded-xl border p-5',
          data.dso > 60
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
            : data.dso > 45
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            DSO
          </div>
          <p className={cn(
            'text-2xl font-bold',
            data.dso > 60 ? 'text-red-600' : data.dso > 45 ? 'text-amber-600' : 'text-emerald-600'
          )}>
            {data.dso} days
          </p>
          <p className="text-xs text-muted-foreground mt-1">Days Sales Outstanding</p>
        </div>

        {/* DPO */}
        <div className={cn(
          'rounded-xl border p-5',
          data.dpo < 20
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            DPO
          </div>
          <p className={cn(
            'text-2xl font-bold',
            data.dpo < 20 ? 'text-amber-600' : 'text-emerald-600'
          )}>
            {data.dpo} days
          </p>
          <p className="text-xs text-muted-foreground mt-1">Days Payable Outstanding</p>
        </div>

        {/* Working Capital Cycle */}
        <div className={cn(
          'rounded-xl border p-5',
          data.workingCapitalCycle > 60
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
            : data.workingCapitalCycle > 30
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <RefreshCcw className="h-4 w-4" />
            Cash Cycle
          </div>
          <p className={cn(
            'text-2xl font-bold',
            data.workingCapitalCycle > 60
              ? 'text-red-600'
              : data.workingCapitalCycle > 30
                ? 'text-amber-600'
                : 'text-emerald-600'
          )}>
            {data.workingCapitalCycle} days
          </p>
          <p className="text-xs text-muted-foreground mt-1">DSO minus DPO</p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* DEBTORS TAB                                                   */}
      {/* ============================================================ */}
      {activeTab === 'debtors' && (
        <div className="space-y-6">
          {/* Donut + Top Accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutChart
              buckets={data.debtorBuckets}
              title="Debtor Aging Distribution"
            />
            <TopAccountsBar
              accounts={data.topDebtorAccounts}
              title="Top Debtor Accounts"
              colour={CHART_COLORS.debtors}
              onBarClick={(acct) => {
                openDrill({
                  type: 'custom',
                  title: acct.accountName,
                  subtitle: `Debtor — ${formatCurrency(acct.amount)} outstanding`,
                  rows: [
                    { label: 'Outstanding Balance', value: formatCurrency(acct.amount) },
                    { label: 'DSO (Overall)', value: `${data.dso} days` },
                    { label: 'Type', value: 'Accounts Receivable' },
                  ],
                });
              }}
            />
          </div>

          {/* Debtor Trend */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Total Debtors &mdash; 12-Month Trend
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.trendData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={70}
                  />
                  <RechartsTooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Debtors']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <defs>
                    <linearGradient id="debtorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.debtors} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.debtors} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="debtors"
                    stroke={CHART_COLORS.debtors}
                    fill="url(#debtorGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: CHART_COLORS.debtors }}
                    name="Debtors"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Aging Breakdown Table */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Debtor Aging Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Bucket</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">% of Total</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.debtorBuckets.map((b) => {
                    const total = data.debtorBuckets.reduce((s, x) => s + x.amount, 0);
                    const pct = total > 0 ? ((b.amount / total) * 100).toFixed(1) : '0';
                    return (
                      <tr
                        key={b.label}
                        className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          openDrill({
                            type: 'custom',
                            title: `Debtors — ${b.label}`,
                            subtitle: `${formatCurrency(b.amount)} (${pct}% of total debtors)`,
                            rows: [
                              { label: 'Bucket', value: b.label },
                              { label: 'Amount', value: formatCurrency(b.amount) },
                              { label: '% of Total', value: `${pct}%` },
                              { label: 'Status', value: b.colour === 'green' ? 'On Track' : b.colour === 'amber' ? 'Watch' : 'Overdue' },
                              { label: 'Total Debtors', value: formatCurrency(total) },
                            ],
                          });
                        }}
                      >
                        <td className="py-2 px-3 font-medium flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: BUCKET_COLORS[b.colour] }}
                          />
                          {b.label}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {formatCurrency(b.amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{pct}%</td>
                        <td className="py-2 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              b.colour === 'green'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : b.colour === 'amber'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                            )}
                          >
                            {b.colour === 'green' ? 'On Track' : b.colour === 'amber' ? 'Watch' : 'Overdue'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREDITORS TAB                                                 */}
      {/* ============================================================ */}
      {activeTab === 'creditors' && (
        <div className="space-y-6">
          {/* Donut + Top Accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutChart
              buckets={data.creditorBuckets}
              title="Creditor Aging Distribution"
            />
            <TopAccountsBar
              accounts={data.topCreditorAccounts}
              title="Top Creditor Accounts"
              colour={CHART_COLORS.creditors}
              onBarClick={(acct) => {
                openDrill({
                  type: 'custom',
                  title: acct.accountName,
                  subtitle: `Creditor — ${formatCurrency(acct.amount)} outstanding`,
                  rows: [
                    { label: 'Outstanding Balance', value: formatCurrency(acct.amount) },
                    { label: 'DPO (Overall)', value: `${data.dpo} days` },
                    { label: 'Type', value: 'Accounts Payable' },
                  ],
                });
              }}
            />
          </div>

          {/* Creditor Trend */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Total Creditors &mdash; 12-Month Trend
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.trendData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={70}
                  />
                  <RechartsTooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Creditors']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <defs>
                    <linearGradient id="creditorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.creditors} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.creditors} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="creditors"
                    stroke={CHART_COLORS.creditors}
                    fill="url(#creditorGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: CHART_COLORS.creditors }}
                    name="Creditors"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Aging Breakdown Table */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              Creditor Aging Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Bucket</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">% of Total</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.creditorBuckets.map((b) => {
                    const total = data.creditorBuckets.reduce((s, x) => s + x.amount, 0);
                    const pct = total > 0 ? ((b.amount / total) * 100).toFixed(1) : '0';
                    return (
                      <tr
                        key={b.label}
                        className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          openDrill({
                            type: 'custom',
                            title: `Creditors — ${b.label}`,
                            subtitle: `${formatCurrency(b.amount)} (${pct}% of total creditors)`,
                            rows: [
                              { label: 'Bucket', value: b.label },
                              { label: 'Amount', value: formatCurrency(b.amount) },
                              { label: '% of Total', value: `${pct}%` },
                              { label: 'Status', value: b.colour === 'green' ? 'Current' : b.colour === 'amber' ? 'Aging' : 'Overdue' },
                              { label: 'Total Creditors', value: formatCurrency(total) },
                            ],
                          });
                        }}
                      >
                        <td className="py-2 px-3 font-medium flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: BUCKET_COLORS[b.colour] }}
                          />
                          {b.label}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {formatCurrency(b.amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{pct}%</td>
                        <td className="py-2 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              b.colour === 'green'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : b.colour === 'amber'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                            )}
                          >
                            {b.colour === 'green' ? 'Current' : b.colour === 'amber' ? 'Aging' : 'Overdue'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* WORKING CAPITAL TAB                                           */}
      {/* ============================================================ */}
      {activeTab === 'working-capital' && (
        <div className="space-y-6">
          {/* Working Capital Trend */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">
              Working Capital Trend
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Debtors minus Creditors over 12 months
            </p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.trendData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={70}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value ?? 0)),
                      String(name) === 'debtors' ? 'Debtors' : String(name) === 'creditors' ? 'Creditors' : 'Working Capital',
                    ]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'debtors' ? 'Debtors' : value === 'creditors' ? 'Creditors' : 'Working Capital'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="debtors"
                    stroke={CHART_COLORS.debtors}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="debtors"
                  />
                  <Line
                    type="monotone"
                    dataKey="creditors"
                    stroke={CHART_COLORS.creditors}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="creditors"
                  />
                  <defs>
                    <linearGradient id="wcGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.workingCapital} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_COLORS.workingCapital} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="workingCapital"
                    stroke={CHART_COLORS.workingCapital}
                    fill="url(#wcGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: CHART_COLORS.workingCapital }}
                    name="workingCapital"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DSO vs DPO Comparison */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">
              DSO vs DPO Comparison
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Days Sales Outstanding vs Days Payable Outstanding
            </p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dsoTrend} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={50}
                    label={{
                      value: 'Days',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 11, fill: '#6b7280' },
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      `${value} days`,
                      name === 'dso' ? 'DSO' : 'DPO',
                    ]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend formatter={(value) => (value === 'dso' ? 'DSO' : 'DPO')} />
                  <Bar dataKey="dso" fill={CHART_COLORS.dso} radius={[4, 4, 0, 0]} barSize={16} name="dso" />
                  <Bar dataKey="dpo" fill={CHART_COLORS.dpo} radius={[4, 4, 0, 0]} barSize={16} name="dpo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cash Conversion Cycle */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground">
                Cash Conversion Cycle
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              DSO minus DPO — lower is better. Negative means you collect before you pay.
            </p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cccData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={50}
                    label={{
                      value: 'Days',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 11, fill: '#6b7280' },
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${Number(value ?? 0)} days`, 'Cash Conversion Cycle']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ccc"
                    stroke={CHART_COLORS.workingCapital}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: CHART_COLORS.workingCapital, stroke: '#fff', strokeWidth: 2 }}
                    name="CCC"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* CCC Insight Box */}
            <div className={cn(
              'mt-4 rounded-lg border p-4',
              data.workingCapitalCycle <= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                : data.workingCapitalCycle <= 30
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                  : data.workingCapitalCycle <= 60
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
            )}>
              <div className="flex items-start gap-3">
                <TrendingUp className={cn(
                  'h-5 w-5 mt-0.5 flex-shrink-0',
                  data.workingCapitalCycle <= 30 ? 'text-emerald-600' : data.workingCapitalCycle <= 60 ? 'text-amber-600' : 'text-red-600'
                )} />
                <div>
                  <p className="text-sm font-medium">
                    {data.workingCapitalCycle <= 0
                      ? 'Excellent cash conversion — you collect before you pay.'
                      : data.workingCapitalCycle <= 30
                        ? 'Healthy cash conversion cycle. Cash is efficiently managed.'
                        : data.workingCapitalCycle <= 60
                          ? 'Moderate cash cycle. Consider tightening collection terms or extending supplier payments.'
                          : 'Extended cash cycle. There is significant cash tied up in working capital. Review collection processes and negotiate longer payment terms.'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your business takes {data.dso} days to collect from customers and pays suppliers in {data.dpo} days,
                    resulting in a {Math.abs(data.workingCapitalCycle)}-day {data.workingCapitalCycle >= 0 ? 'funding gap' : 'funding advantage'}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
