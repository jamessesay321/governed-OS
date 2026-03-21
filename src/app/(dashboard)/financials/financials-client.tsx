'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { VisualiseButton } from '@/components/ui/visualise-button';
import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

type PeriodSummary = {
  period: string;
  revenue: number;
  costs: number;
  expenses: number;
  netProfit: number;
  accountLines: number;
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  class: string;
  status: string;
};

type Financial = {
  id: string;
  period: string;
  amount: number;
  transaction_count: number;
  source: string;
  chart_of_accounts: {
    code: string;
    name: string;
    type: string;
    class: string;
  };
};

type Props = {
  periods: PeriodSummary[];
  accounts: Account[];
  financials: Financial[];
  rawTransactionCount: number;
  connected: boolean;
  role: string;
  lastSync: {
    status: string;
    recordsSynced: number;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  } | null;
};

type Tab = 'overview' | 'accounts' | 'detail';

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatPeriod(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' });
}

const CLASS_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  DIRECTCOSTS: 'Cost of Sales',
  EXPENSE: 'Operating Expenses',
  OVERHEADS: 'Overheads',
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
};

export function FinancialsClient({ periods, accounts, financials, rawTransactionCount, connected, role, lastSync }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; records: number; error?: string } | null>(null);

  const canSync = hasMinRole(role as Role, 'advisor');

  // Group accounts by class
  const accountsByClass = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    const cls = a.class.toUpperCase() || 'OTHER';
    if (!acc[cls]) acc[cls] = [];
    acc[cls].push(a);
    return acc;
  }, {});

  // Get financials for selected period
  const periodFinancials = selectedPeriod
    ? financials.filter((f) => f.period === selectedPeriod)
    : [];

  // Group period financials by class
  const periodByClass = periodFinancials.reduce<Record<string, Financial[]>>((acc, f) => {
    const cls = f.chart_of_accounts.class.toUpperCase();
    if (!acc[cls]) acc[cls] = [];
    acc[cls].push(f);
    return acc;
  }, {});

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/xero/sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setSyncResult({
        success: res.ok,
        records: data.recordsSynced ?? 0,
        error: data.error,
      });
      router.refresh();
    } catch {
      setSyncResult({ success: false, records: 0, error: 'Network error' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Data</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {rawTransactionCount > 0
              ? `${rawTransactionCount.toLocaleString()} raw transactions across ${periods.length} periods`
              : 'No financial data imported yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VisualiseButton context="financials" />
          {connected && canSync && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {syncing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync from Xero
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sync result feedback */}
      {syncResult && (
        <div className={`rounded-lg border p-3 text-sm ${syncResult.success ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {syncResult.success
            ? `Sync complete — ${syncResult.records.toLocaleString()} records updated. Page will refresh with new data.`
            : `Sync failed: ${syncResult.error || 'Unknown error'}`}
        </div>
      )}

      {/* Connection / sync status bar */}
      <div className="flex items-center gap-4 rounded-lg border px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-muted-foreground">
            {connected ? 'Xero connected' : 'Xero not connected'}
          </span>
        </div>
        {lastSync && (
          <>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">
              Last sync: {new Date(lastSync.startedAt).toLocaleString()} —{' '}
              <span className={lastSync.status === 'completed' ? 'text-green-600' : lastSync.status === 'running' ? 'text-yellow-600' : 'text-red-600'}>
                {lastSync.status}
              </span>
              {lastSync.status === 'completed' && ` (${lastSync.recordsSynced} records)`}
              {lastSync.status === 'failed' && lastSync.errorMessage && ` — ${lastSync.errorMessage}`}
            </span>
          </>
        )}
        {!connected && (
          <>
            <span className="text-muted-foreground">|</span>
            <Link href="/xero" className="text-primary hover:underline">
              Connect Xero
            </Link>
          </>
        )}
      </div>

      {/* Empty state */}
      {periods.length === 0 && accounts.length === 0 && (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">
            {connected
              ? 'No financial data yet. Click "Sync from Xero" to import your data.'
              : 'Connect your Xero account to import financial data.'}
          </p>
          {!connected && (
            <Link href="/xero" className="mt-4 inline-block rounded-lg bg-[#13B5EA] px-6 py-2 text-sm font-medium text-white hover:bg-[#0e9bc7]">
              Connect to Xero
            </Link>
          )}
        </div>
      )}

      {/* Tabs — only show when there's data */}
      {(periods.length > 0 || accounts.length > 0) && (
        <>
          <div className="flex gap-1 rounded-lg border p-1 w-fit">
            {([['overview', 'Period Overview'], ['accounts', 'Chart of Accounts'], ['detail', 'Period Detail']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period Overview */}
          {tab === 'overview' && (
            <div className="rounded-lg border">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-medium">Monthly Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Period</th>
                      <th className="px-4 py-2 text-right font-medium">Revenue</th>
                      <th className="px-4 py-2 text-right font-medium">Cost of Sales</th>
                      <th className="px-4 py-2 text-right font-medium">Expenses</th>
                      <th className="px-4 py-2 text-right font-medium">Net Profit</th>
                      <th className="px-4 py-2 text-right font-medium">Lines</th>
                      <th className="px-4 py-2 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {periods.map((p) => (
                      <tr key={p.period} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{formatPeriod(p.period)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(p.revenue)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(p.costs)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(p.expenses)}</td>
                        <td className={`px-4 py-2 text-right font-medium ${p.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(p.netProfit)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{p.accountLines}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => { setSelectedPeriod(p.period); setTab('detail'); }}
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {periods.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No financial data imported yet. Connect and sync Xero to get started.
                </p>
              )}
            </div>
          )}

          {/* Chart of Accounts */}
          {tab === 'accounts' && (
            <div className="space-y-4">
              {Object.entries(accountsByClass).map(([cls, accts]) => (
                <div key={cls} className="rounded-lg border">
                  <div className="border-b px-4 py-3 bg-muted/50">
                    <h3 className="text-sm font-medium">{CLASS_LABELS[cls] || cls} ({accts.length})</h3>
                  </div>
                  <div className="divide-y">
                    {accts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground w-12">{a.code}</span>
                          <span>{a.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{a.type}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${
                            a.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>{a.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No accounts imported yet. Sync Xero to import your chart of accounts.
                </p>
              )}
            </div>
          )}

          {/* Period Detail */}
          {tab === 'detail' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Select period:</label>
                <select
                  value={selectedPeriod ?? ''}
                  onChange={(e) => setSelectedPeriod(e.target.value || null)}
                  className="rounded border px-3 py-1.5 text-sm"
                >
                  <option value="">Choose a period</option>
                  {periods.map((p) => (
                    <option key={p.period} value={p.period}>{formatPeriod(p.period)}</option>
                  ))}
                </select>
              </div>

              {selectedPeriod && periodFinancials.length > 0 ? (
                <div className="space-y-4">
                  {['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'].map((cls) => {
                    const items = periodByClass[cls];
                    if (!items || items.length === 0) return null;
                    const total = items.reduce((sum, f) => sum + Number(f.amount), 0);
                    return (
                      <div key={cls} className="rounded-lg border">
                        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/50">
                          <h3 className="text-sm font-medium">{CLASS_LABELS[cls] || cls}</h3>
                          <span className="text-sm font-medium">{formatCurrency(total)}</span>
                        </div>
                        <div className="divide-y">
                          {items
                            .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
                            .map((f) => (
                            <div key={f.id} className="flex items-center justify-between px-4 py-2 text-sm">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-muted-foreground w-12">{f.chart_of_accounts.code}</span>
                                <span>{f.chart_of_accounts.name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-muted-foreground">{f.transaction_count} txns</span>
                                <span className="font-mono w-28 text-right">{formatCurrency(Number(f.amount))}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedPeriod ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No data for this period.</p>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">Select a period to view account-level detail.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
