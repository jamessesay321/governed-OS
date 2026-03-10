'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface XeroActionsProps {
  connected: boolean;
  canConnect: boolean;
  canSync: boolean;
}

export function XeroActions({ connected, canConnect, canSync }: XeroActionsProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch('/api/xero/sync', { method: 'POST' });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/xero/disconnect', { method: 'POST' });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  if (!connected) {
    return (
      <div>
        {canConnect ? (
          <Button asChild>
            <a href="/api/xero/connect">Connect Xero</a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ask an admin to connect your Xero account.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {canSync && (
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      )}
      {canConnect && (
        <Button
          variant="destructive"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      )}
    </div>
  );
}
