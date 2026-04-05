'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sunrise,
  ArrowUpDown,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

/* ─── Types ─── */

interface BriefingLink {
  label: string;
  href: string;
}

interface BriefingSection {
  title: string;
  icon: string;
  content: string;
  links: BriefingLink[];
}

interface BriefingData {
  sections: BriefingSection[];
  generatedAt: string;
  period: string | null;
}

interface DailyBriefingProps {
  orgId: string;
  period: string;
}

/* ─── Icon mapping ─── */

const ICON_MAP: Record<string, typeof Sunrise> = {
  Sunrise,
  ArrowUpDown,
  AlertCircle,
  Lightbulb,
};

const ICON_COLORS: Record<string, string> = {
  Sunrise: 'text-amber-500',
  ArrowUpDown: 'text-blue-500',
  AlertCircle: 'text-red-500',
  Lightbulb: 'text-emerald-500',
};

/* ─── Greeting helper ─── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── Section Card ─── */

function BriefingSectionCard({ section }: { section: BriefingSection }) {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = ICON_MAP[section.icon] ?? Sparkles;
  const iconColor = ICON_COLORS[section.icon] ?? 'text-gray-500';

  return (
    <div className="rounded-lg border border-gray-100 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <IconComponent className={`h-4 w-4 shrink-0 ${iconColor}`} />
        <span className="flex-1 text-sm font-semibold text-gray-900">
          {section.title}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-sm leading-relaxed text-gray-700">
            {section.content}
          </p>
          {section.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton loader ─── */

function BriefingSkeleton() {
  return (
    <Card className="border-l-4 border-l-amber-400">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Component ─── */

export function DailyBriefing({ orgId, period }: DailyBriefingProps) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | false>(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBriefing = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(false);

      try {
        const res = await fetch(
          `/api/briefing/${orgId}?period=${period}`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          if (res.status === 429) {
            setError('rate_limited');
          } else if (res.status === 402) {
            setError('budget_exceeded');
          } else if (res.status === 401 || res.status === 403) {
            setError('auth_error');
          } else {
            setError('generic');
          }
        }
      } catch {
        setError('generic');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, period]
  );

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  if (loading) {
    return <BriefingSkeleton />;
  }

  if (error || !data) {
    return (
      <Card className="border-l-4 border-l-amber-400">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Daily briefing unavailable — {error === 'rate_limited' ? 'too many requests, try again shortly' : error === 'budget_exceeded' ? 'monthly AI budget reached' : error === 'auth_error' ? 'authentication issue' : 'could not load briefing'}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchBriefing(false)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-amber-400">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">
              {getGreeting()} &mdash; Your Daily Briefing
            </CardTitle>
          </div>
          <button
            type="button"
            onClick={() => fetchBriefing(true)}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
        {data.period && (
          <p className="text-xs text-muted-foreground">
            Period: {data.period}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.sections.map((section) => (
            <BriefingSectionCard key={section.title} section={section} />
          ))}
        </div>
        {data.generatedAt && (
          <p className="mt-3 text-[10px] text-muted-foreground">
            Generated{' '}
            {new Date(data.generatedAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
