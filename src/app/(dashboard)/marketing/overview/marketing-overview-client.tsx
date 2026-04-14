'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Mail,
  MousePointerClick,
  DollarSign,
  Users,
  Zap,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Share2,
  Search,
  Megaphone,
  Eye,
  Target,
  Award,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent } from '@/lib/formatting/currency';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types (mirrors KlaviyoMetricsSummary from klaviyo-metrics.ts)
// ---------------------------------------------------------------------------

interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  sendTime: string | null;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  revenueAttributed: number;
  recipientCount: number;
}

interface CampaignsByMonth {
  month: string;
  campaignCount: number;
  totalRecipients: number;
  totalRevenue: number;
  avgOpenRate: number;
  avgClickRate: number;
}

interface SubscribersByList {
  listId: string;
  listName: string;
  subscriberCount: number;
  pctOfTotal: number;
}

interface FlowsByTrigger {
  triggerType: string;
  count: number;
  flowNames: string[];
}

interface KlaviyoMetricsData {
  connected: boolean;
  campaignMetrics: {
    totalCampaigns: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgBounceRate: number;
    totalAttributedRevenue: number;
    campaignsByMonth: CampaignsByMonth[];
    bestPerformingCampaign: CampaignPerformance | null;
    worstPerformingCampaign: CampaignPerformance | null;
  };
  listHealth: {
    totalSubscribers: number;
    activeSubscribers: number;
    listGrowthRate: number | null;
    subscribersByList: SubscribersByList[];
    engagementRate: number;
  };
  flowMetrics: {
    totalFlows: number;
    activeFlows: number;
    flowsByTrigger: FlowsByTrigger[];
    automationCoverage: number;
  };
  emailROI: {
    totalEmailRevenue: number;
    revenuePerEmail: number;
    revenuePerSubscriber: number;
    costPerAcquisition: number | null;
  };
  computedAt: string;
}

type Props = {
  klaviyoConfigured: boolean;
};

// ---------------------------------------------------------------------------
// Static channel data (non-Klaviyo — not yet connected)
// ---------------------------------------------------------------------------

