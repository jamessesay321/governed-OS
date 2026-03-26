'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAgentBySlug } from '@/lib/agents/registry';

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
/*  Billing history data                                               */
/* ------------------------------------------------------------------ */

function getBillingHistory(monthlyPrice: number) {
  return [
    { date: 'Mar 2026', description: 'Monthly subscription', amount: monthlyPrice, status: 'pending' as const },
    { date: 'Feb 2026', description: 'Monthly subscription', amount: monthlyPrice, status: 'paid' as const },
    { date: 'Jan 2026', description: 'Monthly subscription', amount: monthlyPrice, status: 'paid' as const },
    { date: 'Dec 2025', description: 'Monthly subscription', amount: monthlyPrice, status: 'paid' as const },
    { date: 'Nov 2025', description: 'Monthly subscription', amount: monthlyPrice, status: 'paid' as const },
    { date: 'Oct 2025', description: 'Monthly subscription', amount: monthlyPrice, status: 'paid' as const },
  ];
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AgentBillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const agent = getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const colors = colorMap[agent.color] ?? colorMap.blue;
  const billingHistory = getBillingHistory(agent.monthlyPrice);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/agents" className="hover:underline">AI Agents</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/agents/${slug}`} className="hover:underline">{agent.name}</Link>
        <span className="mx-1.5">/</span>
        <span>Billing</span>
      </nav>

      {/* Sub-navigation tabs */}
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
              tab.label === 'Billing'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Current Subscription */}
      <Card className={cn('border-t-4', colors.border)}>
        <CardHeader>
          <CardTitle className="text-base">Current Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Agent</span>
            <span className="text-sm font-medium">{agent.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className={cn('text-2xl font-bold', colors.text)}>
              £{agent.monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/month</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Activated</span>
            <span className="text-sm">15 January 2026</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Next billing</span>
            <span className="text-sm">28 March 2026</span>
          </div>
        </CardContent>
      </Card>

      {/* Value Delivered This Month */}
      <div>
        <h2 className="text-base font-semibold mb-4">Value Delivered This Month</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Tasks Executed</p>
              <p className="text-2xl font-bold mt-1">342</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Hours Active</p>
              <p className="text-2xl font-bold mt-1">456</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Estimated Value Delivered</p>
              <p className="text-2xl font-bold mt-1">£12,400</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((row) => (
                  <tr key={row.date} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-sm">{row.date}</td>
                    <td className="px-4 py-3 text-sm">{agent.name}: {row.description}</td>
                    <td className="px-4 py-3 text-sm text-right">£{row.amount}</td>
                    <td className="px-4 py-3 text-right">
                      {row.status === 'paid' ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bundle Savings */}
      <Card style={{ backgroundColor: '#f1edea' }}>
        <CardContent className="pt-6 space-y-3">
          <h3 className="text-base font-semibold">Save with the Agent Bundle</h3>
          <p className="text-sm text-muted-foreground">
            You&apos;re paying £{agent.monthlyPrice}/mo for {agent.name}. Get all 5 agents for
            £499/mo. Save £176.
          </p>
          <Button>Get the Bundle</Button>
        </CardContent>
      </Card>
    </div>
  );
}
