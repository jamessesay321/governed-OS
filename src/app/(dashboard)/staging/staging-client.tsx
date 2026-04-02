'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CATEGORY_META,
  STANDARD_CATEGORIES,
  type StandardCategory,
} from '@/lib/financial/taxonomy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'waiting-room' | 'account-mapping' | 'checkpoints';

interface StagedTransaction {
  id: string;
  source: string;
  source_id: string;
  raw_data: Record<string, unknown>;
  status: 'pending' | 'matched' | 'conflict' | 'approved' | 'rejected';
  confidence_score: number;
  matched_with: { source: string; source_id: string }[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface RealAccountMapping {
  id: string;
  org_id: string;
  account_id: string;
  standard_category: string;
  ai_confidence: number | null;
  ai_suggested: boolean;
  ai_reasoning: string | null;
  user_confirmed: boolean;
  user_overridden: boolean;
  version?: number;
  locked?: boolean;
  created_at: string;
  updated_at: string;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  class: string;
}

interface MappingSuggestion {
  code: string;
  name: string;
  category: string;
  confidence: number;
  reasoning: string;
}

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface Checkpoint {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  data: { checklist?: ChecklistItem[]; [key: string]: unknown };
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Status badge colours
// ---------------------------------------------------------------------------

const statusColours: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  matched: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  conflict: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs sm:px-2.5 font-medium whitespace-nowrap ${statusColours[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const colour =
    pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : pct >= 50 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category select dropdown
// ---------------------------------------------------------------------------

function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  // Group categories by P&L section for better UX
  const sections = [
    { label: 'Revenue', cats: STANDARD_CATEGORIES.filter((c) => CATEGORY_META[c].pnlSection === 'revenue') },
    { label: 'Other Income', cats: STANDARD_CATEGORIES.filter((c) => CATEGORY_META[c].pnlSection === 'other_income') },
    { label: 'Cost of Sales', cats: STANDARD_CATEGORIES.filter((c) => CATEGORY_META[c].pnlSection === 'cost_of_sales') },
    { label: 'Operating Expenses', cats: STANDARD_CATEGORIES.filter((c) => CATEGORY_META[c].pnlSection === 'operating_expenses') },
    { label: 'Tax', cats: STANDARD_CATEGORIES.filter((c) => CATEGORY_META[c].pnlSection === 'tax') },
    { label: 'Balance Sheet', cats: STANDARD_CATEGORIES.filter((c) => CATEGORY_META[c].pnlSection === 'balance_sheet') },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border bg-background px-2 py-1 text-xs w-full max-w-[200px]"
    >
      {sections.map((section) => (
        <optgroup key={section.label} label={section.label}>
          {section.cats.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_META[cat].label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StagingClientProps {
  orgId: string;
  initialMappings: RealAccountMapping[];
  initialAccounts: ChartAccount[];
  initialSuggestions: MappingSuggestion[];
  unmappedCount: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StagingClient({
  orgId,
  initialMappings,
  initialAccounts,
  initialSuggestions,
  unmappedCount: initialUnmappedCount,
}: StagingClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('account-mapping');
  const [loading, setLoading] = useState(false);

  // Waiting room state
  const [transactions, setTransactions] = useState<StagedTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Account mapping state (real data)
  const [mappings, setMappings] = useState<RealAccountMapping[]>(initialMappings);
  const [accounts] = useState<ChartAccount[]>(initialAccounts);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>(initialSuggestions);
  const [unmappedCount, setUnmappedCount] = useState(initialUnmappedCount);
  const [autoMapping, setAutoMapping] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());

  // Checkpoint state
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Account lookup
  const accountById = new Map<string, ChartAccount>();
  for (const acc of accounts) {
    accountById.set(acc.id, acc);
  }

  // ── Data fetching ──

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/staging/transactions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch staged transactions', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const refreshMappings = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts/map/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings ?? []);
        setSuggestions(data.suggestions ?? []);
        setUnmappedCount(data.unmappedCount ?? 0);
      }
    } catch (err) {
      console.error('Failed to refresh mappings', err);
    }
  }, [orgId]);

  const fetchCheckpoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staging/checkpoints');
      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data.checkpoints ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch checkpoints', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'waiting-room') fetchTransactions();
    else if (activeTab === 'checkpoints') fetchCheckpoints();
  }, [activeTab, fetchTransactions, fetchCheckpoints]);

  // ── Account Mapping Actions ──

  async function handleAutoMap() {
    setAutoMapping(true);
    try {
      const res = await fetch(`/api/accounts/map/${orgId}`, { method: 'PUT' });
      if (res.ok) {
        await refreshMappings();
      }
    } catch (err) {
      console.error('Auto-map failed', err);
    } finally {
      setAutoMapping(false);
    }
  }

  async function handleConfirmAll() {
    // Confirm all current mappings (with any overrides applied)
    setConfirmingAll(true);
    try {
      const confirmPayload = mappings
        .filter((m) => !m.user_confirmed)
        .map((m) => ({
          account_id: m.account_id,
          standard_category: overrides[m.account_id] ?? m.standard_category,
        }));

      if (confirmPayload.length === 0) return;

      const res = await fetch(`/api/accounts/map/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: confirmPayload }),
      });

      if (res.ok) {
        setOverrides({});
        await refreshMappings();
      }
    } catch (err) {
      console.error('Confirm all failed', err);
    } finally {
      setConfirmingAll(false);
    }
  }

  async function handleConfirmSingle(accountId: string) {
    const mapping = mappings.find((m) => m.account_id === accountId);
    if (!mapping) return;

    try {
      const res = await fetch(`/api/accounts/map/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: [{
            account_id: accountId,
            standard_category: overrides[accountId] ?? mapping.standard_category,
          }],
        }),
      });

      if (res.ok) {
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[accountId];
          return next;
        });
        await refreshMappings();
      }
    } catch (err) {
      console.error('Confirm failed', err);
    }
  }

  function handleOverride(accountId: string, newCategory: string) {
    setOverrides((prev) => ({ ...prev, [accountId]: newCategory }));
  }

  function toggleReasoning(accountId: string) {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }

  // ── Waiting Room Actions ──

  async function handleApprove(txId: string) {
    try {
      await fetch('/api/staging/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, action: 'approve' }),
      });
      fetchTransactions();
    } catch (err) {
      console.error('Approve failed', err);
    }
  }

  async function handleReject(txId: string) {
    try {
      await fetch('/api/staging/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, action: 'reject', reason: rejectReason }),
      });
      setRejectTarget(null);
      setRejectReason('');
      fetchTransactions();
    } catch (err) {
      console.error('Reject failed', err);
    }
  }

  async function handleMatchTransactions() {
    try {
      await fetch('/api/staging/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'match' }),
      });
      fetchTransactions();
    } catch (err) {
      console.error('Match failed', err);
    }
  }

  async function handlePromoteApproved() {
    try {
      await fetch('/api/staging/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promote' }),
      });
      fetchTransactions();
    } catch (err) {
      console.error('Promote failed', err);
    }
  }

  // ── Checkpoint Actions ──

  async function handleCompleteCheckpoint(checkpointId: string) {
    try {
      await fetch('/api/staging/checkpoints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointId, action: 'complete' }),
      });
      fetchCheckpoints();
    } catch (err) {
      console.error('Complete checkpoint failed', err);
    }
  }

  async function handleSkipCheckpoint(checkpointId: string) {
    try {
      await fetch('/api/staging/checkpoints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointId, action: 'skip' }),
      });
      fetchCheckpoints();
    } catch (err) {
      console.error('Skip checkpoint failed', err);
    }
  }

  // ── Computed values ──

  const confirmedCount = mappings.filter((m) => m.user_confirmed).length;
  const unconfirmedCount = mappings.filter((m) => !m.user_confirmed).length;
  const highConfidenceCount = mappings.filter((m) => (m.ai_confidence ?? 0) >= 0.8 && !m.user_confirmed).length;
  const lowConfidenceCount = mappings.filter((m) => (m.ai_confidence ?? 0) < 0.6 && !m.user_confirmed).length;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'waiting-room', label: 'Waiting Room' },
    { key: 'account-mapping', label: 'Account Mapping', badge: unconfirmedCount > 0 ? unconfirmedCount : undefined },
    { key: 'checkpoints', label: 'Checkpoints' },
  ];

  const filteredTransactions =
    statusFilter === 'all' ? transactions : transactions.filter((t) => t.status === statusFilter);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Data Staging</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review incoming data, map accounts to standard categories, and complete verification checkpoints.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap relative ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-3 text-sm text-muted-foreground">Loading...</span>
        </div>
      )}

      {/* ── WAITING ROOM ── */}
      {activeTab === 'waiting-room' && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="matched">Matched</option>
              <option value="conflict">Conflict</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={handleMatchTransactions}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Run Matching
            </button>

            <button
              onClick={handlePromoteApproved}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Promote Approved to Live
            </button>

            <span className="ml-auto text-sm text-muted-foreground">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Confidence</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Matches</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No staged transactions found.
                    </td>
                  </tr>
                )}
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium">
                        {tx.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {(tx.raw_data.reference as string) ?? tx.source_id}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tx.raw_data.date
                        ? new Date(tx.raw_data.date as string).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {tx.raw_data.amount != null
                        ? Number(tx.raw_data.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBar score={tx.confidence_score} />
                    </td>
                    <td className="px-4 py-3">
                      {tx.matched_with.length > 0 ? (
                        <div className="space-y-1">
                          {tx.matched_with.map((m, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            >
                              {m.source}: {m.source_id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(tx.status === 'pending' || tx.status === 'matched' || tx.status === 'conflict') && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(tx.id)}
                            className="rounded px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(tx.id)}
                            className="rounded px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reject modal */}
          {rejectTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Reject Transaction</h3>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm mb-4"
                  rows={3}
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(rejectTarget)}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACCOUNT MAPPING ── */}
      {activeTab === 'account-mapping' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Accounts</p>
              <p className="text-xl font-bold">{accounts.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Mapped</p>
              <p className="text-xl font-bold text-blue-600">{mappings.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="text-xl font-bold text-green-600">{confirmedCount}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Needs Review</p>
              <p className="text-xl font-bold text-amber-600">{lowConfidenceCount}</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {unmappedCount > 0 && (
              <button
                onClick={handleAutoMap}
                disabled={autoMapping}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {autoMapping ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Mapping with AI...
                  </span>
                ) : (
                  `Auto-Map ${unmappedCount} Unmapped`
                )}
              </button>
            )}

            {unconfirmedCount > 0 && (
              <button
                onClick={handleConfirmAll}
                disabled={confirmingAll}
                className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300 transition-colors"
              >
                {confirmingAll ? 'Confirming...' : `Confirm All (${unconfirmedCount})`}
              </button>
            )}

            {highConfidenceCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {highConfidenceCount} high-confidence suggestions ready to confirm
              </span>
            )}
          </div>

          {/* Mapping table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Xero Class</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Confidence</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="space-y-2">
                        <p className="text-muted-foreground">No account mappings yet.</p>
                        {accounts.length > 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Click &quot;Auto-Map&quot; to let AI suggest categories for your {accounts.length} accounts.
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Connect Xero and sync your chart of accounts first.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {mappings.map((m) => {
                  const account = accountById.get(m.account_id);
                  if (!account) return null;

                  const currentCategory = overrides[m.account_id] ?? m.standard_category;
                  const meta = CATEGORY_META[currentCategory as StandardCategory];
                  const isOverridden = !!overrides[m.account_id];
                  const showReasoning = expandedReasoning.has(m.account_id);

                  return (
                    <tr
                      key={m.id}
                      className={`border-b last:border-0 hover:bg-muted/30 ${
                        !m.user_confirmed && (m.ai_confidence ?? 0) < 0.6
                          ? 'bg-amber-50/50 dark:bg-amber-900/5'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{account.code}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{account.name}</span>
                          {m.ai_reasoning && (
                            <button
                              onClick={() => toggleReasoning(m.account_id)}
                              className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                            >
                              {showReasoning ? 'hide' : 'why?'}
                            </button>
                          )}
                        </div>
                        {showReasoning && m.ai_reasoning && (
                          <p className="mt-1 text-xs text-muted-foreground italic">
                            {m.ai_reasoning}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs">
                          {account.class}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.user_confirmed && !isOverridden ? (
                          <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium">
                            {meta?.label ?? currentCategory}
                          </span>
                        ) : (
                          <CategorySelect
                            value={currentCategory}
                            onChange={(val) => handleOverride(m.account_id, val)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBar score={m.ai_confidence ?? 0} />
                      </td>
                      <td className="px-4 py-3">
                        {m.user_confirmed ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Confirmed
                          </span>
                        ) : m.ai_suggested ? (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            AI Suggested
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Blueprint
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(!m.user_confirmed || isOverridden) && (
                          <button
                            onClick={() => handleConfirmSingle(m.account_id)}
                            className="rounded px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 transition-colors"
                          >
                            {isOverridden ? 'Save' : 'Confirm'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* AI suggestions for unmapped accounts */}
          {suggestions.length > 0 && (
            <div className="rounded-lg border border-dashed border-purple-300 dark:border-purple-700 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                New AI Suggestions ({suggestions.length} unmapped accounts)
              </h3>
              <p className="text-xs text-muted-foreground">
                These accounts don&apos;t have mappings yet. Review and save them to your mapping table.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Suggested Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Confidence</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => (
                      <tr key={s.code} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                            {CATEGORY_META[s.category as StandardCategory]?.label ?? s.category}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <ConfidenceBar score={s.confidence} />
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                          {s.reasoning}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CHECKPOINTS ── */}
      {activeTab === 'checkpoints' && !loading && (
        <div className="space-y-4">
          {checkpoints.length === 0 && (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              No active checkpoints. They are created automatically after data syncs, at month-end, and during onboarding.
            </div>
          )}

          {checkpoints.map((cp) => {
            const checklist = cp.data.checklist ?? [];
            const completedItems = checklist.filter((item: ChecklistItem) => item.done).length;
            const totalItems = checklist.length;
            const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            return (
              <div key={cp.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold capitalize">
                        {cp.type.replace('_', ' ')}
                      </h3>
                      <StatusBadge status={cp.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(cp.created_at).toLocaleDateString()}
                      {cp.due_date && (
                        <> &middot; Due {new Date(cp.due_date).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>

                  {(cp.status === 'pending' || cp.status === 'in_progress') && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCompleteCheckpoint(cp.id)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleSkipCheckpoint(cp.id)}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>

                {totalItems > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {completedItems} of {totalItems} items
                      </span>
                      <span className="text-xs font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {totalItems > 0 && (
                  <div className="space-y-2">
                    {checklist.map((item: ChecklistItem, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center ${
                            item.done
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {item.done && (
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={item.done ? 'text-muted-foreground line-through' : ''}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
