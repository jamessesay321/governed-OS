'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Clock, ArrowRight, User,
  Shield, AlertTriangle, History, ChevronRight, Zap,
  PoundSterling, FileCheck,
} from 'lucide-react';

/* ── types ── */
type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type Priority = 'high' | 'medium' | 'low';

interface ApprovalItem {
  id: string;
  poNumber: string;
  supplier: string;
  description: string;
  amount: number;
  requestedBy: string;
  requestedDate: string;
  priority: Priority;
  status: ApprovalStatus;
  currentApprover: string;
}

interface ApprovalChainStep {
  role: string;
  name: string;
  status: 'completed' | 'current' | 'pending';
  date?: string;
}

interface ApprovalHistoryEntry {
  id: string;
  poNumber: string;
  supplier: string;
  amount: number;
  action: 'approved' | 'rejected';
  approvedBy: string;
  date: string;
  notes?: string;
}

interface PolicyRule {
  title: string;
  description: string;
  threshold: string;
  icon: React.ReactNode;
}

/* ── mock data ── */
const pendingApprovals: ApprovalItem[] = [
  {
    id: 'APR-001',
    poNumber: 'PO-2024-0146',
    supplier: 'Meridian Consulting',
    description: 'Strategy review engagement',
    amount: 12000,
    requestedBy: 'Sarah Chen',
    requestedDate: '2024-03-24',
    priority: 'high',
    status: 'pending',
    currentApprover: 'James Wilson',
  },
  {
    id: 'APR-002',
    poNumber: 'PO-2024-0148',
    supplier: 'TechFlow Solutions',
    description: 'Additional cloud compute capacity',
    amount: 8500,
    requestedBy: 'Mike Roberts',
    requestedDate: '2024-03-25',
    priority: 'medium',
    status: 'pending',
    currentApprover: 'James Wilson',
  },
  {
    id: 'APR-003',
    poNumber: 'PO-2024-0149',
    supplier: 'GreenPrint Media',
    description: 'Q2 campaign creative production',
    amount: 15000,
    requestedBy: 'Emma Taylor',
    requestedDate: '2024-03-25',
    priority: 'high',
    status: 'pending',
    currentApprover: 'David Kim',
  },
  {
    id: 'APR-004',
    poNumber: 'PO-2024-0150',
    supplier: 'LearnPro UK',
    description: 'Team training platform upgrade',
    amount: 4200,
    requestedBy: 'Priya Patel',
    requestedDate: '2024-03-26',
    priority: 'low',
    status: 'pending',
    currentApprover: 'James Wilson',
  },
  {
    id: 'APR-005',
    poNumber: 'PO-2024-0151',
    supplier: 'DataSecure Pro',
    description: 'Penetration testing services',
    amount: 22000,
    requestedBy: 'Tom Anderson',
    requestedDate: '2024-03-26',
    priority: 'high',
    status: 'pending',
    currentApprover: 'CFO Review',
  },
  {
    id: 'APR-006',
    poNumber: 'PO-2024-0152',
    supplier: 'OfficeHub Ltd',
    description: 'Standing desk converters x10',
    amount: 3200,
    requestedBy: 'Lisa Wong',
    requestedDate: '2024-03-26',
    priority: 'low',
    status: 'pending',
    currentApprover: 'James Wilson',
  },
  {
    id: 'APR-007',
    poNumber: 'PO-2024-0153',
    supplier: 'Apex Recruitment',
    description: 'Senior developer placement fee',
    amount: 9800,
    requestedBy: 'Mark Johnson',
    requestedDate: '2024-03-27',
    priority: 'medium',
    status: 'pending',
    currentApprover: 'James Wilson',
  },
  {
    id: 'APR-008',
    poNumber: 'PO-2024-0154',
    supplier: 'CleanSpace Facilities',
    description: 'Deep clean and sanitisation (quarterly)',
    amount: 2800,
    requestedBy: 'Rachel Green',
    requestedDate: '2024-03-27',
    priority: 'low',
    status: 'pending',
    currentApprover: 'Auto-approve',
  },
];

const approvalChain: ApprovalChainStep[] = [
  { role: 'Requester', name: 'Sarah Chen', status: 'completed', date: '2024-03-24' },
  { role: 'Department Head', name: 'Mike Roberts', status: 'completed', date: '2024-03-24' },
  { role: 'Procurement Lead', name: 'James Wilson', status: 'current' },
  { role: 'CFO', name: 'David Kim', status: 'pending' },
];

const approvalHistory: ApprovalHistoryEntry[] = [
  { id: 'HIST-001', poNumber: 'PO-2024-0145', supplier: 'OfficeHub Ltd', amount: 8750, action: 'approved', approvedBy: 'James Wilson', date: '2024-03-23', notes: 'Approved per office upgrade plan' },
  { id: 'HIST-002', poNumber: 'PO-2024-0144', supplier: 'DataSecure Pro', amount: 22000, action: 'approved', approvedBy: 'David Kim', date: '2024-03-22' },
  { id: 'HIST-003', poNumber: 'PO-2024-0143', supplier: 'GreenPrint Media', amount: 4200, action: 'approved', approvedBy: 'James Wilson', date: '2024-03-21' },
  { id: 'HIST-004', poNumber: 'PO-2024-0140', supplier: 'SwiftLogistics UK', amount: 6800, action: 'rejected', approvedBy: 'James Wilson', date: '2024-03-19', notes: 'Insufficient justification; please resubmit with cost comparison' },
  { id: 'HIST-005', poNumber: 'PO-2024-0139', supplier: 'Apex Recruitment', amount: 5500, action: 'approved', approvedBy: 'James Wilson', date: '2024-03-18' },
  { id: 'HIST-006', poNumber: 'PO-2024-0137', supplier: 'TechFlow Solutions', amount: 18500, action: 'approved', approvedBy: 'David Kim', date: '2024-03-15' },
  { id: 'HIST-007', poNumber: 'PO-2024-0135', supplier: 'Meridian Consulting', amount: 35000, action: 'approved', approvedBy: 'David Kim', date: '2024-03-12', notes: 'Board pre-approved strategic initiative' },
  { id: 'HIST-008', poNumber: 'PO-2024-0134', supplier: 'CaterPlus Events', amount: 1200, action: 'approved', approvedBy: 'Auto-approve', date: '2024-03-11' },
];

