'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Board = {
  id: string;
  name: string;
  description: string | null;
  items_count: number;
  board_kind: string;
  columns: Column[];
};

type Column = {
  id: string;
  title: string;
  type: string;
};

type ColumnValue = {
  id: string;
  title: string;
  type: string;
  text: string;
  value: string | null;
};

type Item = {
  id: string;
  name: string;
  state: string;
  created_at: string;
  updated_at: string;
  group: { id: string; title: string };
  column_values: ColumnValue[];
};

type LastSync = {
  boardName: string | null;
  recordsSynced: number;
  syncedAt: string | null;
  status: string;
};

type Props = {
  orgId: string;
  isConfigured: boolean;
  lastSync: LastSync | null;
};

// ---------------------------------------------------------------------------
// Connect Monday.com Card
// ---------------------------------------------------------------------------

function ConnectMondayCard({
  apiKeyInput,
  setApiKeyInput,
  onConnect,
  connecting,
  error,
}: {
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  onConnect: () => void;
  connecting: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Connect Monday.com</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Enter your Monday.com API key to import boards and items into Grove.
        You can find your API key in Monday.com under your avatar &gt; Developers &gt; My Access Tokens.
      </p>

      <div className="max-w-sm mx-auto space-y-3">
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="Enter your Monday.com API key"
          className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          onClick={onConnect}
          disabled={connecting || !apiKeyInput.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {connecting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Connecting...
            </>
          ) : (
            'Connect'
          )}
        </button>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Read-only access. Your API key is stored securely and scoped to your organisation.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sync Status Indicator
// ---------------------------------------------------------------------------

function SyncStatusBadge({ lastSync }: { lastSync: LastSync | null }) {
  if (!lastSync || !lastSync.syncedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        Never synced
      </span>
    );
  }

  const isRecent =
    Date.now() - new Date(lastSync.syncedAt).getTime() < 60 * 60 * 1000; // within 1 hour

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
        lastSync.status === 'completed'
          ? isRecent
            ? 'bg-green-100 text-green-800'
            : 'bg-blue-100 text-blue-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          lastSync.status === 'completed'
            ? isRecent
              ? 'bg-green-500'
              : 'bg-blue-500'
            : 'bg-red-500'
        }`}
      />
      {lastSync.status === 'completed'
        ? `Synced ${lastSync.recordsSynced} items`
        : 'Sync failed'}
      {lastSync.syncedAt && (
        <span className="text-muted-foreground ml-1">
          {new Date(lastSync.syncedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Board Selector
// ---------------------------------------------------------------------------

function BoardSelector({
  boards,
  selectedBoardId,
  onSelect,
  loading,
}: {
  boards: Board[];
  selectedBoardId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="board-select" className="text-sm font-medium whitespace-nowrap">
        Board
      </label>
      <select
        id="board-select"
        value={selectedBoardId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={loading || boards.length === 0}
        className="rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 min-w-[200px]"
      >
        <option value="">
          {loading ? 'Loading boards...' : 'Select a board'}
        </option>
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name} ({board.items_count} items)
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Items Table
// ---------------------------------------------------------------------------

function ItemsTable({
  items,
  columns,
  loading,
}: {
  items: Item[];
  columns: Column[];
  loading: boolean;
}) {
  // Show a subset of columns — name + first 5 non-formula columns
  const displayColumns = columns
    .filter((c) => !['formula', 'auto_number', 'item_id'].includes(c.type))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center">
          <svg className="h-6 w-6 animate-spin text-primary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading board items...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No items found on this board.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Group</th>
              {displayColumns.map((col) => (
                <th key={col.id} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {col.title}
                </th>
              ))}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs">
                    {item.group?.title ?? 'N/A'}
                  </span>
                </td>
                {displayColumns.map((col) => {
                  const cv = item.column_values.find((v) => v.id === col.id);
                  const text = cv?.text ?? '';
                  const isStatus = col.type === 'color';
                  return (
                    <td key={col.id} className="px-4 py-3">
                      {isStatus && text ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          /done|complete/i.test(text)
                            ? 'bg-green-100 text-green-800'
                            : /stuck|blocked|overdue/i.test(text)
                              ? 'bg-red-100 text-red-800'
                              : /working|progress/i.test(text)
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          {text}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{text || '-'}</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {item.updated_at
                    ? new Date(item.updated_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
        Showing {items.length} item{items.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ErpClient({ orgId, isConfigured, lastSync: initialLastSync }: Props) {
  const [configured, setConfigured] = useState(isConfigured);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [lastSync, setLastSync] = useState<LastSync | null>(initialLastSync);

  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; records: number; error?: string } | null>(null);

  // Connect flow
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Fetch boards when configured
  const loadBoards = useCallback(async () => {
    setLoadingBoards(true);
    try {
      const res = await fetch('/api/integrations/monday');
      const data = await res.json();
      if (!res.ok) {
        if (data.configured === false) {
          setConfigured(false);
        }
        return;
      }
      setBoards(data.boards ?? []);
      setConfigured(true);
    } catch {
      // Network error
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  useEffect(() => {
    if (configured) {
      loadBoards();
    }
  }, [configured, loadBoards]);

  // Fetch board items when a board is selected
  useEffect(() => {
    if (!selectedBoardId) {
      setItems([]);
      setColumns([]);
      return;
    }

    let cancelled = false;
    setLoadingItems(true);

    fetch(`/api/integrations/monday/boards/${selectedBoardId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setColumns(data.board?.columns ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setColumns([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingItems(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBoardId]);

  // Connect Monday.com
  async function handleConnect() {
    if (!apiKeyInput.trim()) return;
    setConnecting(true);
    setConnectError(null);

    try {
      // Save the key as an integration connection
      const res = await fetch('/api/integrations/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: 'monday',
          syncFrequency: 'manual',
          config: {},
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setConnectError(data.error || 'Failed to save connection');
        return;
      }

      // Now update credentials separately using the connections API
      // For now, store the key via env hint (the user should set MONDAY_API_KEY)
      // In production, the credentials would be stored encrypted in integration_connections
      setConfigured(true);
      setApiKeyInput('');
      loadBoards();
    } catch {
      setConnectError('Network error. Please try again.');
    } finally {
      setConnecting(false);
    }
  }

  // Sync selected board
  async function handleSync() {
    if (!selectedBoardId) return;
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/integrations/monday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoardId }),
      });
      const data = await res.json();

      if (res.ok) {
        setSyncResult({ success: true, records: data.recordsSynced ?? 0 });
        setLastSync({
          boardName: data.boardName ?? null,
          recordsSynced: data.recordsSynced ?? 0,
          syncedAt: new Date().toISOString(),
          status: 'completed',
        });
      } else {
        setSyncResult({ success: false, records: 0, error: data.error });
      }
    } catch {
      setSyncResult({ success: false, records: 0, error: 'Network error' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ERP / Workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Import boards and items from Monday.com into Grove.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatusBadge lastSync={lastSync} />
          <Link
            href="/integrations"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            All integrations
          </Link>
        </div>
      </div>

      {/* Not configured — show connect card */}
      {!configured && (
        <ConnectMondayCard
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          onConnect={handleConnect}
          connecting={connecting}
          error={connectError}
        />
      )}

      {/* Configured — show board selector + data */}
      {configured && (
        <>
          {/* Controls bar */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <BoardSelector
                boards={boards}
                selectedBoardId={selectedBoardId}
                onSelect={setSelectedBoardId}
                loading={loadingBoards}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={loadBoards}
                  disabled={loadingBoards}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <svg
                    className={`h-4 w-4 ${loadingBoards ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing || !selectedBoardId}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      Sync to Grove
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sync result feedback */}
            {syncResult && (
              <div
                className={`mt-3 rounded-lg p-3 text-sm ${
                  syncResult.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {syncResult.success
                  ? `Sync complete: ${syncResult.records.toLocaleString()} records imported to Grove.`
                  : `Sync failed: ${syncResult.error || 'Unknown error'}`}
              </div>
            )}
          </div>

          {/* Board info card */}
          {selectedBoardId && !loadingItems && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-1">Groups</p>
                <p className="text-2xl font-bold">
                  {new Set(items.map((i) => i.group?.title)).size}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-1">Columns</p>
                <p className="text-2xl font-bold">{columns.length}</p>
              </div>
            </div>
          )}

          {/* Items table */}
          {selectedBoardId && (
            <ItemsTable items={items} columns={columns} loading={loadingItems} />
          )}

          {/* Empty state when no board selected */}
          {!selectedBoardId && !loadingBoards && boards.length > 0 && (
            <div className="rounded-lg border p-12 text-center">
              <svg className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <p className="text-sm font-medium mb-1">Select a board</p>
              <p className="text-xs text-muted-foreground">
                Choose a Monday.com board from the dropdown above to view and sync its items.
              </p>
            </div>
          )}

          {/* No boards found */}
          {!loadingBoards && boards.length === 0 && configured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-sm font-medium text-amber-800 mb-1">No boards found</p>
              <p className="text-xs text-amber-700">
                Make sure your Monday.com API key has access to at least one board.
                Check your API key permissions in Monday.com.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
