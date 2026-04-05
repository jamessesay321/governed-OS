'use client';

/**
 * Key Actions Daily Briefing — 4-section 2x2 grid
 *
 * Revenue | Cash
 * Costs   | Risk
 *
 * Each section shows AI-generated insights with deep links
 * to the relevant pages.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InPageLink } from '@/components/shared/in-page-link';
import { RedundantIndicator } from '@/components/data-primitives/redundant-indicator';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Wallet,
  Receipt,
  ShieldAlert,
  RefreshCw,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

/* ─── Types ─── */

interface SourceRef {
  page: string;
  params?: Record<string, string>;
}

interface Insight {
  text: string;
  source_ref: SourceRef;
}

interface BriefingSection {
  title: string;
  insights: Insight[];
  trend?: 'up' | 'down' | 'stable';
  highlight_value?: string;
}

interface KeyActionsBriefing {
  revenue: BriefingSection;
  cash: BriefingSection;
  costs: BriefingSection;
  risk: BriefingSection;
  generatedAt: string;
  cached: boolean;
}

/* ─── Section config ─── */

const SECTION_CONFIG = {
  revenue: {
    icon: DollarSign,
    iconColor: 'text-emerald-500',
    borderColor: 'border-l-emerald-500',
    label: 'Revenue',
  },
  cash: {
    icon: Wallet,
    iconColor: 'text-blue-500',
    borderColor: 'border-l-blue-500',
    label: 'Cash',
  },
  costs: {
    icon: Receipt,
    iconColor: 'text-amber-500',
    borderColor: 'border-l-amber-500',
    label: 'Costs',
  },
  risk: {
    icon: ShieldAlert,
    iconColor: 'text-red-500',
    borderColor: 'border-l-red-500',
    label: 'Risk',
  },
} as const;

/* ─── Trend icon ─── */

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

/* ─── Build href with params ─── */

function buildHref(ref: SourceRef): string {
  let href = ref.page;
  if (ref.params && Object.keys(ref.params).length > 0) {
    const search = new URLSearchParams(ref.params).toString();
    href += `?${search}`;
  }
  return href;
}

/* ─── Section Card ─── */

function SectionCard({
  sectionKey,
  section,
}: {
  sectionKey: keyof typeof SECTION_CONFIG;
  section: BriefingSection;
}) {
  const config = SECTION_CONFIG[sectionKey];
  const Icon = config.icon;

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            <CardTitle className="text-base">{section.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {section.highlight_value && (
              <span className="text-sm font-bold">{section.highlight_value}</span>
            )}
            <TrendIcon trend={section.trend} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {section.insights.map((insight, idx) => (
            <li key={idx} className="group">
              <Link
                href={buildHref(insight.source_ref)}
                className="block rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted"
              >
                <p className="text-sm text-foreground leading-relaxed">
                  {insight.text}
                </p>
                <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 inline-flex items-center gap-1">
                  View details &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ─── Skeleton ─── */

function SectionSkeleton() {
  return (
    <Card className="border-l-4 border-l-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="h-5 w-24 rounded bg-muted animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${85 - i * 10}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Component ─── */

interface KeyActionsClientProps {
  orgId: string;
}

export function KeyActionsClient({ orgId }: KeyActionsClientProps) {
  const [data, setData] = useState<KeyActionsBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const url = `/api/briefing/key-actions/${orgId}${refresh ? '?refresh=true' : ''}`;
        const res = await fetch(url);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load briefing');
        }

        const json = await res.json();
        setData(json as KeyActionsBriefing);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Key Actions
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your AI-powered daily briefing — what matters most today
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data?.generatedAt && (
            <span className="text-xs text-muted-foreground">
              Generated{' '}
              {new Date(data.generatedAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {data.cached && ' (cached)'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBriefing(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Briefing
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <RedundantIndicator status="negative" label={error} />
              <Button variant="outline" size="sm" onClick={() => fetchBriefing()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2x2 Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <SectionCard sectionKey="revenue" section={data.revenue} />
          <SectionCard sectionKey="cash" section={data.cash} />
          <SectionCard sectionKey="costs" section={data.costs} />
          <SectionCard sectionKey="risk" section={data.risk} />
        </div>
      ) : null}

      {/* Quick links */}
      {!loading && data && (
        <div className="flex flex-wrap gap-3 pt-2">
          <InPageLink href="/financials/income-statement" label="Income Statement" size="md" />
          <InPageLink href="/financials/cash-flow" label="Cash Flow" size="md" />
          <InPageLink href="/variance" label="Variance Analysis" size="md" />
          <InPageLink href="/intelligence/anomalies" label="Anomalies" size="md" />
          <InPageLink href="/playbook" label="Playbook" size="md" />
        </div>
      )}
    </div>
  );
}
