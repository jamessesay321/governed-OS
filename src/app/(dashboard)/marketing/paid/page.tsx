'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { chartAxisFormatter } from '@/lib/formatting/currency';
import {
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  BarChart3,
  ArrowUpRight,
  Percent,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AdPlatform = 'meta' | 'google' | 'tiktok';

interface AdMetrics {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  conversions: number;
  roas: string;
  budget: number;
  spent: number;
}

interface Campaign {
  name: string;
  status: 'active' | 'paused' | 'completed';
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  conversions: number;
  roas: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const adPlatforms: Record<AdPlatform, { label: string; metrics: AdMetrics; campaigns: Campaign[] }> = {
  meta: {
    label: 'Meta Ads',
    metrics: {
      spend: '$5,240',
      impressions: '482K',
      clicks: '12,840',
      ctr: '2.66%',
      cpc: '$0.41',
      conversions: 384,
      roas: '4.2x',
      budget: 7000,
      spent: 5240,
    },
    campaigns: [
      { name: 'Spring Collection - Lookalike', status: 'active', spend: '$2,180', impressions: '198K', clicks: '5,420', ctr: '2.74%', conversions: 162, roas: '4.8x' },
      { name: 'Retargeting - Cart Abandoners', status: 'active', spend: '$1,460', impressions: '89K', clicks: '3,890', ctr: '4.37%', conversions: 134, roas: '5.6x' },
      { name: 'Brand Awareness - New Markets', status: 'active', spend: '$980', impressions: '142K', clicks: '2,340', ctr: '1.65%', conversions: 56, roas: '2.1x' },
      { name: 'Video Views - Product Demo', status: 'paused', spend: '$620', impressions: '53K', clicks: '1,190', ctr: '2.25%', conversions: 32, roas: '3.4x' },
    ],
  },
  google: {
    label: 'Google Ads',
    metrics: {
      spend: '$4,890',
      impressions: '324K',
      clicks: '9,780',
      ctr: '3.02%',
      cpc: '$0.50',
      conversions: 456,
      roas: '6.2x',
      budget: 6000,
      spent: 4890,
    },
    campaigns: [
      { name: 'Search - Brand Keywords', status: 'active', spend: '$1,240', impressions: '45K', clicks: '3,890', ctr: '8.64%', conversions: 198, roas: '9.2x' },
      { name: 'Search - Non-Brand', status: 'active', spend: '$2,100', impressions: '156K', clicks: '3,420', ctr: '2.19%', conversions: 156, roas: '4.8x' },
      { name: 'Shopping - Product Feed', status: 'active', spend: '$1,120', impressions: '98K', clicks: '1,890', ctr: '1.93%', conversions: 78, roas: '5.1x' },
      { name: 'Display - Remarketing', status: 'completed', spend: '$430', impressions: '25K', clicks: '580', ctr: '2.32%', conversions: 24, roas: '3.8x' },
    ],
  },
  tiktok: {
    label: 'TikTok Ads',
    metrics: {
      spend: '$2,350',
      impressions: '678K',
      clicks: '8,120',
      ctr: '1.20%',
      cpc: '$0.29',
      conversions: 198,
      roas: '3.8x',
      budget: 3500,
      spent: 2350,
    },
    campaigns: [
      { name: 'Spark Ads - UGC Content', status: 'active', spend: '$980', impressions: '312K', clicks: '3,740', ctr: '1.20%', conversions: 89, roas: '4.2x' },
      { name: 'In-Feed - Product Launch', status: 'active', spend: '$870', impressions: '234K', clicks: '2,810', ctr: '1.20%', conversions: 67, roas: '3.6x' },
      { name: 'TopView - Brand Moment', status: 'paused', spend: '$500', impressions: '132K', clicks: '1,570', ctr: '1.19%', conversions: 42, roas: '3.4x' },
    ],
  },
};

const weeklySpendData = [
  { week: 'W1', meta: 1200, google: 1100, tiktok: 520 },
  { week: 'W2', meta: 1340, google: 1250, tiktok: 580 },
  { week: 'W3', meta: 1380, google: 1280, tiktok: 620 },
  { week: 'W4', meta: 1320, google: 1260, tiktok: 630 },
];

const roasTrend = [
  { week: 'W1', meta: 3.8, google: 5.9, tiktok: 3.2 },
  { week: 'W2', meta: 4.0, google: 6.0, tiktok: 3.5 },
  { week: 'W3', meta: 4.1, google: 6.1, tiktok: 3.7 },
  { week: 'W4', meta: 4.2, google: 6.2, tiktok: 3.8 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PaidAdsPage() {
  const [activePlatform, setActivePlatform] = useState<AdPlatform>('meta');
  const current = adPlatforms[activePlatform];
  const m = current.metrics;
  const budgetPercent = Math.round((m.spent / m.budget) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Paid Ads Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor ad spend, performance, and return on investment across platforms.
        </p>
      </header>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(adPlatforms) as AdPlatform[]).map((key) => (
          <Button
            key={key}
            variant={activePlatform === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePlatform(key)}
            className={
              activePlatform === key
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            }
          >
            {adPlatforms[key].label}
          </Button>
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Spend', value: m.spend, icon: DollarSign },
          { label: 'Impressions', value: m.impressions, icon: Eye },
          { label: 'Clicks', value: m.clicks, icon: MousePointerClick },
          { label: 'CTR', value: m.ctr, icon: Percent },
          { label: 'CPC', value: m.cpc, icon: DollarSign },
          { label: 'Conversions', value: m.conversions.toLocaleString(), icon: Target },
          { label: 'ROAS', value: m.roas, icon: TrendingUp },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget pacing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Budget Pacing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                ${m.spent.toLocaleString()} spent of ${m.budget.toLocaleString()} budget
              </span>
              <span className="font-semibold">{budgetPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetPercent > 90
                    ? 'bg-red-500'
                    : budgetPercent > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetPercent < 75
                ? 'On track. Spend is pacing well within budget.'
                : budgetPercent < 90
                ? 'Approaching budget limit. Monitor closely.'
                : 'Near budget cap. Consider pausing lower-performing campaigns.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Weekly Spend by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySpendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={chartAxisFormatter()} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`£${value}`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="meta" fill="#059669" radius={[2, 2, 0, 0]} name="Meta" />
                  <Bar dataKey="google" fill="#10b981" radius={[2, 2, 0, 0]} name="Google" />
                  <Bar dataKey="tiktok" fill="#6ee7b7" radius={[2, 2, 0, 0]} name="TikTok" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">ROAS Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={roasTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} unit="x" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value}x`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="meta" stroke="#059669" strokeWidth={2} dot={false} name="Meta" />
                  <Line type="monotone" dataKey="google" stroke="#10b981" strokeWidth={2} dot={false} name="Google" />
                  <Line type="monotone" dataKey="tiktok" stroke="#6ee7b7" strokeWidth={2} dot={false} name="TikTok" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign performance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Campaign Performance - {current.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Campaign</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Spend</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Impressions</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Clicks</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">CTR</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Conversions</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {current.campaigns.map((c, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant="secondary"
                        className={
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : c.status === 'paused'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">{c.spend}</td>
                    <td className="py-3 pr-4 text-right">{c.impressions}</td>
                    <td className="py-3 pr-4 text-right">{c.clicks}</td>
                    <td className="py-3 pr-4 text-right">{c.ctr}</td>
                    <td className="py-3 pr-4 text-right">{c.conversions}</td>
                    <td className="py-3 text-right font-semibold">{c.roas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Optimization Suggestions */}
      <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              AI Optimization Suggestions
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              Beta
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Based on campaign performance data, here are optimization recommendations:
          </p>
          <ul className="space-y-2">
            {[
              'Increase budget on "Retargeting - Cart Abandoners" by 20%. It has the highest ROAS at 5.6x.',
              'Consider pausing "Brand Awareness - New Markets" and reallocating to higher-performing campaigns.',
              'Test broader audiences on TikTok Spark Ads. Engagement is strong but reach can scale further.',
              'Add negative keywords to Google non-brand search. CTR suggests some irrelevant traffic.',
              'Schedule Meta ads to run between 6PM and 11PM when your audience is most active.',
            ].map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="outline" className="mt-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <Sparkles className="h-3 w-3 mr-1" /> Run Full Audit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
