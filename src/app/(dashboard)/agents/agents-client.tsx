'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AGENTS,
  BUNDLE_PRICE,
  BUNDLE_SAVINGS,
  getFreeAgents,
  getPaidAgents,
  type AgentDefinition,
} from '@/lib/agents/registry';

/* ------------------------------------------------------------------ */
/*  Color mapping — Tailwind border / bg / text for each agent colour  */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, { border: string; bg: string; text: string; badgeBg: string }> = {
  teal:    { border: 'border-l-teal-500',    bg: 'bg-teal-50',    text: 'text-teal-700',    badgeBg: 'bg-teal-100' },
  blue:    { border: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    badgeBg: 'bg-blue-100' },
  purple:  { border: 'border-l-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-700',  badgeBg: 'bg-purple-100' },
  emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', badgeBg: 'bg-emerald-100' },
  amber:   { border: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   badgeBg: 'bg-amber-100' },
  rose:    { border: 'border-l-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700',    badgeBg: 'bg-rose-100' },
};

/* ------------------------------------------------------------------ */
/*  SVG icons for each agent                                           */
/* ------------------------------------------------------------------ */

const agentIcons: Record<string, React.ReactNode> = {
  PoundSterling: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5a4 4 0 00-8 0v3H5v2h2v4H5v2h14v-2h-4v-4h3v-2h-3V8a4 4 0 00-4-4zM9 8V5a2 2 0 114 0v3H9zm0 2v4h4v-4H9z" />
    </svg>
  ),
  Megaphone: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  Target: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Telescope: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 21l4-8m4 0l4 8M10 13l2-10 6 8-4 2-4-0z" />
    </svg>
  ),
  Stamp: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Wrench: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: AgentDefinition['status'] }) {
  if (status === 'active') {
    return (
      <Badge variant="outline" className="border-teal-300 bg-teal-50 text-teal-700 text-xs">
        Active
      </Badge>
    );
  }
  if (status === 'available') {
    return (
      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">
        Available
      </Badge>
    );
  }
  if (status === 'beta') {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">
        Beta
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-500 text-xs">
      Coming Soon
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA button per status                                              */
/* ------------------------------------------------------------------ */

function AgentCTA({ agent }: { agent: AgentDefinition }) {
  const colors = colorMap[agent.color] ?? colorMap.blue;

  if (agent.status === 'available') {
    return (
      <Button size="sm" className="w-full">
        Activate Agent
      </Button>
    );
  }
  if (agent.status === 'beta') {
    return (
      <Button size="sm" variant="outline" className="w-full">
        Join Beta
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" className={cn('w-full', colors.text)}>
      Enquire
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Card                                                         */
/* ------------------------------------------------------------------ */

function AgentCard({ agent }: { agent: AgentDefinition }) {
  const colors = colorMap[agent.color] ?? colorMap.blue;

  return (
    <Card className={cn('flex flex-col border-l-4 overflow-hidden', colors.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colors.bg, colors.text)}>
              {agentIcons[agent.icon] ?? agentIcons.PoundSterling}
            </div>
            <div>
              <Link href={`/agents/${agent.slug}`} className="hover:underline">
                <CardTitle className="text-base">{agent.name}</CardTitle>
              </Link>
              <p className="text-xs text-muted-foreground">{agent.tagline}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {agent.isFree ? (
              <Badge className="bg-emerald-100 text-emerald-800 text-xs">Free Forever</Badge>
            ) : (
              <span className={cn('text-sm font-bold', colors.text)}>
                £{agent.monthlyPrice}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </span>
            )}
            <StatusBadge status={agent.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        {/* Capabilities */}
        <ul className="space-y-1.5">
          {agent.capabilities.map((cap) => (
            <li key={cap} className="flex items-start gap-2 text-xs text-muted-foreground">
              <svg
                className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', colors.text)}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {cap}
            </li>
          ))}
        </ul>

        {/* Sample metrics */}
        {agent.metrics && agent.metrics.length > 0 && (
          <div className={cn('rounded-lg p-3', colors.bg)}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
              Sample output
            </p>
            <div className="grid grid-cols-3 gap-2">
              {agent.metrics.map((m) => (
                <div key={m.label}>
                  <p className={cn('text-sm font-semibold', colors.text)}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <AgentCTA agent={agent} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function AgentsClient({ orgId }: { orgId: string }) {
  const freeAgents = getFreeAgents();
  const paidAgents = getPaidAgents();

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Hero */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          AI Agents
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
          Autonomous agents that actively manage your business operations. Each agent works around
          the clock — monitoring, executing, and reporting — so your team can focus on what matters.
        </p>
      </div>

      {/* Included with your account */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Included with Your Account</h2>
          <p className="text-sm text-muted-foreground">Free forever — your always-on data guardian</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {freeAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* Bundle callout */}
      <div className="rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Bundle &amp; Save — All {paidAgents.length} specialist agents for{' '}
            <span className="text-lg font-bold">£{BUNDLE_PRICE}/month</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Save £{BUNDLE_SAVINGS} compared to purchasing individually. Cancel anytime.
          </p>
        </div>
        <Button size="sm" className="shrink-0 w-full sm:w-auto" disabled>
          Express Interest
        </Button>
      </div>

      {/* Specialist Agents */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Specialist Agents</h2>
          <p className="text-sm text-muted-foreground">Dedicated AI advisors for finance, marketing, operations, legal, strategy, and HR</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {paidAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* What can agents do? */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What can agents do?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#1c1b1b' }}>
                Active Agents
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlike passive dashboards and reports, agents <em>actively</em> take action on your
                behalf. They monitor data streams, trigger workflows, send alerts, prepare
                documents, and execute routine tasks — all without you lifting a finger.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#1c1b1b' }}>
                Passive Tools
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your existing dashboard, reports, and modules are powerful but reactive — they
                show you data when you look. Agents complement these tools by working in the
                background 24/7, turning insights into action automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity link */}
      <div className="flex justify-center">
        <Link href="/agents/activity">
          <Button variant="outline" size="sm">
            View All Agent Activity
          </Button>
        </Link>
      </div>
    </div>
  );
}
