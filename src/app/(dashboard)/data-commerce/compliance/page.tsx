'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, FileText, Eye, Lock, Trash2, AlertTriangle,
  CheckCircle2, Clock, Circle, ChevronRight,
} from 'lucide-react';

/* ── Types ── */
type ComplianceStatus = 'complete' | 'pending' | 'not_started';

interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  status: ComplianceStatus;
  lastReviewed: string | null;
  icon: React.ReactNode;
}

/* ── Compliance checklist ── */
const complianceItems: ComplianceItem[] = [
  {
    id: '1',
    name: 'Data Processing Agreement',
    description: 'Standard contractual clauses for all data processing activities with third parties.',
    status: 'complete',
    lastReviewed: '2026-03-15',
    icon: <FileText className="h-5 w-5 text-emerald-600" />,
  },
  {
    id: '2',
    name: 'Privacy Impact Assessment',
    description: 'Assessment of how data products affect the privacy rights of individuals.',
    status: 'complete',
    lastReviewed: '2026-03-10',
    icon: <Eye className="h-5 w-5 text-blue-600" />,
  },
  {
    id: '3',
    name: 'Consent Management',
    description: 'Systems and processes for collecting, storing, and managing user consent.',
    status: 'pending',
    lastReviewed: '2026-02-20',
    icon: <ShieldCheck className="h-5 w-5 text-violet-600" />,
  },
  {
    id: '4',
    name: 'Data Anonymisation',
    description: 'Techniques and validation for ensuring all shared data is properly anonymised.',
    status: 'complete',
    lastReviewed: '2026-03-12',
    icon: <Lock className="h-5 w-5 text-amber-600" />,
  },
  {
    id: '5',
    name: 'Right to Deletion',
    description: 'Processes to honour deletion requests across all data products and pipelines.',
    status: 'pending',
    lastReviewed: '2026-01-28',
    icon: <Trash2 className="h-5 w-5 text-rose-500" />,
  },
  {
    id: '6',
    name: 'Breach Notification',
    description: 'Incident response plan and notification procedures within 72-hour GDPR requirement.',
    status: 'not_started',
    lastReviewed: null,
    icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  },
];

/* ── Audit log ── */
const auditLog = [
  { date: '2026-03-15', action: 'Data Processing Agreement reviewed and approved', user: 'Sarah Chen', type: 'review' },
  { date: '2026-03-14', action: 'Privacy Impact Assessment updated for new product line', user: 'James Wilson', type: 'update' },
  { date: '2026-03-12', action: 'Anonymisation pipeline validated against test dataset', user: 'System', type: 'validation' },
  { date: '2026-03-10', action: 'Privacy Impact Assessment completed for Q1 products', user: 'Sarah Chen', type: 'review' },
  { date: '2026-03-05', action: 'Consent management system audit initiated', user: 'James Wilson', type: 'audit' },
  { date: '2026-02-28', action: 'GDPR training completed for data team', user: 'HR System', type: 'training' },
  { date: '2026-02-20', action: 'Consent records exported for quarterly review', user: 'Sarah Chen', type: 'export' },
  { date: '2026-02-15', action: 'Data deletion request processed (ref: DEL-0042)', user: 'System', type: 'deletion' },
];

const statusConfig: Record<ComplianceStatus, { label: string; colour: string; icon: React.ReactNode }> = {
  complete: {
    label: 'Complete',
    colour: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  },
  pending: {
    label: 'Pending',
    colour: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="h-4 w-4 text-amber-600" />,
  },
  not_started: {
    label: 'Not Started',
    colour: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: <Circle className="h-4 w-4 text-slate-400" />,
  },
};

const auditTypeColours: Record<string, string> = {
  review: 'bg-emerald-50 text-emerald-700',
  update: 'bg-blue-50 text-blue-700',
  validation: 'bg-violet-50 text-violet-700',
  audit: 'bg-amber-50 text-amber-700',
  training: 'bg-cyan-50 text-cyan-700',
  export: 'bg-slate-50 text-slate-600',
  deletion: 'bg-rose-50 text-rose-600',
};

export default function CompliancePage() {
  const completedCount = complianceItems.filter((i) => i.status === 'complete').length;
  const totalCount = complianceItems.length;
  const complianceScore = Math.round((completedCount / totalCount) * 100);

  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GDPR Compliance</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your data compliance obligations for all commercialised data products.
        </p>
      </div>

      {/* Compliance score */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="relative h-28 w-28 mb-3">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none" stroke="#e5e7eb" strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={complianceScore >= 80 ? '#10b981' : complianceScore >= 50 ? '#f59e0b' : '#f43f5e'}
                  strokeWidth="8"
                  strokeDasharray={`${(complianceScore / 100) * 264} 264`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{complianceScore}%</span>
              </div>
            </div>
            <p className="text-sm font-semibold">Overall Compliance</p>
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount} of {totalCount} items complete
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['complete', 'pending', 'not_started'] as ComplianceStatus[]).map((status) => {
                const count = complianceItems.filter((i) => i.status === status).length;
                const pct = Math.round((count / totalCount) * 100);
                const config = statusConfig[status];
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count} items ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          status === 'complete' ? 'bg-emerald-500' :
                          status === 'pending' ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Compliance Checklist</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {complianceItems.map((item) => {
              const config = statusConfig[item.status];
              const isExpanded = expandedItem === item.id;
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    {item.icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.lastReviewed && (
                        <p className="text-xs text-muted-foreground">
                          Last reviewed: {new Date(item.lastReviewed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={config.colour}>
                      {config.label}
                    </Badge>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-14">
                      <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                      <div className="flex gap-2">
                        {item.status !== 'complete' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Mark Complete
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                        <Button size="sm" variant="outline">
                          View History
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {auditLog.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4">
                <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 w-20 shrink-0">
                  {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{entry.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">by {entry.user}</p>
                </div>
                <Badge variant="secondary" className={`text-xs shrink-0 ${auditTypeColours[entry.type] || ''}`}>
                  {entry.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
