'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
/*  Placeholder text per agent slug                                    */
/* ------------------------------------------------------------------ */

const instructionPlaceholders: Record<string, string> = {
  finance:
    'e.g., Always flag transactions over £5,000 for manual review. Prioritise cash flow reports on Mondays...',
  marketing:
    'e.g., Focus on Instagram and Pinterest for luxury bridal audience. Avoid discount-focused messaging...',
  'project-management':
    'e.g., Weekly rock reviews on Mondays, L10 prep by Wednesday 5pm. Use Slack for reminders...',
  strategy:
    'e.g., Prioritise competitor analysis in the luxury bridal sector. Board pack due by 25th each month...',
  secretarial:
    'e.g., Check Companies House deadlines on the 1st of each month. Prioritise contract renewals...',
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AgentSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const agent = getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const colors = colorMap[agent.color] ?? colorMap.blue;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/agents" className="hover:underline">AI Agents</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/agents/${slug}`} className="hover:underline">{agent.name}</Link>
        <span className="mx-1.5">/</span>
        <span>Settings</span>
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
              tab.label === 'Settings'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Instructions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Provide custom instructions to guide how {agent.name} operates for your business.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={instructionPlaceholders[slug] ?? 'Enter custom instructions for this agent...'}
          />
          <Button>Save</Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-email" className="text-sm">Email alerts for critical actions</Label>
            <input
              id="notif-email"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-inapp" className="text-sm">In-app notifications</Label>
            <input
              id="notif-inapp"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-weekly" className="text-sm">Weekly summary report</Label>
            <input
              id="notif-weekly"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="notif-email-address" className="text-sm">Email summary to:</Label>
            <Input id="notif-email-address" placeholder="finance@alonuko.co.uk" />
          </div>
        </CardContent>
      </Card>

      {/* Approval Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {slug === 'finance' && (
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Require approval for payments over</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">£</span>
                <Input type="number" defaultValue={5000} className="w-28" />
              </div>
            </div>
          )}

          {slug === 'marketing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="approve-publish" className="text-sm">Require approval before publishing</Label>
                <input
                  id="approve-publish"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm whitespace-nowrap">Auto-approve posts under</Label>
                <Input type="number" defaultValue={280} className="w-28" />
                <span className="text-sm text-muted-foreground">characters</span>
              </div>
            </div>
          )}

          {slug === 'project-management' && (
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reminders" className="text-sm">Auto-send accountability reminders</Label>
              <input
                id="auto-reminders"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
          )}

          {slug === 'strategy' && (
            <div className="flex items-center justify-between">
              <Label htmlFor="board-review" className="text-sm">Board pack requires review before distribution</Label>
              <input
                id="board-review"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
          )}

          {slug === 'secretarial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-file" className="text-sm">Auto-file routine documents</Label>
                <input
                  id="auto-file"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm whitespace-nowrap">Flag filings over</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">£</span>
                  <Input type="number" defaultValue={1000} className="w-28" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Data Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm">Xero</span>
            </div>
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm">Bank Feed (Barclays)</span>
            </div>
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
              <span className="text-sm">Email (Gmail)</span>
            </div>
            <span className="text-xs text-muted-foreground">Not connected</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
              <span className="text-sm">Calendar (Google)</span>
            </div>
            <span className="text-xs text-muted-foreground">Not connected</span>
          </div>
          <div className="pt-2">
            <Link href="/integrations" className="text-sm text-primary hover:underline">
              Manage integrations
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Deactivate Agent</CardTitle>
          <p className="text-sm text-muted-foreground">
            Deactivating will stop all automated tasks. Your data and configuration will be preserved.
          </p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
            Deactivate {agent.name}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
