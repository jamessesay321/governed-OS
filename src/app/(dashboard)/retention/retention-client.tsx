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
  BarChart3,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatting/currency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignMetrics {
  campaignId: string;
  recipientCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  revenueAttributed: number;
  conversionRate: number;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  sendTime: string | null;
  createdAt: string;
  metrics: CampaignMetrics | null;
}

interface FlowRow {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  created: string;
}

interface KlaviyoSummary {
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalRevenue: number;
  activeFlowCount: number;
  totalFlowCount: number;
}

interface KlaviyoData {
  connected: boolean;
  summary: KlaviyoSummary;
  campaigns: CampaignRow[];
  flows: FlowRow[];
}

type Props = {
  orgId: string;
  klaviyoConfigured: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    sent: 'bg-emerald-50 text-emerald-700',
    draft: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-red-50 text-red-600',
    live: 'bg-emerald-50 text-emerald-700',
    manual: 'bg-amber-50 text-amber-700',
  };
  const c = colors[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RetentionClient({ orgId, klaviyoConfigured }: Props) {
  const [data, setData] = useState<KlaviyoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/klaviyo?limit=20');
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to load Klaviyo data');
        return;
      }

      if (!json.connected) {
        // API key not set on server
        setData(null);
        return;
      }

      setData(json as KlaviyoData);
    } catch {
      setError('Network error fetching Klaviyo data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (klaviyoConfigured) {
      fetchData();
    }
  }, [klaviyoConfigured, fetchData]);

  // -------------------------------------------------------------------------
  // Not connected state
  // -------------------------------------------------------------------------

  if (!klaviyoConfigured) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Email & Retention
          </h1>
          <p className="mt-1 text-gray-500">
            Connect Klaviyo to track email campaign performance, flows, and subscriber retention.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-50">
            <Mail className="h-7 w-7 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Connect Klaviyo
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-gray-500">
            Add your Klaviyo private API key to pull campaign analytics, flow performance,
            and subscriber data into Grove.
          </p>
          <Link
            href="/integrations"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
          >
            Connect Klaviyo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Email & Retention
          </h1>
          <p className="mt-1 text-gray-500">Loading Klaviyo data...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Email & Retention
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 py-12 shadow-sm">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Connected with data
  // -------------------------------------------------------------------------

  const summary = data?.summary;
  const campaigns = data?.campaigns ?? [];
  const flows = data?.flows ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Email & Retention
          </h1>
          <p className="mt-1 text-gray-500">
            Klaviyo campaign performance and subscriber retention overview.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Mail className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Avg Open Rate"
          value={formatPercent(summary?.avgOpenRate ?? 0, true)}
          subtext={`${summary?.totalSent?.toLocaleString() ?? 0} emails sent`}
        />
        <SummaryCard
          icon={<MousePointerClick className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          label="Avg Click Rate"
          value={formatPercent(summary?.avgClickRate ?? 0, true)}
          subtext={`Across ${summary?.totalCampaigns ?? 0} campaigns`}
        />
        <SummaryCard
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Revenue Attributed"
          value={formatCurrency(summary?.totalRevenue ?? 0)}
          subtext="From email campaigns"
        />
        <SummaryCard
          icon={<Zap className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          label="Active Flows"
          value={String(summary?.activeFlowCount ?? 0)}
          subtext={`of ${summary?.totalFlowCount ?? 0} total flows`}
        />
      </div>

      {/* Campaign Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
          </div>
          <span className="text-sm text-gray-500">
            Showing {campaigns.length} of {summary?.totalCampaigns ?? 0}
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No campaigns found</p>
            <p className="mt-1 text-sm text-gray-400">
              Create your first campaign in Klaviyo to see data here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Campaign</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Sent</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Open Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Click Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 max-w-[240px] truncate">
                      {campaign.name}
                    </td>
                    <td className="px-4 py-3">{statusBadge(campaign.status)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {campaign.metrics?.recipientCount?.toLocaleString() ?? '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {campaign.metrics ? formatPercent(campaign.metrics.openRate, true) : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {campaign.metrics ? formatPercent(campaign.metrics.clickRate, true) : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {campaign.metrics
                        ? formatCurrency(campaign.metrics.revenueAttributed)
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatDate(campaign.sendTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Flow Performance */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Flow Overview</h2>
          </div>
          <span className="text-sm text-gray-500">{flows.length} flows</span>
        </div>

        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No flows configured</p>
            <p className="mt-1 text-sm text-gray-400">
              Set up automated flows in Klaviyo to see them here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <Zap className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{flow.name}</p>
                    <p className="text-xs text-gray-500">
                      Trigger: {flow.triggerType?.replace(/_/g, ' ') ?? 'unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(flow.status)}
                  <span className="text-xs text-gray-400">
                    {formatDate(flow.created)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscriber Growth Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Subscriber Growth</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <TrendingUp className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">
            Subscriber growth chart coming soon
          </p>
          <p className="mt-1 max-w-sm text-sm text-gray-400">
            This will show subscriber acquisition over time, segmented by list and source,
            once historical data syncing is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  iconBg,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold tracking-tight text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{subtext}</p>
        </div>
      </div>
    </div>
  );
}
