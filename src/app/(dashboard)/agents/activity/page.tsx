'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AGENTS, type AgentDefinition } from '@/lib/agents/registry';

/* ------------------------------------------------------------------ */
/*  Colour helpers                                                     */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500' },
};

/* ------------------------------------------------------------------ */
/*  Mock activity data                                                 */
/* ------------------------------------------------------------------ */

interface ActivityItem {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  text: string;
  time: string;
  sortOrder: number;
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: 'a1',  agentId: 'agent-finance',      agentName: 'Finance Agent',            agentColor: 'blue',    text: 'Reconciled 8 bank transactions from Barclays',               time: '2 min ago',   sortOrder: 1 },
  { id: 'a2',  agentId: 'agent-marketing',     agentName: 'Marketing Agent',          agentColor: 'purple',  text: 'Published scheduled LinkedIn post',                          time: '5 min ago',   sortOrder: 2 },
  { id: 'a3',  agentId: 'agent-project',       agentName: 'Project Management Agent', agentColor: 'emerald', text: 'Updated Q1 rock progress: 4 of 5 on track',                 time: '10 min ago',  sortOrder: 3 },
  { id: 'a4',  agentId: 'agent-secretarial',   agentName: 'Secretarial Agent',        agentColor: 'rose',    text: 'Checked Companies House for upcoming filing deadlines',      time: '15 min ago',  sortOrder: 4 },
  { id: 'a5',  agentId: 'agent-marketing',     agentName: 'Marketing Agent',          agentColor: 'purple',  text: 'Scored 12 new leads from website form',                      time: '30 min ago',  sortOrder: 5 },
  { id: 'a6',  agentId: 'agent-finance',       agentName: 'Finance Agent',            agentColor: 'blue',    text: 'Generated weekly cash flow forecast',                        time: '1 hr ago',    sortOrder: 6 },
  { id: 'a7',  agentId: 'agent-project',       agentName: 'Project Management Agent', agentColor: 'emerald', text: 'Prepared L10 meeting agenda for Thursday',                   time: '1 hr ago',    sortOrder: 7 },
  { id: 'a8',  agentId: 'agent-strategy',      agentName: 'Strategy Agent',           agentColor: 'amber',   text: 'Identified new market opportunity in fintech vertical',      time: '1 hr ago',    sortOrder: 8 },
  { id: 'a9',  agentId: 'agent-marketing',     agentName: 'Marketing Agent',          agentColor: 'purple',  text: 'Updated SEO keyword rankings report',                        time: '2 hrs ago',   sortOrder: 9 },
  { id: 'a10', agentId: 'agent-secretarial',   agentName: 'Secretarial Agent',        agentColor: 'rose',    text: 'Sent contract expiry reminder: Acme Corp (30 days)',         time: '2 hrs ago',   sortOrder: 10 },
  { id: 'a11', agentId: 'agent-finance',       agentName: 'Finance Agent',            agentColor: 'blue',    text: 'Flagged duplicate vendor invoice #INV-2847',                 time: '3 hrs ago',   sortOrder: 11 },
  { id: 'a12', agentId: 'agent-project',       agentName: 'Project Management Agent', agentColor: 'emerald', text: 'Resolved issue #42: Onboarding flow timing',                 time: '3 hrs ago',   sortOrder: 12 },
  { id: 'a13', agentId: 'agent-marketing',     agentName: 'Marketing Agent',          agentColor: 'purple',  text: 'Detected competitor price change alert',                     time: '4 hrs ago',   sortOrder: 13 },
  { id: 'a14', agentId: 'agent-strategy',      agentName: 'Strategy Agent',           agentColor: 'amber',   text: 'Updated OKR progress for Q1',                                time: '4 hrs ago',   sortOrder: 14 },
  { id: 'a15', agentId: 'agent-secretarial',   agentName: 'Secretarial Agent',        agentColor: 'rose',    text: 'Verified all business licenses are current',                 time: '6 hrs ago',   sortOrder: 15 },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AgentActivityPage() {
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const filtered =
    filterAgent === 'all'
      ? MOCK_ACTIVITIES
      : MOCK_ACTIVITIES.filter((a) => a.agentId === filterAgent);

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/agents" className="hover:underline">AI Agents</Link>
        <span className="mx-1.5">/</span>
        <span>Activity</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1c1b1b' }}>
          Agent Activity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Combined activity feed from all your AI agents.
        </p>
      </div>

      {/* Agent filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterAgent('all')}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            filterAgent === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          All Agents
        </button>
        {AGENTS.map((agent) => {
          const colors = colorMap[agent.color] ?? colorMap.blue;
          return (
            <button
              key={agent.id}
              onClick={() => setFilterAgent(agent.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                filterAgent === agent.id
                  ? cn(colors.bg, colors.text)
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {agent.name}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filterAgent === 'all' ? 'All Activity' : AGENTS.find((a) => a.id === filterAgent)?.name ?? 'Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity found for this agent.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-4">
                {filtered.map((item) => {
                  const colors = colorMap[item.agentColor] ?? colorMap.blue;
                  return (
                    <div key={item.id} className="flex items-start gap-4 relative">
                      {/* Dot */}
                      <div className={cn('relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shrink-0', colors.dot)} />
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', colors.bg, colors.text)}>
                            {item.agentName}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{item.time}</span>
                        </div>
                        <p className="text-sm mt-0.5">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
