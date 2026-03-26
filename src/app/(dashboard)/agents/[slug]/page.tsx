'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAgentBySlug, type AgentDefinition } from '@/lib/agents/registry';

/* ------------------------------------------------------------------ */
/*  Colour helpers                                                     */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, { border: string; bg: string; text: string; bgStrong: string }> = {
  blue:    { border: 'border-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    bgStrong: 'bg-blue-500' },
  purple:  { border: 'border-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-700',  bgStrong: 'bg-purple-500' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', bgStrong: 'bg-emerald-500' },
  amber:   { border: 'border-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   bgStrong: 'bg-amber-500' },
  rose:    { border: 'border-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700',    bgStrong: 'bg-rose-500' },
};

/* ------------------------------------------------------------------ */
/*  Icons (reused from agents-client)                                  */
/* ------------------------------------------------------------------ */

const agentIcons: Record<string, React.ReactNode> = {
  PoundSterling: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5a4 4 0 00-8 0v3H5v2h2v4H5v2h14v-2h-4v-4h3v-2h-3V8a4 4 0 00-4-4zM9 8V5a2 2 0 114 0v3H9zm0 2v4h4v-4H9z" />
    </svg>
  ),
  Megaphone: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  Target: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Telescope: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 21l4-8m4 0l4 8M10 13l2-10 6 8-4 2-4-0z" />
    </svg>
  ),
  Stamp: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Mock activity feed                                                 */
/* ------------------------------------------------------------------ */

function getMockActivity(agent: AgentDefinition): { time: string; text: string }[] {
  const activityBySlug: Record<string, { time: string; text: string }[]> = {
    finance: [
      { time: '2 min ago', text: 'Reconciled 8 bank transactions from Barclays' },
      { time: '1 hr ago', text: 'Generated weekly cash flow forecast' },
      { time: '3 hrs ago', text: 'Flagged duplicate vendor invoice #INV-2847' },
      { time: '6 hrs ago', text: 'Prepared VAT return summary for Q1' },
      { time: 'Yesterday', text: 'Completed month-end close checklist (Feb)' },
    ],
    marketing: [
      { time: '5 min ago', text: 'Published scheduled LinkedIn post' },
      { time: '30 min ago', text: 'Scored 12 new leads from website form' },
      { time: '2 hrs ago', text: 'Updated SEO keyword rankings report' },
      { time: '4 hrs ago', text: 'Detected competitor price change alert' },
      { time: 'Yesterday', text: 'Sent weekly email newsletter to 2,400 subscribers' },
    ],
    'project-management': [
      { time: '10 min ago', text: 'Updated Q1 rock progress: 4 of 5 on track' },
      { time: '1 hr ago', text: 'Prepared L10 meeting agenda for Thursday' },
      { time: '3 hrs ago', text: 'Resolved issue #42: Onboarding flow timing' },
      { time: '5 hrs ago', text: 'Updated team scorecard with latest metrics' },
      { time: 'Yesterday', text: 'Sent accountability reminders to 3 team members' },
    ],
    strategy: [
      { time: '1 hr ago', text: 'Identified new market opportunity in fintech vertical' },
      { time: '4 hrs ago', text: 'Updated OKR progress for Q1' },
      { time: 'Yesterday', text: 'Drafted board pack executive summary' },
      { time: '2 days ago', text: 'Competitor analysis: 3 new entrants detected' },
      { time: '3 days ago', text: 'Investment readiness score updated: 72/100' },
    ],
    secretarial: [
      { time: '15 min ago', text: 'Checked Companies House for upcoming filing deadlines' },
      { time: '2 hrs ago', text: 'Sent contract expiry reminder: Acme Corp (30 days)' },
      { time: '6 hrs ago', text: 'Verified all business licenses are current' },
      { time: 'Yesterday', text: 'Updated compliance calendar for April' },
      { time: '2 days ago', text: 'Filed confirmation statement with Companies House' },
    ],
  };
  return activityBySlug[agent.slug] ?? [];
}

/* ------------------------------------------------------------------ */
/*  How it works steps                                                 */
/* ------------------------------------------------------------------ */

const howItWorks = [
  {
    step: 1,
    title: 'Connect your data',
    description: 'Link your existing tools and data sources. The agent analyses your business context and begins learning your processes.',
  },
  {
    step: 2,
    title: 'Configure & approve',
    description: 'Set your preferences, approval thresholds, and notification rules. You stay in control of what the agent can do autonomously.',
  },
  {
    step: 3,
    title: 'Agent runs 24/7',
    description: 'The agent works around the clock, monitoring, executing, and reporting. Review its activity feed anytime and adjust as needed.',
  },
];

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: AgentDefinition['status'] }) {
  if (status === 'available') {
    return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">Available</Badge>;
  }
  if (status === 'beta') {
    return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">Beta</Badge>;
  }
  return <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-500">Coming Soon</Badge>;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const agent = getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const colors = colorMap[agent.color] ?? colorMap.blue;
  const activity = getMockActivity(agent);

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/agents" className="hover:underline">AI Agents</Link>
        <span className="mx-1.5">/</span>
        <span>{agent.name}</span>
      </nav>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: `/agents/${slug}`, label: 'Overview' },
          { href: `/agents/${slug}/timesheet`, label: 'Timesheet' },
          { href: `/agents/${slug}/billing`, label: 'Billing' },
          { href: `/agents/${slug}/settings`, label: 'Settings' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab.label === 'Overview'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Hero */}
      <div className={cn('rounded-xl border p-6 flex items-start gap-5', colors.bg)}>
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-xl text-white shrink-0', colors.bgStrong)}>
          {agentIcons[agent.icon] ?? agentIcons.PoundSterling}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1c1b1b' }}>{agent.name}</h1>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{agent.tagline}</p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{agent.description}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: capabilities + activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {agent.capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-3">
                    <svg
                      className={cn('h-4 w-4 mt-0.5 shrink-0', colors.text)}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{cap}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Sample Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet. Activate this agent to get started.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', colors.bgStrong)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{item.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {howItWorks.map((step) => (
                  <div key={step.step} className="text-center">
                    <div
                      className={cn(
                        'mx-auto flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold mb-3',
                        colors.bgStrong,
                      )}
                    >
                      {step.step}
                    </div>
                    <h4 className="text-sm font-semibold mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: pricing card + metrics */}
        <div className="space-y-6">
          {/* Pricing card */}
          <Card className={cn('border-t-4', colors.border)}>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <p className={cn('text-3xl font-bold', colors.text)}>
                  £{agent.monthlyPrice}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Billed monthly. Cancel anytime.</p>
              </div>

              {agent.status === 'available' && (
                <Button className="w-full" size="lg">
                  Activate Agent
                </Button>
              )}
              {agent.status === 'beta' && (
                <Button className="w-full" size="lg" variant="outline">
                  Join Beta
                </Button>
              )}
              {agent.status === 'coming_soon' && (
                <Button className="w-full" size="lg" variant="outline">
                  Enquire
                </Button>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                Part of the 5-agent bundle at £499/month
              </p>
            </CardContent>
          </Card>

          {/* Metrics */}
          {agent.metrics && agent.metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sample Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent.metrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <span className={cn('text-sm font-semibold', colors.text)}>{m.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