const policyRules: PolicyRule[] = [
  {
    title: 'Auto-approve under £500',
    description: 'Purchase orders below £500 from approved suppliers are automatically approved without manual review.',
    threshold: '< £500',
    icon: <Zap className="h-5 w-5 text-emerald-600" />,
  },
  {
    title: 'Department Head Approval',
    description: 'Orders between £500 and £5,000 require department head sign-off before procurement review.',
    threshold: '£500 - £5,000',
    icon: <User className="h-5 w-5 text-blue-600" />,
  },
  {
    title: 'Procurement Lead Review',
    description: 'All orders between £5,000 and £20,000 must be reviewed by the procurement lead for compliance.',
    threshold: '£5,000 - £20,000',
    icon: <FileCheck className="h-5 w-5 text-violet-600" />,
  },
  {
    title: 'CFO Approval Required',
    description: 'Orders exceeding £20,000 require CFO approval. Board approval needed above £100,000.',
    threshold: '> £20,000',
    icon: <Shield className="h-5 w-5 text-amber-600" />,
  },
];

const fmt = (v: number) =>
  `£${v.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

const priorityStyles: Record<Priority, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
};

const chainStepStyles: Record<ApprovalChainStep['status'], string> = {
  completed: 'border-emerald-500 bg-emerald-50',
  current: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',
  pending: 'border-gray-200 bg-gray-50',
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState(pendingApprovals);

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: action as ApprovalStatus } : a))
    );
  };

  const pending = approvals.filter((a) => a.status === 'pending');
  const processed = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; Connect your procurement system to manage
        real approval workflows.
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Approval Workflows
          </h1>
          <p className="mt-1 text-gray-500">
            Review, approve, or reject pending purchase orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-700">{pending.length} pending</span>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
              All caught up! No pending approvals.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 hover:bg-gray-50/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">{item.poNumber}</span>
                      <Badge className={priorityStyles[item.priority]} variant="outline">
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="font-medium text-gray-900">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span>{item.supplier}</span>
                      <span className="text-gray-300">|</span>
                      <span className="font-semibold text-gray-900">{fmt(item.amount)}</span>
                      <span className="text-gray-300">|</span>
                      <span>Requested by {item.requestedBy}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAction(item.id, 'approved')}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleAction(item.id, 'rejected')}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show recently processed */}
          {processed.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs font-medium uppercase text-gray-400">Just processed</p>
              {processed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm"
                >
                  <span className="text-gray-600">
                    {item.poNumber} - {item.description}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      item.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {item.status === 'approved' ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Chain Visualisation */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Chain</CardTitle>
          <CardDescription>
            Current workflow for PO-2024-0146 (Meridian Consulting, £12,000)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
            {approvalChain.map((step, index) => (
              <div key={step.role} className="flex items-center">
                <div
                  className={`rounded-xl border-2 p-3 min-w-[160px] ${chainStepStyles[step.status]}`}
                >
                  <div className="flex items-center gap-2">
                    {step.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    {step.status === 'current' && (
                      <Clock className="h-4 w-4 text-blue-600" />
                    )}
                    {step.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {step.role}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900">{step.name}</p>
                  {step.date && (
                    <p className="text-xs text-gray-400">{step.date}</p>
                  )}
                </div>
                {index < approvalChain.length - 1 && (
                  <ChevronRight className="mx-1 h-5 w-5 flex-shrink-0 text-gray-300 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            Approval History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">PO Number</th>
                  <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Supplier</th>
                  <th className="pb-3 pr-4 font-medium text-right">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Action</th>
                  <th className="pb-3 pr-4 font-medium hidden md:table-cell">Approved By</th>
                  <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Date</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {approvalHistory.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 pr-4 font-mono text-xs font-medium text-gray-900">
                      {entry.poNumber}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 hidden sm:table-cell">
                      {entry.supplier}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-gray-900">
                      {fmt(entry.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant="outline"
                        className={
                          entry.action === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {entry.action === 'approved' ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 hidden md:table-cell">
                      {entry.approvedBy}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 hidden lg:table-cell">
                      {entry.date}
                    </td>
                    <td className="py-3 text-gray-500 text-xs hidden lg:table-cell max-w-[200px] truncate">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Policy Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            Approval Policy Rules
          </CardTitle>
          <CardDescription>
            Automated rules governing the procurement approval workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {policyRules.map((rule) => (
              <div
                key={rule.title}
                className="flex gap-3 rounded-lg border border-gray-200 p-4"
              >
                <div className="flex-shrink-0 rounded-lg bg-gray-50 p-2">
                  {rule.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{rule.title}</h4>
                    <Badge variant="outline" className="text-xs">{rule.threshold}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
