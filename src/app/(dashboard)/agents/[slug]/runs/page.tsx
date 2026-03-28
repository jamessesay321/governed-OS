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
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface PipelineStep {
  type: string;
  name: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  confidence?: number;
  sourceCitations?: { source: string; reference: string }[];
}

interface AgentRun {
  id: string;
  agent_id: string;
  status: string;
  items_processed: number;
  items_flagged: number;
  confidence: number;
  trust_level: string;
  summary: string;
  steps?: PipelineStep[];
  started_at: string;
  completed_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusIcon(status: string) {
  if (status === 'completed')
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'failed')
    return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === 'needs_review')
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (status === 'running')
    return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
  return <Clock className="h-4 w-4 text-gray-400" />;
}

function trustBadgeClass(level: string): string {
  if (level === 'autonomous') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (level === 'confident') return 'border-blue-300 bg-blue-50 text-blue-700';
  return 'border-amber-300 bg-amber-50 text-amber-700';
}

function stepStatusClass(status: string): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'failed') return 'bg-red-100 text-red-700 border-red-200';
  if (status === 'running') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'skipped') return 'bg-gray-100 text-gray-500 border-gray-200';
  return 'bg-gray-50 text-gray-400 border-gray-200';
}

function computeStepDuration(step: PipelineStep): string {
  if (!step.startedAt || !step.completedAt) return '';
  const ms = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ------------------------------------------------------------------ */
/*  Default pipeline steps (fallback when no steps data)                */
/* ------------------------------------------------------------------ */

const DEFAULT_STEPS: PipelineStep[] = [
  { type: 'input', name: 'Input', status: 'completed' },
  { type: 'process', name: 'Process', status: 'completed' },
  { type: 'logic', name: 'Logic', status: 'completed' },
  { type: 'output', name: 'Output', status: 'completed' },
];

/* ------------------------------------------------------------------ */
/*  Expandable run row                                                  */
/* ------------------------------------------------------------------ */

function RunRow({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(false);
  const steps = run.steps ?? DEFAULT_STEPS;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center text-sm">
          {/* Date */}
          <div className="flex items-center gap-1.5">
            {statusIcon(run.status)}
            <span className="text-xs text-muted-foreground">
              {formatDate(run.completed_at)}
            </span>
          </div>

          {/* Status */}
          <div>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] capitalize',
                run.status === 'completed'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : run.status === 'failed'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700',
              )}
            >
              {run.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Items processed */}
          <div className="text-xs text-muted-foreground hidden sm:block">
            {run.items_processed ?? 0} processed
          </div>

          {/* Items flagged */}
          <div className="text-xs text-muted-foreground hidden sm:block">
            {run.items_flagged ?? 0} flagged
          </div>

          {/* Confidence */}
          <div className="text-xs text-muted-foreground hidden sm:block">
            {((run.confidence ?? 0) * 100).toFixed(1)}% confidence
          </div>

          {/* Trust level */}
          <div className="hidden sm:block">
            <Badge variant="outline" className={cn('text-[10px] capitalize', trustBadgeClass(run.trust_level ?? 'guided'))}>
              {run.trust_level ?? 'Guided'}
            </Badge>
          </div>
        </div>
      </button>

      {/* Expanded: pipeline steps */}
      {expanded && (
        <div className="border-t bg-muted/10 px-4 py-4">
          {run.summary && (
            <p className="text-xs text-muted-foreground mb-4">{run.summary}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold capitalize">{step.name}</span>
                  <Badge variant="outline" className={cn('text-[10px]', stepStatusClass(step.status))}>
                    {step.status}
                  </Badge>
                </div>

                {/* Duration */}
                {computeStepDuration(step) && (
                  <p className="text-[10px] text-muted-foreground">
                    Duration: {computeStepDuration(step)}
                  </p>
                )}

                {/* Confidence */}
                {step.confidence !== undefined && (
                  <p className="text-[10px] text-muted-foreground">
                    Confidence: {(step.confidence * 100).toFixed(1)}%
                  </p>
                )}

                {/* Source citations */}
                {step.sourceCitations && step.sourceCitations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {step.sourceCitations.map((cite, ci) => (
                      <Badge
                        key={ci}
                        variant="outline"
                        className="text-[9px] border-gray-200 bg-gray-50 text-gray-600"
                      >
                        {cite.source}: {cite.reference}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export default function AgentRunsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const agent = getAgentBySlug(slug);
  const { orgId } = useUser();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  if (!agent) {
    notFound();
  }

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/runs/${orgId}?agentId=${agent.id}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs ?? []);
      }
    } catch {
      // Empty state
    } finally {
      setLoading(false);
    }
  }, [orgId, agent.id]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/agents" className="hover:underline">AI Agents</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/agents/${slug}`} className="hover:underline">{agent.name}</Link>
        <span className="mx-1.5">/</span>
        <span>Run History</span>
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
              tab.label === 'Run History'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">{agent.name} - Run History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all past runs and drill into the 4-step pipeline for each.
        </p>
      </div>

      {/* Runs list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg border animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No runs recorded yet for {agent.name}.
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Run Agent Now
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
