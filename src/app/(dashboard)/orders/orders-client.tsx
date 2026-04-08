'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting/currency';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Calendar,
  CreditCard,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Cloud,
  FileSpreadsheet,
  PenLine,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExportButton, type ExportColumn } from '@/components/shared/export-button';
import type { BridalOrder, BridalPayment, OrdersSummary } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface OrdersClientProps {
  orders: BridalOrder[];
  summary: OrdersSummary;
  orgId: string;
}

type StatusFilter = 'all' | 'confirmed' | 'on_hold' | 'enquiry' | 'completed' | 'cancelled';

/* ================================================================== */
/*  Status config                                                      */
/* ================================================================== */

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  on_hold: {
    label: 'On Hold',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  enquiry: {
    label: 'Enquiry',
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-800',
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400' },
  paid: { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400' },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400' },
  waived: { label: 'Waived', color: 'text-gray-500 dark:text-gray-400' },
};

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.enquiry;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.bg,
        config.text,
        config.border
      )}
    >
      {config.label}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case 'on_hold':
      return <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <HelpCircle className="h-4 w-4 text-gray-400" />;
  }
}

/* ================================================================== */
/*  Source Badge                                                        */
/* ================================================================== */

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  monday: {
    label: 'Monday.com',
    icon: <Cloud className="h-3 w-3" />,
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  manual: {
    label: 'Manual',
    icon: <PenLine className="h-3 w-3" />,
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  wip_import: {
    label: 'WIP Import',
    icon: <FileSpreadsheet className="h-3 w-3" />,
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
  },
};

function SourceBadge({ source }: { source: string }) {
  const config = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.manual;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        config.bg,
        config.text,
        config.border
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

/* ================================================================== */
/*  Monday.com Board Selector                                          */
/* ================================================================== */

interface MondayBoard {
  id: string;
  name: string;
  items_count: number;
}

function MondaySyncPanel({
  onSyncComplete,
}: {
  onSyncComplete: () => void;
}) {
  const [boards, setBoards] = useState<MondayBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  // Fetch boards when panel opens
  async function loadBoards() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/monday');
      const data = await res.json();
      if (!res.ok) {
        setConfigured(data.configured === false ? false : true);
        setError(data.error || 'Failed to load boards');
        return;
      }
      setConfigured(true);
      setBoards(data.boards ?? []);
    } catch {
      setError('Failed to connect to Monday.com');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!selectedBoard) return;
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/orders/sync-monday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoard }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sync failed');
        return;
      }
      setResult(data.message || `Synced ${data.total} orders.`);
      onSyncComplete();
    } catch {
      setError('Sync request failed');
    } finally {
      setSyncing(false);
    }
  }

  function togglePanel() {
    if (!showPanel) {
      setShowPanel(true);
      loadBoards();
    } else {
      setShowPanel(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={togglePanel}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
      >
        <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
        Sync from Monday.com
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Import from Monday.com
          </h4>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading boards...
            </div>
          )}

          {configured === false && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Monday.com is not connected. Go to Settings &gt; Integrations to connect.
            </p>
          )}

          {!loading && configured && boards.length > 0 && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Select Board
                </label>
                <select
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose a board --</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.items_count} items)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSync}
                disabled={!selectedBoard || syncing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Orders
                  </>
                )}
              </button>
            </>
          )}

          {!loading && configured && boards.length === 0 && !error && (
            <p className="text-sm text-gray-500">No boards found in your Monday.com account.</p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-2 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2 text-xs text-emerald-700 dark:text-emerald-400">
              {result}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Summary Card                                                       */
/* ================================================================== */

function SummaryCard({
  label,
  value,
  sub,
  icon,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className={cn('rounded-xl border p-4', colorMap[color] ?? colorMap.gray)}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ================================================================== */
/*  Order Row (expandable)                                             */
/* ================================================================== */

function OrderRow({
  order,
  onAddPayment,
}: {
  order: BridalOrder;
  onAddPayment: (orderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const depositPaid = order.payments
    .filter((p) => p.payment_type === 'deposit' && p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount), 0);
  const depositPending = order.payments
    .filter((p) => p.payment_type === 'deposit' && p.status === 'pending')
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = order.payments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount), 0);

  const nextPayment = order.payments.find(
    (p) => p.status === 'pending' || p.status === 'overdue'
  );

  return (
    <>
      <tr
        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {order.client_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {order.email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{order.email}</p>
                )}
                {order.source && order.source !== 'manual' && (
                  <SourceBadge source={order.source} />
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
          {order.order_code ?? '--'}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {order.dress_style ?? '--'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {order.dress_name ?? '--'}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
          {order.dress_price != null ? formatCurrency(Number(order.dress_price)) : '--'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {formatDate(order.wedding_date)}
        </td>
        <td className="px-4 py-3">
          {depositPaid > 0 ? (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(depositPaid)} paid
            </span>
          ) : depositPending > 0 ? (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {formatCurrency(depositPending)} pending
            </span>
          ) : (
            <span className="text-xs text-gray-400">No deposit</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {nextPayment ? (
            <div>
              <span className={cn('text-xs font-medium', PAYMENT_STATUS_CONFIG[nextPayment.status]?.color)}>
                {formatCurrency(Number(nextPayment.amount))}
              </span>
              {nextPayment.due_date && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Due {formatDate(nextPayment.due_date)}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">--</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-200 dark:border-gray-800">
          <td colSpan={9} className="px-4 py-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-4">
              {/* Order details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {order.order_code && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Order Code
                    </span>
                    <p className="text-gray-900 dark:text-white font-medium font-mono mt-0.5">
                      {order.order_code}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Source
                  </span>
                  <div className="mt-0.5">
                    <SourceBadge source={order.source ?? 'manual'} />
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Event Type
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                    {order.event_type ?? 'Wedding'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Order Date
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                    {formatDate(order.order_date)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Fitting Date
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                    {formatDate(order.fitting_date)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Completion Date
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                    {formatDate(order.completion_date)}
                  </p>
                </div>
                {order.actual_dress_choice && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Actual Dress Choice
                    </span>
                    <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                      {order.actual_dress_choice}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Total Paid
                  </span>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
                {order.dress_price != null && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Outstanding
                    </span>
                    <p className="text-red-600 dark:text-red-400 font-semibold mt-0.5">
                      {formatCurrency(Math.max(0, Number(order.dress_price) - totalPaid))}
                    </p>
                  </div>
                )}
              </div>
              {order.notes && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Notes
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                    {order.notes}
                  </p>
                </div>
              )}

              {/* Payment schedule */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Payment Schedule
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPayment(order.id);
                    }}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Add Payment
                  </button>
                </div>
                {order.payments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No payments recorded yet.</p>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">
                            Type
                          </th>
                          <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">
                            Amount
                          </th>
                          <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">
                            Due Date
                          </th>
                          <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">
                            Paid Date
                          </th>
                          <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">
                            Method
                          </th>
                          <th className="px-3 py-1.5 text-left text-gray-500 dark:text-gray-400 font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.payments.map((p) => (
                          <tr
                            key={p.id}
                            className="border-t border-gray-200 dark:border-gray-700"
                          >
                            <td className="px-3 py-1.5 capitalize text-gray-700 dark:text-gray-300">
                              {p.payment_type}
                            </td>
                            <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-white">
                              {formatCurrency(Number(p.amount))}
                            </td>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">
                              {formatDate(p.due_date)}
                            </td>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">
                              {formatDate(p.paid_date)}
                            </td>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400 capitalize">
                              {p.payment_method?.replace(/_/g, ' ') ?? '--'}
                            </td>
                            <td className="px-3 py-1.5">
                              <span
                                className={cn(
                                  'font-medium capitalize',
                                  PAYMENT_STATUS_CONFIG[p.status]?.color
                                )}
                              >
                                {PAYMENT_STATUS_CONFIG[p.status]?.label ?? p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ================================================================== */
/*  Add Order Dialog                                                    */
/* ================================================================== */

function AddOrderDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_name: '',
    email: '',
    phone: '',
    status: 'enquiry' as const,
    dress_style: '',
    dress_name: '',
    dress_price: '',
    wedding_date: '',
    event_type: 'wedding',
    order_date: '',
    notes: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        client_name: form.client_name,
        email: form.email || null,
        phone: form.phone || null,
        status: form.status,
        dress_style: form.dress_style || null,
        dress_name: form.dress_name || null,
        dress_price: form.dress_price ? parseFloat(form.dress_price) : null,
        wedding_date: form.wedding_date || null,
        event_type: form.event_type || 'wedding',
        order_date: form.order_date || null,
        notes: form.notes || null,
      };

      const res = await fetch('/api/bridal-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create order');
      }

      onSuccess();
      onClose();
      setForm({
        client_name: '',
        email: '',
        phone: '',
        status: 'enquiry',
        dress_style: '',
        dress_name: '',
        dress_price: '',
        wedding_date: '',
        event_type: 'wedding',
        order_date: '',
        notes: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Bridal Order</DialogTitle>
          <DialogDescription>
            Create a new bridal order for a client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={form.client_name}
                onChange={(e) => updateField('client_name', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Sarah Thompson"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="enquiry">Enquiry</option>
                <option value="confirmed">Confirmed</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Type
              </label>
              <input
                type="text"
                value={form.event_type}
                onChange={(e) => updateField('event_type', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="wedding"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dress Style
              </label>
              <select
                value={form.dress_style}
                onChange={(e) => updateField('dress_style', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select --</option>
                <option value="Bespoke">Bespoke</option>
                <option value="Made to Order">Made to Order</option>
                <option value="Ready to Wear">Ready to Wear</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dress Name
              </label>
              <input
                type="text"
                value={form.dress_name}
                onChange={(e) => updateField('dress_name', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. The Aurora"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dress Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.dress_price}
                onChange={(e) => updateField('dress_price', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Wedding Date
              </label>
              <input
                type="date"
                value={form.wedding_date}
                onChange={(e) => updateField('wedding_date', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={form.order_date}
                onChange={(e) => updateField('order_date', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any special requests or notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Order
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Add Payment Dialog                                                  */
/* ================================================================== */

function AddPaymentDialog({
  open,
  orderId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    payment_type: 'deposit' as const,
    amount: '',
    due_date: '',
    paid_date: '',
    payment_method: '',
    status: 'pending' as const,
    notes: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    setError(null);
    setSaving(true);

    try {
      const payload = {
        payment_type: form.payment_type,
        amount: parseFloat(form.amount),
        due_date: form.due_date || null,
        paid_date: form.paid_date || null,
        payment_method: form.payment_method || null,
        status: form.status,
        notes: form.notes || null,
      };

      const res = await fetch(`/api/bridal-orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add payment');
      }

      onSuccess();
      onClose();
      setForm({
        payment_type: 'deposit',
        amount: '',
        due_date: '',
        paid_date: '',
        payment_method: '',
        status: 'pending',
        notes: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>Record a payment against this order.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Type *
              </label>
              <select
                value={form.payment_type}
                onChange={(e) => updateField('payment_type', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="deposit">Deposit</option>
                <option value="interim">Interim Payment</option>
                <option value="balance">Balance</option>
                <option value="refund">Refund</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 1500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="waived">Waived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => updateField('payment_method', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select --</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paid Date
              </label>
              <input
                type="date"
                value={form.paid_date}
                onChange={(e) => updateField('paid_date', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Payment
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*  Export Columns                                                      */
/* ================================================================== */

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Client Name', key: 'client_name', format: 'text' },
  { header: 'Order Code', key: 'order_code', format: 'text' },
  { header: 'Status', key: 'status', format: 'text' },
  { header: 'Source', key: 'source', format: 'text' },
  { header: 'Dress Style', key: 'dress_style', format: 'text' },
  { header: 'Dress Name', key: 'dress_name', format: 'text' },
  { header: 'Dress Price', key: 'dress_price', format: 'currency' },
  { header: 'Wedding Date', key: 'wedding_date', format: 'date' },
  { header: 'Order Date', key: 'order_date', format: 'date' },
  { header: 'Fitting Date', key: 'fitting_date', format: 'date' },
  { header: 'Event Type', key: 'event_type', format: 'text' },
  { header: 'Email', key: 'email', format: 'text' },
  { header: 'Phone', key: 'phone', format: 'text' },
  { header: 'Notes', key: 'notes', format: 'text' },
];

/* ================================================================== */
/*  Main Component                                                      */
/* ================================================================== */

export function OrdersClient({ orders, summary, orgId }: OrdersClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<number>(2026);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (o.wedding_date) {
        const year = new Date(o.wedding_date).getFullYear();
        if (year !== yearFilter) return false;
      }
      return true;
    });
  }, [orders, statusFilter, yearFilter]);

  // Build export data
  const exportData = useMemo(() => {
    return filteredOrders.map((o) => ({
      client_name: o.client_name,
      order_code: o.order_code ?? '',
      status: STATUS_CONFIG[o.status]?.label ?? o.status,
      source: SOURCE_CONFIG[o.source ?? 'manual']?.label ?? o.source ?? 'Manual',
      dress_style: o.dress_style ?? '',
      dress_name: o.dress_name ?? '',
      dress_price: o.dress_price ?? 0,
      wedding_date: o.wedding_date ?? '',
      order_date: o.order_date ?? '',
      fitting_date: o.fitting_date ?? '',
      event_type: o.event_type ?? '',
      email: o.email ?? '',
      phone: o.phone ?? '',
      notes: o.notes ?? '',
    }));
  }, [filteredOrders]);

  function handleAddPayment(orderId: string) {
    setPaymentOrderId(orderId);
    setShowAddPayment(true);
  }

  function handleSuccess() {
    // Reload page to get fresh data from server
    window.location.reload();
  }

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: orders.length },
    { key: 'confirmed', label: 'Confirmed', count: summary.confirmed },
    { key: 'on_hold', label: 'On Hold', count: summary.onHold },
    { key: 'enquiry', label: 'Enquiry', count: summary.enquiries },
    { key: 'completed', label: 'Completed', count: summary.completed },
    { key: 'cancelled', label: 'Cancelled', count: summary.cancelled },
  ];

  // Available years for filter
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(2026); // Always show 2026
    for (const o of orders) {
      if (o.wedding_date) {
        yearSet.add(new Date(o.wedding_date).getFullYear());
      }
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bridal Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage client orders, dresses, and payment schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MondaySyncPanel onSyncComplete={handleSuccess} />
          <ExportButton
            data={exportData}
            columns={EXPORT_COLUMNS}
            filename="bridal-orders"
            title="Bridal Orders"
          />
          <button
            onClick={() => setShowAddOrder(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          label="Total Orders"
          value={summary.totalOrders}
          icon={<ShoppingBag className="h-4 w-4 text-gray-500" />}
          color="gray"
        />
        <SummaryCard
          label="Confirmed"
          value={summary.confirmed}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          color="emerald"
        />
        <SummaryCard
          label="On Hold"
          value={summary.onHold}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          color="amber"
        />
        <SummaryCard
          label="Revenue Pipeline"
          value={formatCurrency(summary.totalRevenuePipeline)}
          sub="Confirmed + completed"
          icon={<CreditCard className="h-4 w-4 text-blue-500" />}
          color="blue"
        />
        <SummaryCard
          label="Deposits Collected"
          value={formatCurrency(summary.depositsCollected)}
          icon={<CreditCard className="h-4 w-4 text-purple-500" />}
          color="purple"
        />
        <SummaryCard
          label="Outstanding"
          value={formatCurrency(summary.outstandingBalance)}
          sub="Revenue minus paid"
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          color="red"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                statusFilter === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab.label}
              <span className="ml-1 text-gray-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No orders found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {statusFilter !== 'all'
                ? `No ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} orders for ${yearFilter}.`
                : `No orders for ${yearFilter} yet. Create your first order to get started.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dress Style
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dress Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Wedding Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Deposit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Next Payment
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onAddPayment={handleAddPayment}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddOrderDialog
        open={showAddOrder}
        onClose={() => setShowAddOrder(false)}
        onSuccess={handleSuccess}
      />
      <AddPaymentDialog
        open={showAddPayment}
        orderId={paymentOrderId}
        onClose={() => {
          setShowAddPayment(false);
          setPaymentOrderId(null);
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
