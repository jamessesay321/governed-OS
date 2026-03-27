'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus, Send, Eye, Clock, FileText,
  Sparkles, Mail, MailOpen, BarChart3,
  X, ChevronRight,
} from 'lucide-react';

/* ── Types ── */
type UpdateStatus = 'draft' | 'sent' | 'opened';

interface InvestorUpdate {
  id: string;
  title: string;
  date: string;
  recipients: number;
  status: UpdateStatus;
  openRate: string;
  template: string;
}

/* ── Mock data ── */
const updates: InvestorUpdate[] = [
  {
    id: '1',
    title: 'March 2026 Monthly Update',
    date: '2026-03-15',
    recipients: 12,
    status: 'opened',
    openRate: '92%',
    template: 'Monthly Update',
  },
  {
    id: '2',
    title: 'Q1 2026 Board Pack',
    date: '2026-03-01',
    recipients: 8,
    status: 'opened',
    openRate: '100%',
    template: 'Board Pack',
  },
  {
    id: '3',
    title: 'February 2026 Monthly Update',
    date: '2026-02-14',
    recipients: 12,
    status: 'sent',
    openRate: '83%',
    template: 'Monthly Update',
  },
  {
    id: '4',
    title: 'January 2026 Monthly Update',
    date: '2026-01-15',
    recipients: 12,
    status: 'sent',
    openRate: '75%',
    template: 'Monthly Update',
  },
  {
    id: '5',
    title: 'Series A Progress Report',
    date: '2026-02-01',
    recipients: 0,
    status: 'draft',
    openRate: '-',
    template: 'Fundraising Update',
  },
  {
    id: '6',
    title: 'Q4 2025 Quarterly Review',
    date: '2025-12-20',
    recipients: 10,
    status: 'opened',
    openRate: '90%',
    template: 'Quarterly Review',
  },
];

const statusConfig: Record<UpdateStatus, { label: string; colour: string; icon: React.ReactNode }> = {
  draft: {
    label: 'Draft',
    colour: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: <FileText className="h-4 w-4 text-slate-500" />,
  },
  sent: {
    label: 'Sent',
    colour: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Send className="h-4 w-4 text-blue-600" />,
  },
  opened: {
    label: 'Opened',
    colour: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <MailOpen className="h-4 w-4 text-emerald-600" />,
  },
};

/* ── Templates ── */
const templates = [
  {
    name: 'Monthly Update',
    description: 'Key metrics, highlights, asks, and upcoming milestones. Sent to all investors.',
    icon: <Mail className="h-5 w-5 text-emerald-600" />,
  },
  {
    name: 'Quarterly Review',
    description: 'In-depth performance review with financial summaries and strategic outlook.',
    icon: <BarChart3 className="h-5 w-5 text-blue-600" />,
  },
  {
    name: 'Board Pack',
    description: 'Comprehensive board-ready package with financials, KPIs, and discussion items.',
    icon: <FileText className="h-5 w-5 text-violet-600" />,
  },
  {
    name: 'Fundraising Update',
    description: 'Progress on current round, investor pipeline, and key milestones towards close.',
    icon: <Sparkles className="h-5 w-5 text-amber-600" />,
  },
];

export default function InvestorUpdatesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<UpdateStatus | 'all'>('all');

  const filtered = updates.filter((u) => {
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    return true;
  });

  const sentCount = updates.filter((u) => u.status !== 'draft').length;
  const avgOpenRate = Math.round(
    updates
      .filter((u) => u.openRate !== '-')
      .reduce((sum, u) => sum + parseInt(u.openRate), 0) /
    updates.filter((u) => u.openRate !== '-').length
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Updates</h1>
          <p className="text-muted-foreground mt-1">
            Keep your investors informed with regular, well-structured communications.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Update
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Updates', value: updates.length.toString(), icon: <FileText className="h-4 w-4 text-emerald-600" /> },
          { label: 'Sent', value: sentCount.toString(), icon: <Send className="h-4 w-4 text-blue-600" /> },
          { label: 'Avg Open Rate', value: `${avgOpenRate}%`, icon: <Eye className="h-4 w-4 text-violet-600" /> },
          { label: 'Drafts', value: updates.filter(u => u.status === 'draft').length.toString(), icon: <Clock className="h-4 w-4 text-amber-600" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">{stat.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create update with templates */}
      {showCreate && (
        <Card className="border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Choose a Template
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Select a template to get started. Our AI will help draft your update based on your latest data.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.name}
                  className="flex items-start gap-3 rounded-lg border p-4 text-left hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                >
                  <div className="rounded-lg bg-muted p-2 shrink-0">{tmpl.icon}</div>
                  <div>
                    <p className="text-sm font-semibold">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'sent', 'opened'] as const).map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(s)}
            className={filterStatus === s ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
          >
            {s === 'all' ? 'All Updates' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Updates list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((update) => {
              const config = statusConfig[update.status];
              return (
                <div key={update.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2 shrink-0 mt-0.5">{config.icon}</div>
                    <div>
                      <p className="text-sm font-medium">{update.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {new Date(update.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {update.template}
                        </Badge>
                        {update.recipients > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {update.recipients} recipients
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    {update.openRate !== '-' && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Open Rate</p>
                        <p className="text-sm font-semibold">{update.openRate}</p>
                      </div>
                    )}
                    <Badge variant="outline" className={config.colour}>
                      {config.label}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No updates match your filter. Try selecting a different status.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
