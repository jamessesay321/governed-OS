'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/user-context';
import { getAgentBySlug } from '@/lib/agents/registry';
import { notFound } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  PenLine,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface FlaggedItem {
  id: string;
  agent_id: string;
  run_id: string;
  action: string;
  detail: string;
  source_citations: { source: string; reference: string }[];
  confidence: number;
  decision: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-emerald-600';
  if (confidence >= 0.7) return 'text-amber-600';
  return 'text-red-600';
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.85) return 'bg-emerald-50 border-emerald-200';
  if (confidence >= 0.7) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

/* ------------------------------------------------------------------ */
/*  Review item card                                                    */
/* ------------------------------------------------------------------ */

function ReviewItemCard({
  item,
  onApprove,
  onReject,
  onOverride,
}: {
  item: FlaggedItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOverride: (id: string) => void;
}) {
  const [resolved, setResolved] = useState<'approved' | 'rejected' | 'overridden' | null>(null);

  const handleApprove = () => {
    setResolved('approved');
    onApprove(item.id);
  };

  const handleReject = () => {
    setResolved('rejected');
    onReject(item.id);
  };

  const handleOverride = () => {
    setResolved('overridden');
    onOverride(item.id);
  };

  return (
    <Card className={cn('transition-all', resolved && 'opacity-60')}>
      <CardContent className="pt-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDate(item.created_at)}
          </span>
        </div>

        {/* Confidence + citations */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              confidenceBg(item.confidence),
            )}
          >
            <span className={confidenceColor(item.confidence)}>
              {(item.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>

          {item.source_citations?.map((cite, i) => (
            <Badge key={i} variant="outline" className="text-[10px] border-gray-200 bg-gray-50 text-gray-600">
              {cite.source}: {cite.reference}
            </Badge>
          ))}
        </div>

        {/* Resolution status or action buttons */}
        {resolved ? (
          <div className="flex items-center gap-2 pt-1">
            {resolved === 'approved' && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approved - pattern reinforced
              </Badge>
            )}
            {resolved === 'rejected' && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                Rejected
              </Badge>
            )}
            {resolved === 'overridden' && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                <PenLine className="h-3 w-3 mr-1" />
                Overridden - pattern corrected
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleReject}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={handleOverride}
            >
              <PenLine className="h-3 w-3 mr-1" />
              Override
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export default function AgentReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const agent = getAgentBySlug(slug);
  const { orgId } = useUser();
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);

  if (!agent) {
    notFound();
  }

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/agents/audit/${orgId}?agentId=${agent.id}&limit=50`,
      );
      if (res.ok) {
        const data = await res.json();
        // Filter to only flagged/escalated items
        const trail = (data.trail ?? []) as FlaggedItem[];
        setItems(
          trail.filter(
            (e) => e.decision === 'flagged' || e.decision === 'escalated',
          ),
        );
      }
    } catch {
      // Empty state
    } finally {
      setLoading(false);
    }
  }, [orgId, agent.id]);

  useEffect(() => {
    fetchFlagged();
  }, [fetchFlagged]);

  // UI-only handlers (would call memory endpoints in production)
  const handleApprove = (id: string) => {
    // In production: POST to /api/agents/memory/reinforce
    console.log('[review] Approve + reinforce memory for', id);
  };

  const handleReject = (id: string) => {
    // In production: POST to update audit decision
    console.log('[review] Reject item', id);
  };

  const handleOverride = (id: string) => {
    // In production: POST to /api/agents/memory/correct
    console.log('[review] Override + correct memory for', id);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/agents" className="hover:underline">AI Agents</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/agents/${slug}`} className="hover:underline">{agent.name}</Link>
        <span className="mx-1.5">/</span>
        <span>Review Queue</span>
      </nav>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: `/agents/${slug}`, label: 'Overview' },
          { href: `/agents/${slug}/runs`, label: 'Run History' },
          { href: `/agents/${slug}/review`, label: 'Review Queue' },
          { href: `/agents/${slug}/settings`, label: 'Settings' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab.label === 'Review Queue'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {agent.name} - Review Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Items the agent flagged for human review. Approve to reinforce the pattern, or override to correct it.
          </p>
        </div>
        {items.length > 0 && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 shrink-0">
            {items.length} item{items.length !== 1 ? 's' : ''} pending
          </Badge>
        )}
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground mt-1">
            No items need review for {agent.name}. Check back after the next agent run.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ReviewItemCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              onOverride={handleOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}
