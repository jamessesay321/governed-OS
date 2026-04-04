'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Flag,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ─── Types ─── */

interface Challenge {
  id: string;
  page: string;
  metricLabel: string;
  metricValue: string | null;
  period: string | null;
  reason: string;
  expectedValue: string | null;
  severity: 'question' | 'concern' | 'error';
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdBy: string;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface Props {
  challenges: Challenge[];
  role: string;
}

/* ─── Helpers ─── */

const SEVERITY_CONFIG = {
  question: { icon: HelpCircle, label: 'Question', color: 'text-blue-600', bg: 'bg-blue-50' },
  concern: { icon: AlertTriangle, label: 'Concern', color: 'text-amber-600', bg: 'bg-amber-50' },
  error: { icon: AlertCircle, label: 'Error', color: 'text-red-600', bg: 'bg-red-50' },
};

const STATUS_CONFIG = {
  open: { icon: Flag, label: 'Open', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  investigating: { icon: Search, label: 'Investigating', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  resolved: { icon: CheckCircle2, label: 'Resolved', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  dismissed: { icon: XCircle, label: 'Dismissed', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' },
};

const PAGE_LINKS: Record<string, string> = {
  'balance-sheet': '/financials/balance-sheet',
  'income-statement': '/financials/income-statement',
  'cash-flow': '/financials/cash-flow',
  kpi: '/kpi',
  variance: '/variance',
  profitability: '/dashboard/profitability',
  'financial-health': '/dashboard/financial-health',
  'executive-summary': '/dashboard/executive-summary',
  dashboard: '/dashboard',
};

function formatDate(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(isoStr);
}

/* ─── Component ─── */

type FilterStatus = 'all' | 'open' | 'investigating' | 'resolved' | 'dismissed';

export function ReviewQueueClient({ challenges, role }: Props) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const canResolve = ['owner', 'admin', 'advisor'].includes(role);

  const filtered = useMemo(
    () =>
      filterStatus === 'all'
        ? challenges
        : challenges.filter((c) => c.status === filterStatus),
    [challenges, filterStatus],
  );

  // Counts
  const openCount = challenges.filter((c) => c.status === 'open').length;
  const investigatingCount = challenges.filter((c) => c.status === 'investigating').length;
  const resolvedCount = challenges.filter((c) => c.status === 'resolved').length;
  const dismissedCount = challenges.filter((c) => c.status === 'dismissed').length;

  async function handleStatusChange(id: string, status: 'investigating' | 'resolved' | 'dismissed') {
    setUpdating(id);
    try {
      const res = await fetch('/api/challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          resolutionNotes: resolutionNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        // Refresh — in a real app use router.refresh()
        window.location.reload();
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground text-sm">
            Numbers flagged for review by your team
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open', count: openCount, icon: Flag, color: 'text-amber-600' },
          { label: 'Investigating', count: investigatingCount, icon: Search, color: 'text-blue-600' },
          { label: 'Resolved', count: resolvedCount, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Dismissed', count: dismissedCount, icon: XCircle, color: 'text-muted-foreground' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setFilterStatus(card.label.toLowerCase() as FilterStatus)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${card.color}`} />
                  <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'open', 'investigating', 'resolved', 'dismissed'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === status
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {status === 'all' ? `All (${challenges.length})` : `${status.charAt(0).toUpperCase() + status.slice(1)} (${
              status === 'open' ? openCount : status === 'investigating' ? investigatingCount : status === 'resolved' ? resolvedCount : dismissedCount
            })`}
          </button>
        ))}
      </div>

      {/* Challenge list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Flag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filterStatus === 'all'
                ? 'No challenges yet. Use the flag icon on any financial page to challenge a number.'
                : `No ${filterStatus} challenges.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((challenge) => {
            const sevConfig = SEVERITY_CONFIG[challenge.severity];
            const statConfig = STATUS_CONFIG[challenge.status];
            const SevIcon = sevConfig.icon;
            const StatIcon = statConfig.icon;
            const isExpanded = expandedId === challenge.id;
            const pageLink = PAGE_LINKS[challenge.page];

            return (
              <Card key={challenge.id} className="overflow-hidden">
                {/* Main row */}
                <div
                  className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
                >
                  {/* Severity icon */}
                  <div className={`mt-0.5 rounded-full p-1.5 ${sevConfig.bg}`}>
                    <SevIcon className={`h-4 w-4 ${sevConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{challenge.metricLabel}</span>
                      {challenge.metricValue && (
                        <span className="font-mono text-sm text-muted-foreground">{challenge.metricValue}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{challenge.reason}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(challenge.createdAt)}
                      </span>
                      <span>by {challenge.createdBy}</span>
                      {pageLink && (
                        <Link href={pageLink} className="underline hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                          {challenge.page}
                        </Link>
                      )}
                      {challenge.period && <span>{challenge.period}</span>}
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge variant="outline" className={`shrink-0 ${statConfig.color} ${statConfig.border}`}>
                    <StatIcon className="h-3 w-3 mr-1" />
                    {statConfig.label}
                  </Badge>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t px-5 py-4 bg-muted/10 space-y-4">
                    {/* Full reason */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Reason</p>
                      <p className="text-sm">{challenge.reason}</p>
                    </div>

                    {challenge.expectedValue && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Expected Value</p>
                        <p className="text-sm font-mono">{challenge.expectedValue}</p>
                      </div>
                    )}

                    {/* Resolution notes (if resolved) */}
                    {challenge.resolutionNotes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Resolution</p>
                        <p className="text-sm">{challenge.resolutionNotes}</p>
                        {challenge.resolvedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Resolved by {challenge.resolvedBy} on {challenge.resolvedAt ? formatDate(challenge.resolvedAt) : '-'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions (for admins on open/investigating challenges) */}
                    {canResolve && (challenge.status === 'open' || challenge.status === 'investigating') && (
                      <div className="space-y-3 pt-2 border-t">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Resolution notes</label>
                          <textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Explain your findings..."
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          {challenge.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(challenge.id, 'investigating')}
                              disabled={updating === challenge.id}
                            >
                              <Search className="h-3.5 w-3.5 mr-1" />
                              Investigate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(challenge.id, 'resolved')}
                            disabled={updating === challenge.id}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(challenge.id, 'dismissed')}
                            disabled={updating === challenge.id}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
