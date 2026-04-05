'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Cpu, DollarSign, BarChart3, Users, TrendingUp } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type EndpointBreakdown = {
  endpoint: string;
  tokens: number;
  count: number;
  cost: number;
};

type UserBreakdown = {
  userId: string;
  tokens: number;
  count: number;
  cost: number;
};

type DailyTrend = {
  date: string;
  tokens: number;
  cost: number;
};

type UsageData = {
  totalTokensThisMonth: number;
  totalTokensLastMonth: number;
  totalCostThisMonth: number;
  byEndpoint: EndpointBreakdown[];
  byUser: UserBreakdown[];
  dailyTrend: DailyTrend[];
  budget: {
    used: number;
    limit: number; // -1 = unlimited
    remaining: number;
    resetDate: string;
  };
  plan: string;
  planLimits: Record<string, number>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function planBadgeColor(plan: string): string {
  switch (plan) {
    case 'enterprise': return 'bg-violet-100 text-violet-700';
    case 'growth': return 'bg-blue-100 text-blue-700';
    case 'starter': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/* ------------------------------------------------------------------ */
/*  Circular progress ring                                              */
/* ------------------------------------------------------------------ */

function BudgetRing({ used, limit }: { used: number; limit: number }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  let strokeColor = '#22c55e'; // green
  if (pct > 80) strokeColor = '#ef4444'; // red
  else if (pct > 60) strokeColor = '#f59e0b'; // amber

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isUnlimited ? circumference : offset}
          transform="rotate(-90 64 64)"
          className="transition-all duration-700"
        />
        <text x="64" y="58" textAnchor="middle" className="text-lg font-bold" fill="#1c1b1b" fontSize="16">
          {isUnlimited ? '--' : `${Math.round(pct)}%`}
        </text>
        <text x="64" y="76" textAnchor="middle" fill="#6b7280" fontSize="10">
          {isUnlimited ? 'Unlimited' : 'used'}
        </text>
      </svg>
      <p className="text-sm text-muted-foreground mt-2">
        {formatTokens(used)} / {isUnlimited ? 'Unlimited' : formatTokens(limit)} tokens
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function UsageClient({ orgId }: { orgId: string }) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/usage/${orgId}`);
        if (!res.ok) {
          setError(res.status === 401 ? 'Unauthorized' : 'Failed to load usage data');
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orgId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>AI Usage</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>AI Usage</h2>
          <p className="text-sm text-red-600 mt-1">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const isUnlimited = data.budget.limit === -1;
  const usagePct = isUnlimited ? 0 : (data.budget.used / data.budget.limit) * 100;
  const showUpgradePrompt = !isUnlimited && usagePct > 80;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>AI Usage</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your AI token consumption, costs, and budget.
        </p>
      </div>

      {/* Top cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget meter */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100">
                <Cpu className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-base">Token Budget</CardTitle>
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${planBadgeColor(data.plan)}`}>
                {data.plan}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <BudgetRing used={data.budget.used} limit={data.budget.limit} />
          </CardContent>
        </Card>

        {/* Cost estimate */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-100">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-base">Estimated Cost</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-3xl font-bold" style={{ color: '#1c1b1b' }}>
              {formatCost(data.totalCostThisMonth)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">This month (USD estimate)</p>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">This month</span>
                <span className="font-medium">{formatTokens(data.totalTokensThisMonth)} tokens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last month</span>
                <span className="font-medium">{formatTokens(data.totalTokensLastMonth)} tokens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resets</span>
                <span className="font-medium">{new Date(data.budget.resetDate).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-100">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <CardTitle className="text-base">Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Total API calls this month</p>
                <p className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>
                  {data.byEndpoint.reduce((s, e) => s + e.count, 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Most used feature</p>
                <p className="text-lg font-semibold" style={{ color: '#1c1b1b' }}>
                  {data.byEndpoint[0]?.endpoint ?? 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active endpoints</p>
                <p className="text-lg font-semibold" style={{ color: '#1c1b1b' }}>
                  {data.byEndpoint.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade prompt */}
      {showUpgradePrompt && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-900">
                  You have used {Math.round(usagePct)}% of your monthly AI budget.
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Consider upgrading your plan to avoid hitting the limit before month end.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage by endpoint */}
      {data.byEndpoint.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-orange-100">
                <BarChart3 className="h-4 w-4 text-orange-600" />
              </div>
              <CardTitle className="text-base">Usage by Feature</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byEndpoint.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatTokens} />
                  <YAxis
                    type="category"
                    dataKey="endpoint"
                    width={130}
                    tick={{ fontSize: 12 }}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip
                    formatter={(value: any) => [formatTokens(Number(value)), 'Tokens']}
                    labelFormatter={(label: any) => String(label)}
                  />
                  <Bar dataKey="tokens" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Table below chart */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Endpoint</th>
                    <th className="pb-2 font-medium text-right">Calls</th>
                    <th className="pb-2 font-medium text-right">Tokens</th>
                    <th className="pb-2 font-medium text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byEndpoint.map((ep) => (
                    <tr key={ep.endpoint} className="border-b last:border-0">
                      <td className="py-2 font-medium">{ep.endpoint}</td>
                      <td className="py-2 text-right">{ep.count.toLocaleString()}</td>
                      <td className="py-2 text-right">{formatTokens(ep.tokens)}</td>
                      <td className="py-2 text-right">{formatCost(ep.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily trend */}
      {data.dailyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sky-100">
                <TrendingUp className="h-4 w-4 text-sky-600" />
              </div>
              <CardTitle className="text-base">Daily Trend (Last 30 Days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d: string) => d.slice(5)} // Show MM-DD
                  />
                  <YAxis tickFormatter={formatTokens} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip
                    formatter={(value: any) => [formatTokens(Number(value)), 'Tokens']}
                    labelFormatter={(label: any) => String(label)}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top users table */}
      {data.byUser.length > 0 && data.byUser.some((u) => u.userId !== 'unknown') && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-pink-100">
                <Users className="h-4 w-4 text-pink-600" />
              </div>
              <CardTitle className="text-base">Usage by User</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">User ID</th>
                    <th className="pb-2 font-medium text-right">Calls</th>
                    <th className="pb-2 font-medium text-right">Tokens</th>
                    <th className="pb-2 font-medium text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byUser.map((u) => (
                    <tr key={u.userId} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{u.userId === 'unknown' ? 'System' : u.userId.slice(0, 8) + '...'}</td>
                      <td className="py-2 text-right">{u.count.toLocaleString()}</td>
                      <td className="py-2 text-right">{formatTokens(u.tokens)}</td>
                      <td className="py-2 text-right">{formatCost(u.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