const staticChannels = [
  {
    name: 'Organic Social',
    icon: Share2,
    description: 'Instagram, TikTok, LinkedIn, X, Facebook',
    href: '/marketing/organic',
    status: 'Coming soon' as const,
  },
  {
    name: 'Paid Ads',
    icon: Megaphone,
    description: 'Meta Ads, Google Ads, TikTok Ads',
    href: '/marketing/paid',
    status: 'Coming soon' as const,
  },
  {
    name: 'SEO',
    icon: Search,
    description: 'Organic search traffic and rankings',
    href: '/marketing/seo',
    status: 'Coming soon' as const,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketingOverviewClient({ klaviyoConfigured }: Props) {
  const [data, setData] = useState<KlaviyoMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/klaviyo/metrics');
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to load marketing data');
        return;
      }

      if (!json.connected) {
        setData(null);
        return;
      }

      setData(json as KlaviyoMetricsData);
    } catch {
      setError('Network error fetching marketing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (klaviyoConfigured) {
      fetchData();
    }
  }, [klaviyoConfigured, fetchData]);

  // -----------------------------------------------------------------------
  // Not connected state
  // -----------------------------------------------------------------------

  if (!klaviyoConfigured) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950/30">
            <Mail className="h-7 w-7 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold">Connect Klaviyo</h2>
          <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
            Add your Klaviyo API key to pull campaign analytics, subscriber data,
            and email ROI into the marketing dashboard.
          </p>
          <Link
            href="/integrations"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
          >
            Connect Klaviyo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ChannelGrid klaviyoData={null} />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/30" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state (only if no cached data — otherwise show banner below)
  // -----------------------------------------------------------------------

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12">
          <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive/20 bg-card px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Data loaded
  // -----------------------------------------------------------------------

  const cm = data?.campaignMetrics;
  const lh = data?.listHealth;
  const fm = data?.flowMetrics;
  const roi = data?.emailROI;

  const topMetrics = [
    {
      label: 'Subscribers',
      value: (lh?.totalSubscribers ?? 0).toLocaleString(),
      detail: `${lh?.activeSubscribers?.toLocaleString() ?? 0} active (subscribed)`,
      icon: Users,
      change: lh?.listGrowthRate != null
        ? `${lh.listGrowthRate >= 0 ? '+' : ''}${formatPercent(lh.listGrowthRate, true)}`
        : null,
      trend: lh?.listGrowthRate != null ? (lh.listGrowthRate >= 0 ? 'up' : 'down') : null,
    },
    {
      label: 'Avg Open Rate',
      value: formatPercent(cm?.avgOpenRate ?? 0, true),
      detail: `Across ${cm?.totalCampaigns ?? 0} campaigns`,
      icon: Mail,
      change: null,
      trend: null,
    },
    {
      label: 'Avg Click Rate',
      value: formatPercent(cm?.avgClickRate ?? 0, true),
      detail: `Bounce rate: ${formatPercent(cm?.avgBounceRate ?? 0, true)}`,
      icon: MousePointerClick,
      change: null,
      trend: null,
    },
    {
      label: 'Email Revenue',
      value: formatCurrency(roi?.totalEmailRevenue ?? 0),
      detail: `${formatCurrency(roi?.revenuePerEmail ?? 0)} per email sent`,
      icon: DollarSign,
      change: null,
      trend: null,
    },
    {
      label: 'Active Flows',
      value: String(fm?.activeFlows ?? 0),
      detail: `of ${fm?.totalFlows ?? 0} total (${formatPercent(fm?.automationCoverage ?? 0, true)} live)`,
      icon: Zap,
      change: null,
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <Header />
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error banner (stale data) */}
      {error && data && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Failed to refresh — showing cached data
          </span>
          <button
            type="button"
            onClick={fetchData}
            className="ml-auto text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {topMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="relative overflow-hidden">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {m.label}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
                {m.change && m.trend && (
                  <div className="flex items-center gap-1 mt-1">
                    {m.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        m.trend === 'up' ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {m.change}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs prior 30d</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">{m.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Channel breakdown */}
      <ChannelGrid klaviyoData={data} />

      {/* Campaign Volume by Month */}
      {cm && cm.campaignsByMonth.length > 0 && (
        <CampaignMonthlyChart months={cm.campaignsByMonth} />
      )}

      {/* Best & Worst Campaigns + List Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Best & Worst Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Campaign Highlights</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {cm?.bestPerformingCampaign && (
              <CampaignHighlight
                label="Best Performing"
                campaign={cm.bestPerformingCampaign}
                variant="best"
              />
            )}
            {cm?.worstPerformingCampaign &&
              cm.worstPerformingCampaign.campaignId !== cm.bestPerformingCampaign?.campaignId && (
              <CampaignHighlight
                label="Needs Attention"
                campaign={cm.worstPerformingCampaign}
                variant="worst"
              />
            )}
            {!cm?.bestPerformingCampaign && !cm?.worstPerformingCampaign && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No campaign data available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subscriber Lists */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Subscriber Lists</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                {lh?.totalSubscribers?.toLocaleString() ?? 0} total
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {lh && lh.subscribersByList.length > 0 ? (
              <div className="space-y-3">
                {lh.subscribersByList.slice(0, 8).map((list) => (
                  <div key={list.listId} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{list.listName}</p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.min(list.pctOfTotal, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right shrink-0">
                      <span className="text-sm font-medium tabular-nums">
                        {list.subscriberCount.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({list.pctOfTotal}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No subscriber lists found
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flow Automation */}
      {fm && fm.flowsByTrigger.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Automation Flows</CardTitle>
              </div>
              <Badge variant="secondary">
                {fm.activeFlows} of {fm.totalFlows} live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fm.flowsByTrigger.map((trigger) => (
                <div
                  key={trigger.triggerType}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {trigger.triggerType.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {trigger.count}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {trigger.flowNames.slice(0, 3).map((name) => (
                      <p key={name} className="text-xs text-foreground truncate">
                        {name}
                      </p>
                    ))}
                    {trigger.flowNames.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{trigger.flowNames.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email ROI Summary */}
      {roi && (roi.totalEmailRevenue > 0 || roi.revenuePerEmail > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">Email ROI</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ROIMetric
                label="Total Email Revenue"
                value={formatCurrency(roi.totalEmailRevenue)}
              />
              <ROIMetric
                label="Revenue per Email"
                value={formatCurrency(roi.revenuePerEmail)}
              />
              <ROIMetric
                label="Revenue per Subscriber"
                value={formatCurrency(roi.revenuePerSubscriber)}
              />
              <ROIMetric
                label="Cost per Acquisition"
                value={roi.costPerAcquisition != null
                  ? formatCurrency(roi.costPerAcquisition)
                  : 'N/A'}
                muted={roi.costPerAcquisition == null}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header() {
  return (
    <header>
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        Marketing Intelligence
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Performance snapshot across all marketing channels.
      </p>
    </header>
  );
}

function ChannelGrid({ klaviyoData }: { klaviyoData: KlaviyoMetricsData | null }) {
  const emailCard = klaviyoData
    ? {
        name: 'Email / Klaviyo',
        icon: Mail,
        metric: `${formatPercent(klaviyoData.campaignMetrics.avgOpenRate, true)} open rate`,
        trend: `${formatCurrency(klaviyoData.emailROI.totalEmailRevenue)} revenue`,
        trendDir: 'up' as const,
        href: '/retention',
        description: `${klaviyoData.campaignMetrics.totalCampaigns} campaigns, ${klaviyoData.flowMetrics.activeFlows} active flows`,
        highlight: klaviyoData.campaignMetrics.bestPerformingCampaign
          ? `Top campaign: ${formatPercent(klaviyoData.campaignMetrics.bestPerformingCampaign.openRate, true)} open rate`
          : `${klaviyoData.listHealth.totalSubscribers.toLocaleString()} subscribers`,
        connected: true,
      }
    : {
        name: 'Email / Klaviyo',
        icon: Mail,
        metric: 'Not connected',
        trend: '',
        trendDir: 'up' as const,
        href: '/integrations',
        description: 'Email campaigns and automations',
        highlight: 'Connect Klaviyo to see email analytics',
        connected: false,
      };

  const allChannels = [
    ...staticChannels.map((ch) => ({
      ...ch,
      metric: '',
      trend: '',
      trendDir: 'up' as const,
      highlight: 'Connect integration to see live data',
      connected: false,
    })),
    emailCard,
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Channel Breakdown
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allChannels.map((ch) => {
          const Icon = ch.icon;
          return (
            <Card
              key={ch.name}
              className={`transition-colors group ${
                ch.connected
                  ? 'hover:border-emerald-500/40'
                  : 'opacity-75'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        ch.connected
                          ? 'bg-emerald-50 dark:bg-emerald-950/30'
                          : 'bg-muted'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          ch.connected ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <CardTitle className="text-base">{ch.name}</CardTitle>
                  </div>
                  {ch.connected ? (
                    ch.trend && (
                      <Badge
                        variant="secondary"
                        className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
                      >
                        {ch.trend}
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {'status' in ch ? (ch as { status: string }).status : 'Not connected'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {ch.connected && ch.metric && (
                  <p className="text-lg font-semibold">{ch.metric}</p>
                )}
                <p className="text-xs text-muted-foreground">{ch.description}</p>
                <div
                  className={`flex items-center gap-2 rounded-md px-3 py-2 ${
                    ch.connected
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'bg-muted/50'
                  }`}
                >
                  {ch.connected ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`text-xs ${
                      ch.connected
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {ch.highlight}
                  </span>
                </div>
                <Link href={ch.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs text-muted-foreground group-hover:text-emerald-600 transition-colors px-0"
                  >
                    {ch.connected ? 'View details' : 'Connect'}{' '}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CampaignMonthlyChart({ months }: { months: CampaignsByMonth[] }) {
  // Show last 12 months max
  const chartData = months.slice(-12).map((m) => ({
    month: new Date(m.month + '-01').toLocaleDateString('en-GB', {
      month: 'short',
      year: '2-digit',
    }),
    campaigns: m.campaignCount,
    recipients: m.totalRecipients,
    revenue: m.totalRevenue,
    openRate: Math.round(m.avgOpenRate * 1000) / 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-base">Campaign Volume by Month</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => `${value} campaigns`}
              />
              <Bar dataKey="campaigns" fill="hsl(var(--chart-1, 220 70% 50%))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignHighlight({
  label,
  campaign,
  variant,
}: {
  label: string;
  campaign: CampaignPerformance;
  variant: 'best' | 'worst';
}) {
  const isBest = variant === 'best';
  return (
    <div
      className={`rounded-lg border p-4 ${
        isBest
          ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
          : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isBest ? (
          <Award className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
        <span
          className={`text-xs font-medium uppercase tracking-wide ${
            isBest ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {label}
        </span>
      </div>
      <p className="text-sm font-medium truncate">{campaign.campaignName}</p>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span>Open: <strong className="text-foreground">{formatPercent(campaign.openRate, true)}</strong></span>
        <span>Click: <strong className="text-foreground">{formatPercent(campaign.clickRate, true)}</strong></span>
        <span>Revenue: <strong className="text-foreground">{formatCurrency(campaign.revenueAttributed)}</strong></span>
      </div>
      {campaign.sendTime && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Sent {new Date(campaign.sendTime).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}

function ROIMetric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${muted ? 'text-muted-foreground' : ''}`}>{value}</p>
    </div>
  );
}
