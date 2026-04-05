'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InvestorInfo {
  id: string;
  investorUserId: string | null;
  displayName: string;
  accessLevel: string;
  createdAt: string;
  acceptedAt: string | null;
  expired: boolean;
}

interface SharedMetricRow {
  id: string;
  metric_key: string;
  is_shared: boolean;
}

interface MetricOption {
  key: string;
  label: string;
}

interface InvestorSettingsClientProps {
  orgId: string;
  investors: InvestorInfo[];
  sharedMetrics: SharedMetricRow[];
  availableMetricKeys: MetricOption[];
}

export function InvestorSettingsClient({
  orgId,
  investors: initialInvestors,
  sharedMetrics: initialMetrics,
  availableMetricKeys,
}: InvestorSettingsClientProps) {
  const [investors, setInvestors] = useState(initialInvestors);
  const [sharedMetrics, setSharedMetrics] = useState(initialMetrics);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [metricsSaving, setMetricsSaving] = useState(false);

  // Build a set of shared metric keys for easy lookup
  const sharedKeySet = new Set(
    sharedMetrics.filter((m) => m.is_shared).map((m) => m.metric_key)
  );

  async function handleInvite() {
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const res = await fetch('/api/auth/investor-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteMessage({ type: 'error', text: data.error || 'Failed to send invite' });
        return;
      }

      setInviteMessage({ type: 'success', text: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');

      // Refresh the investor list (optimistic: add a pending row)
      setInvestors((prev) => [
        {
          id: data.inviteId,
          investorUserId: null,
          displayName: 'Pending',
          accessLevel: 'read',
          createdAt: new Date().toISOString(),
          acceptedAt: null,
          expired: false,
        },
        ...prev,
      ]);
    } catch {
      setInviteMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRevoke(investorId: string) {
    setRevoking(investorId);
    try {
      const res = await fetch('/api/investor/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investorOrgId: investorId, orgId }),
      });

      if (res.ok) {
        setInvestors((prev) => prev.filter((i) => i.id !== investorId));
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setRevoking(null);
    }
  }

  async function handleMetricToggle(metricKey: string, isCurrentlyShared: boolean) {
    setMetricsSaving(true);

    // Optimistic update
    if (isCurrentlyShared) {
      setSharedMetrics((prev) =>
        prev.map((m) => (m.metric_key === metricKey ? { ...m, is_shared: false } : m))
      );
    } else {
      const existing = sharedMetrics.find((m) => m.metric_key === metricKey);
      if (existing) {
        setSharedMetrics((prev) =>
          prev.map((m) => (m.metric_key === metricKey ? { ...m, is_shared: true } : m))
        );
      } else {
        setSharedMetrics((prev) => [
          ...prev,
          { id: crypto.randomUUID(), metric_key: metricKey, is_shared: true },
        ]);
      }
    }

    try {
      await fetch('/api/investor/shared-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          metricKey,
          isShared: !isCurrentlyShared,
        }),
      });
    } catch {
      // Revert on error
      setSharedMetrics(initialMetrics);
    } finally {
      setMetricsSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Investor Access</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage which investors can view your financial data and control what they see.
        </p>
      </div>

      {/* Invite New Investor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Investor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="text-sm">
                Investor Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="investor@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
          {inviteMessage && (
            <p
              className={`text-sm mt-2 ${
                inviteMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {inviteMessage.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current Investors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Current Investors ({investors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No investors invited yet. Use the form above to send an invite.
            </p>
          ) : (
            <div className="space-y-3">
              {investors.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <svg
                        className="h-4 w-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{inv.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited{' '}
                        {new Date(inv.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {inv.acceptedAt ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    ) : inv.expired ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={revoking === inv.id}
                  >
                    {revoking === inv.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared Metrics Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared KPIs</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which financial metrics investors can see. Unchecked metrics will be hidden
            from the investor dashboard.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableMetricKeys.map((metric) => {
              const isShared = sharedKeySet.has(metric.key);
              return (
                <label
                  key={metric.key}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={() => handleMetricToggle(metric.key, isShared)}
                    disabled={metricsSaving}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">{metric.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
