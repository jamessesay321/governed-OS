'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase, TrendingUp, PoundSterling, Clock,
  ArrowUpRight, ArrowDownRight,
  FileText, Send, Share2, CalendarClock,
  Users, PieChart, FolderOpen, MailOpen,
} from 'lucide-react';

/* ── Key metrics ── */
interface MetricCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

const metrics: MetricCard[] = [
  {
    label: 'Annual Recurring Revenue',
    value: '£1.2M',
    change: '+34% YoY',
    trend: 'up',
    icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
  },
  {
    label: 'Monthly Recurring Revenue',
    value: '£104K',
    change: '+8.2% MoM',
    trend: 'up',
    icon: <PoundSterling className="h-5 w-5 text-blue-600" />,
  },
  {
    label: 'Burn Rate',
    value: '£68K',
    change: '-5.1% vs last month',
    trend: 'down',
    icon: <Clock className="h-5 w-5 text-amber-600" />,
  },
  {
    label: 'Runway',
    value: '18 months',
    change: '+2 months vs Q4',
    trend: 'up',
    icon: <Briefcase className="h-5 w-5 text-violet-600" />,
  },
];

/* ── Recent investor updates ── */
const recentUpdates = [
  {
    title: 'March 2026 Monthly Update',
    date: '2026-03-15',
    status: 'sent' as const,
    recipients: 12,
    openRate: '92%',
  },
  {
    title: 'Q1 2026 Board Pack',
    date: '2026-03-01',
    status: 'sent' as const,
    recipients: 8,
    openRate: '100%',
  },
  {
    title: 'February 2026 Monthly Update',
    date: '2026-02-14',
    status: 'sent' as const,
    recipients: 12,
    openRate: '83%',
  },
  {
    title: 'Series A Progress Report',
    date: '2026-02-01',
    status: 'draft' as const,
    recipients: 0,
    openRate: '-',
  },
];

const updateStatusStyles = {
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
};

/* ── Document vault summary ── */
const documents = [
  { category: 'Pitch Deck', count: 3, lastUpdated: '2026-03-10' },
  { category: 'Financial Statements', count: 8, lastUpdated: '2026-03-15' },
  { category: 'Legal Documents', count: 12, lastUpdated: '2026-02-28' },
  { category: 'Due Diligence', count: 5, lastUpdated: '2026-03-05' },
];

/* ── Cap table summary ── */
const capTable = [
  { holder: 'Founders', percentage: 62, colour: 'bg-emerald-500' },
  { holder: 'Seed Investors', percentage: 18, colour: 'bg-blue-500' },
  { holder: 'Angel Investors', percentage: 8, colour: 'bg-violet-500' },
  { holder: 'ESOP', percentage: 10, colour: 'bg-amber-500' },
  { holder: 'Advisors', percentage: 2, colour: 'bg-cyan-500' },
];

export default function InvestorsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Portal</h1>
          <p className="text-muted-foreground mt-1">
            Your centralised hub for investor relations, fundraising, and stakeholder communications.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send Update
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share Report
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <CalendarClock className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Company valuation card */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estimated Company Valuation</p>
              <p className="text-3xl font-bold mt-1">£8.4M</p>
              <p className="text-sm text-emerald-600 flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-4 w-4" />
                +22% since last round
              </p>
            </div>
            <div className="sm:text-right">
              <Badge className="bg-emerald-600 text-white mb-2">Series A</Badge>
              <p className="text-sm text-muted-foreground">Current Round</p>
              <p className="text-lg font-semibold">£2.5M target / £1.8M committed</p>
              <div className="w-48 bg-muted rounded-full h-2 mt-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '72%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">72% of target raised</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                {metric.icon}
              </div>
              <p className="mt-2 text-2xl font-bold">{metric.value}</p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                )}
                <span className="text-emerald-600">{metric.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent investor updates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MailOpen className="h-4 w-4 text-emerald-600" />
              Recent Updates
            </CardTitle>
            <Link href="/investors/updates">
              <Button variant="ghost" size="sm" className="text-emerald-600">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentUpdates.map((update, idx) => (
                <div key={idx} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{update.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(update.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {update.status === 'sent' && ` \u00B7 ${update.recipients} recipients \u00B7 ${update.openRate} opened`}
                    </p>
                  </div>
                  <Badge variant="outline" className={updateStatusStyles[update.status]}>
                    {update.status === 'sent' ? 'Sent' : 'Draft'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document vault */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-emerald-600" />
              Document Vault
            </CardTitle>
            <Link href="/investors/documents">
              <Button variant="ghost" size="sm" className="text-emerald-600">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.category} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.category}</p>
                      <p className="text-xs text-muted-foreground">{doc.count} documents</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(doc.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cap table summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-600" />
            Cap Table Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Visual bar */}
            <div className="flex h-6 rounded-full overflow-hidden">
              {capTable.map((entry) => (
                <div
                  key={entry.holder}
                  className={`${entry.colour} transition-all`}
                  style={{ width: `${entry.percentage}%` }}
                  title={`${entry.holder}: ${entry.percentage}%`}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {capTable.map((entry) => (
                <div key={entry.holder} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${entry.colour}`} />
                  <div>
                    <p className="text-xs font-medium">{entry.holder}</p>
                    <p className="text-xs text-muted-foreground">{entry.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Key shareholders */}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { name: 'Total Shareholders', value: '24' },
                { name: 'Shares Issued', value: '10,000,000' },
                { name: 'Price Per Share', value: '£0.84' },
              ].map((stat) => (
                <div key={stat.name} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{stat.name}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
