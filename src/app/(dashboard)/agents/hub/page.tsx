'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/user-context';
import {
  AGENTS,
  type AgentDefinition,
} from '@/lib/agents/registry';
import {
  Play,
  Settings,
  ClipboardList,
  Clock,
  AlertCircle,
  Activity,
  CheckCircle2,
  XCircle,
  Flag,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface AgentRun {
  id: string;
  agent_id: string;
  org_id: string;
  status: string;
  items_processed: number;
  items_flagged: number;
  confidence: number;
  trust_level: string;
  summary: string;
  started_at: string;
  completed_at: string;
}

interface AuditEntry {
  id: string;
  agent_id: string;
  action: string;
  detail: string;
  confidence: number;
  decision: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Trust level badge                                                   */
/* ------------------------------------------------------------------ */

function TrustBadge({ level }: { level: string }) {
  if (level === 'autonomous') {
    return (
      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]">
        Autonomous
      </Badge>
    );
  }
  if (level === 'confident') {
    return (
      <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-[10px]">
        Confident
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
      Guided
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Decision badge                                                      */
/* ------------------------------------------------------------------ */

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === 'auto_approved') {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px]">
        <CheckCircle2 className="h-3 w-3 mr-0.5" />
        Auto-approved
      </Badge>
    );
  }
  if (decision === 'flagged') {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600 text-[10px]">
        <Flag className="h-3 w-3 mr-0.5" />
        Flagged
      </Badge>
    );
  }
  if (decision === 'escalated') {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600 text-[10px]">
        <AlertCircle className="h-3 w-3 mr-0.5" />
        Escalated
      </Badge>
    );
  }
  if (decision === 'user_approved') {
    return (
      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600 text-[10px]">
        <CheckCircle2 className="h-3 w-3 mr-0.5" />
        User approved
      </Badge>
    );
  }
  if (decision === 'user_rejected') {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600 text-[10px]">
        <XCircle className="h-3 w-3 mr-0.5" />
        Rejected
      </Badge>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Colour map                                                          */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, { border: string; bg: string; text: string; bgStrong: string }> = {
  teal:    { border: 'border-l-teal-500',    bg: 'bg-teal-50',    text: 'text-teal-700',    bgStrong: 'bg-teal-500' },
  blue:    { border: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    bgStrong: 'bg-blue-500' },
  purple:  { border: 'border-l-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-700',  bgStrong: 'bg-purple-500' },
  emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', bgStrong: 'bg-emerald-500' },
  amber:   { border: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   bgStrong: 'bg-amber-500' },
  rose:    { border: 'border-l-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700',    bgStrong: 'bg-rose-500' },
  indigo:  { border: 'border-l-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  bgStrong: 'bg-indigo-500' },
  orange:  { border: 'border-l-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700',  bgStrong: 'bg-orange-500' },
  pink:    { border: 'border-l-pink-500',    bg: 'bg-pink-50',    text: 'text-pink-700',    bgStrong: 'bg-pink-500' },
  cyan:    { border: 'border-l-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700',    bgStrong: 'bg-cyan-500' },
  violet:  { border: 'border-l-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700',  bgStrong: 'bg-violet-500' },
  lime:    { border: 'border-l-lime-500',    bg: 'bg-lime-50',    text: 'text-lime-700',    bgStrong: 'bg-lime-500' },
  slate:   { border: 'border-l-slate-500',   bg: 'bg-slate-50',   text: 'text-slate-700',   bgStrong: 'bg-slate-500' },
};

/* ------------------------------------------------------------------ */
/*  Filter tabs                                                         */
/* ------------------------------------------------------------------ */

type FilterTab = 'all' | 'active' | 'needs_review' | 'available';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'available', label: 'Available' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function agentDisplayName(agentId: string): string {
  const agent = AGENTS.find((a) => a.id === agentId);
  return agent?.name ?? agentId;
}

/* ------------------------------------------------------------------ */
/*  Agent Card (Hub style)                                              */
/* ------------------------------------------------------------------ */

function HubAgentCard({
  agent,
  latestRun,
  stats,
  flaggedCount,
}: {
  agent: AgentDefinition;
  latestRun?: AgentRun;
  stats: { itemsProcessed: number; accuracy: number; flagged: number };
  flaggedCount: number;
}) {
  const colors = colorMap[agent.color] ?? colorMap.blue;
  const trustLevel = latestRun?.trust_level ?? 'guided';
  const isRunning = latestRun?.status === 'running';

  return (
    <Card className={cn('flex flex-col border-l-4 overflow-hidden relative', colors.border)}>
      {/* Flagged count badge */}
      {flaggedCount > 0 && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {flaggedCount}
          </span>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-white shrink-0', colors.bgStrong)}>
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/agents/${agent.slug}`} className="hover:underline">
              <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <TrustBadge level={trustLevel} />
              {isRunning && (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] animate-pulse">
                  Running
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        {/* Stats row */}
        <div className="text-xs text-muted-foreground">
          <span>{stats.itemsProcessed.toLocaleString()} items processed</span>
          <span className="mx-1">|</span>
          <span>{(stats.accuracy * 100).toFixed(1)}% accuracy</span>
          <span className="mx-1">|</span>
          <span>{stats.flagged} flagged</span>
        </div>

        {/* Last run */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Last run:{' '}
            {latestRun?.completed_at ? timeAgo(latestRun.completed_at) : 'Never'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-auto pt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="default" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700">
            <Play className="h-3 w-3 mr-1" />
            Run Now
          </Button>
          <Link href={`/agents/${agent.slug}/runs`}>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <ClipboardList className="h-3 w-3 mr-1" />
              Audit Trail
            </Button>
          </Link>
          <Link href={`/agents/${agent.slug}/settings`}>
            <Button size="sm" variant="ghost" className="text-xs h-7">
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function AgentHubPage() {
  const { orgId } = useUser();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, auditRes] = await Promise.allSettled([
        fetch(`/api/agents/runs/${orgId}?limit=100`),
        fetch(`/api/agents/audit/${orgId}?limit=10`),
      ]);

      if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
        const data = await runsRes.value.json();
        setRuns(data.runs ?? []);
      }

      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const data = await auditRes.value.json();
        setAuditTrail(data.trail ?? []);
      }
    } catch {
      // Gracefully fall back to empty state
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute per-agent stats from runs
  function getAgentStats(agentId: string) {
    const agentRuns = runs.filter((r) => r.agent_id === agentId);
    const totalProcessed = agentRuns.reduce((sum, r) => sum + ((r.items_processed as number) ?? 0), 0);
    const totalFlagged = agentRuns.reduce((sum, r) => sum + ((r.items_flagged as number) ?? 0), 0);
    const avgConfidence = agentRuns.length > 0
      ? agentRuns.reduce((sum, r) => sum + ((r.confidence as number) ?? 0), 0) / agentRuns.length
      : 0;
    return {
      itemsProcessed: totalProcessed,
      accuracy: avgConfidence || 0.95,
      flagged: totalFlagged,
    };
  }

  function getLatestRun(agentId: string): AgentRun | undefined {
    return runs.find((r) => r.agent_id === agentId);
  }

  function getFlaggedCount(agentId: string): number {
    return auditTrail.filter(
      (e) => e.agent_id === agentId && (e.decision === 'flagged' || e.decision === 'escalated'),
    ).length;
  }

  // Filter agents
  const filteredAgents = AGENTS.filter((agent) => {
    if (filter === 'all') return true;
    if (filter === 'active') return agent.status === 'active';
    if (filter === 'needs_review') return getFlaggedCount(agent.id) > 0;
    if (filter === 'available') return agent.status === 'available' || agent.status === 'beta';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agent Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor, run, and manage your AI agents from one workspace.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 shrink-0 w-full sm:w-auto">
          <Play className="h-4 w-4 mr-1.5" />
          Run All Due
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              filter === tab.value
                ? 'bg-emerald-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agent cards */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="h-52 animate-pulse bg-muted/30" />
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No agents match this filter.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredAgents.map((agent) => (
                <HubAgentCard
                  key={agent.id}
                  agent={agent}
                  latestRun={getLatestRun(agent.id)}
                  stats={getAgentStats(agent.id)}
                  flaggedCount={getFlaggedCount(agent.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditTrail.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No recent agent activity. Run an agent to see actions here.
                </p>
              ) : (
                auditTrail.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5 pb-3 border-b last:border-0 last:pb-0">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs">
                        <span className="font-medium">{agentDisplayName(entry.agent_id)}</span>
                        <span className="text-muted-foreground"> {entry.detail}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {entry.created_at ? timeAgo(entry.created_at) : ''}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-gray-200 bg-gray-50 text-gray-600"
                        >
                          {((entry.confidence ?? 0) * 100).toFixed(0)}% confidence
                        </Badge>
                        <DecisionBadge decision={entry.decision} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
