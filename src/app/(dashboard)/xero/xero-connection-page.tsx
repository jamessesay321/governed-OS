'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SyncLog = {
  id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

type Feedback = {
  success: boolean;
  error: string | null;
  tenantName: string | null;
  recordsSynced: number | null;
  syncWarning: string | null;
};

type Props = {
  connected: boolean;
  connectionDate: string | null;
  canConnect: boolean;
  canSync: boolean;
  syncLogs: SyncLog[];
  feedback: Feedback;
};

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'Xero integration is not configured. Please contact your platform administrator.',
  insufficient_role: 'You need admin permissions to connect Xero. Ask an admin to set up the connection.',
  missing_params: 'Connection failed — missing authorisation parameters from Xero.',
  invalid_state: 'Connection failed — invalid security token. Please try again.',
  org_mismatch: 'Connection failed — organisation mismatch. Please try again.',
  token_exchange: 'Connection failed — could not exchange authorisation code. Check your Xero app credentials.',
  connections_failed: 'Connection failed — could not fetch Xero tenant. Please try again.',
  no_tenants: 'No Xero organisations found. Ensure you have at least one organisation in your Xero account.',
  unexpected: 'An unexpected error occurred. Please try again.',
};

export function XeroConnectionPage({ connected, connectionDate, canConnect, canSync, syncLogs, feedback }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; records: number; error?: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

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

  async function handleDisconnect() {
    if (!confirm('Disconnect from Xero? Your synced data will be preserved.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/xero/disconnect', { method: 'POST' });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Xero Integration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your Xero account to automatically import financial data.
        </p>
      </div>

      {/* Feedback banners */}
      {feedback.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">
              Connected to {feedback.tenantName || 'Xero'} successfully!
            </p>
          </div>
          {feedback.recordsSynced != null && feedback.recordsSynced > 0 && (
            <p className="text-sm text-green-700 mt-1 ml-7">
              Initial sync complete — {feedback.recordsSynced.toLocaleString()} records imported.
            </p>
          )}
          {feedback.syncWarning && (
            <p className="text-sm text-yellow-700 mt-1 ml-7">
              Note: {feedback.syncWarning}
            </p>
          )}
        </div>
      )}

      {feedback.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-red-800">
              {ERROR_MESSAGES[feedback.error] || `Connection error: ${feedback.error}`}
            </p>
          </div>
        </div>
      )}

      {/* Connection card */}
      <div className="rounded-lg border">
        {!connected ? (
          /* Disconnected state — prominent connect CTA */
          <div className="p-8 text-center">
            {/* Xero logo */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#13B5EA]/10">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#13B5EA]" fill="currentColor">
                <path d="M5.56 10.94l3.5-3.5a.75.75 0 011.06 1.06L7.19 11.44l2.94 2.94a.75.75 0 01-1.06 1.06l-3.5-3.5a.75.75 0 010-1.06zm5.38 0l3.5-3.5a.75.75 0 011.06 1.06L12.56 11.44l2.94 2.94a.75.75 0 01-1.06 1.06l-3.5-3.5a.75.75 0 010-1.06z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect to Xero</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Securely connect your Xero account. We&apos;ll automatically import your chart of accounts, invoices, and bank transactions.
            </p>
            {canConnect ? (
              <a
                href="/api/xero/connect"
                className="inline-flex items-center gap-2 rounded-lg bg-[#13B5EA] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#0e9bc7] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect to Xero
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask an admin to connect your Xero account.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Read-only access. We never modify your Xero data.
            </p>
          </div>
        ) : (
          /* Connected state */
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Xero Connected</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated {connectionDate ? new Date(connectionDate).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canSync && (
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
                        Sync Now
                      </>
                    )}
                  </button>
                )}
                {canConnect && (
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                )}
              </div>
            </div>

            {/* Sync result feedback */}
            {syncResult && (
              <div className={`mt-4 rounded-lg p-3 text-sm ${syncResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {syncResult.success
                  ? `Sync complete — ${syncResult.records.toLocaleString()} records updated.`
                  : `Sync failed: ${syncResult.error || 'Unknown error'}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync history */}
      {syncLogs.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Sync History</h3>
          </div>
          <div className="divide-y">
            {syncLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    log.status === 'completed' ? 'bg-green-500' :
                    log.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`} />
                  <span className="text-muted-foreground">
                    {new Date(log.started_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {log.records_synced.toLocaleString()} records
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    log.status === 'completed' ? 'bg-green-100 text-green-800' :
                    log.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
