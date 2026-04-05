'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, Trash2, ShieldAlert, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { ROLE_HIERARCHY, type Role } from '@/types';

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type DeletionRequest = {
  id: string;
  status: string;
  confirmationToken: string | null;
  coolingOffUntil: string | null;
  createdAt: string;
  reason: string | null;
};

/* ------------------------------------------------------------------ */
/*  Countdown hook                                                      */
/* ------------------------------------------------------------------ */

function useCountdown(targetDate: string | null): string {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;

    function update() {
      const target = new Date(targetDate!).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Cooling-off period complete');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function DataSettingsClient({
  orgId,
  role,
  deletionRequest: initialRequest,
}: {
  orgId: string;
  userId: string;
  role: string;
  deletionRequest: DeletionRequest | null;
}) {
  const [deletionRequest, setDeletionRequest] = useState(initialRequest);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const isOwner = hasMinRole(role as Role, 'owner');
  const countdown = useCountdown(deletionRequest?.coolingOffUntil ?? null);

  // Check URL for confirmation token
  const handleConfirmFromUrl = useCallback(async (token: string) => {
    setLoading('confirm');
    setError(null);

    try {
      const res = await fetch('/api/gdpr/confirm-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationToken: token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to confirm deletion');
        return;
      }

      setSuccess(data.message);
      // Reload to get updated state
      window.location.href = '/settings/data';
    } catch {
      setError('Failed to confirm deletion');
    } finally {
      setLoading(null);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmToken = params.get('confirm');
    if (confirmToken) {
      handleConfirmFromUrl(confirmToken);
    }
  }, [handleConfirmFromUrl]);

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'financials', format: 'csv' }),
      });

      if (!res.ok) {
        setError('Failed to export data');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grove-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  }

  async function handleRequestDeletion() {
    setLoading('request');
    setError(null);

    try {
      const res = await fetch('/api/gdpr/request-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to request deletion');
        return;
      }

      setSuccess(data.message);
      setDeleteDialogOpen(false);
      setDeleteReason('');
      // Reload to get updated state
      window.location.href = '/settings/data';
    } catch {
      setError('Failed to request deletion');
    } finally {
      setLoading(null);
    }
  }

  async function handleCancelDeletion() {
    if (!deletionRequest) return;
    setLoading('cancel');
    setError(null);

    try {
      const res = await fetch('/api/gdpr/cancel-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: deletionRequest.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel deletion');
        return;
      }

      setSuccess(data.message);
      setDeletionRequest(null);
    } catch {
      setError('Failed to cancel deletion');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>Data & Privacy</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Export your data or request permanent deletion of your organisation's data.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Data Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100">
              <Download className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Export All Data</CardTitle>
              <CardDescription>Download a complete export of your financial data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Export your normalised financials, transactions, KPIs, and audit trail as CSV files.
            This is recommended before requesting data deletion.
          </p>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'Exporting...' : 'Export Data'}
          </button>
        </CardContent>
      </Card>

      {/* Pending Deletion Status */}
      {deletionRequest && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base text-red-700">Deletion In Progress</CardTitle>
                <CardDescription>
                  Requested {new Date(deletionRequest.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge
                variant={deletionRequest.status === 'processing' ? 'destructive' : 'secondary'}
                className="capitalize"
              >
                {deletionRequest.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {deletionRequest.status === 'pending' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-md p-3">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>Please check your email and click the confirmation link to proceed.</span>
                </div>
                <button
                  onClick={handleCancelDeletion}
                  disabled={loading === 'cancel'}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {loading === 'cancel' ? 'Cancelling...' : 'Cancel Request'}
                </button>
              </div>
            )}

            {deletionRequest.status === 'confirmed' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-md p-3">
                  <Clock className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">72-hour cooling-off period</p>
                    <p className="text-red-600 font-mono text-lg mt-1">{countdown}</p>
                    <p className="mt-1 text-red-500">
                      After this period, all data will be permanently deleted.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelDeletion}
                  disabled={loading === 'cancel'}
                  className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {loading === 'cancel' ? 'Cancelling...' : 'Cancel Deletion'}
                </button>
              </div>
            )}

            {deletionRequest.status === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-md p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />
                <span>Deletion is currently being processed. This cannot be undone.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Request Deletion */}
      {isOwner && !deletionRequest && (
        <Card className="border-red-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-100">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-base">Delete Organisation Data</CardTitle>
                <CardDescription>Permanently delete all data associated with your organisation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm">
                <p className="font-medium text-amber-800 mb-2">This is a permanent action</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>All financial data, transactions, and connections will be deleted</li>
                  <li>All scenarios, KPIs, vault items, and budgets will be removed</li>
                  <li>Team member profiles will be deleted</li>
                  <li>Audit logs will be retained for compliance</li>
                  <li>A 72-hour cooling-off period applies after confirmation</li>
                </ul>
              </div>

              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                    <Trash2 className="h-4 w-4" />
                    Request Deletion
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Data Deletion</DialogTitle>
                    <DialogDescription>
                      This will begin the deletion process. You will receive a confirmation email,
                      followed by a 72-hour cooling-off period before data is permanently removed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Reason (optional)
                      </label>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Why are you requesting deletion?"
                        className="w-full rounded-md border border-gray-300 p-3 text-sm resize-none h-24 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        maxLength={1000}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <button
                      onClick={() => setDeleteDialogOpen(false)}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestDeletion}
                      disabled={loading === 'request'}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {loading === 'request' ? 'Requesting...' : 'Request Deletion'}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {!isOwner && !deletionRequest && (
        <Card className="border-gray-200">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <ShieldAlert className="h-5 w-5" />
              <p className="text-sm">Only organisation owners can request data deletion.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
