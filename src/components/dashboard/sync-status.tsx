'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

interface SyncStatusProps {
  connected: boolean;
  lastSync: {
    status: string;
    recordsSynced: number;
    startedAt: string;
    completedAt: string | null;
    error: string | null;
  } | null;
  canSync: boolean;
  canConnect: boolean;
}

export function SyncStatus({
  connected,
  lastSync,
  canSync,
  canConnect,
}: SyncStatusProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/xero/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setSyncResult(`Synced ${data.recordsSynced} records`);
      } else {
        setSyncResult(`Sync failed: ${data.error}`);
      }
    } catch {
      setSyncResult('Sync failed: Network error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Xero Connection</CardTitle>
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? 'Connected' : 'Not Connected'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {lastSync && (
          <div className="text-sm text-muted-foreground">
            <p>
              Last sync:{' '}
              {lastSync.completedAt
                ? new Date(lastSync.completedAt).toLocaleString()
                : 'In progress'}
            </p>
            <p>
              Status:{' '}
              <Badge
                variant={
                  lastSync.status === 'completed'
                    ? 'default'
                    : lastSync.status === 'running'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {lastSync.status}
              </Badge>
            </p>
            {lastSync.recordsSynced > 0 && (
              <p>{lastSync.recordsSynced} records synced</p>
            )}
            {lastSync.error && (
              <p className="text-red-600">{lastSync.error}</p>
            )}
          </div>
        )}

        {syncResult && (
          <p className="text-sm text-muted-foreground">{syncResult}</p>
        )}

        <div className="flex gap-2">
          {connected && canSync && (
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
          {!connected && canConnect && (
            <Button size="sm" asChild>
              <a href="/api/xero/connect">Connect Xero</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
