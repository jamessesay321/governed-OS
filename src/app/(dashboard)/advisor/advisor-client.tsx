'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting/currency';

interface ClientSummary {
  client_org_id: string;
  org_name: string;
  industry: string | null;
  revenue: number | null;
  cash_position: number | null;
  health_score: number | null;
  last_sync: string | null;
}

interface AdvisorPortfolioClientProps {
  clients: ClientSummary[];
}

function getHealthColor(score: number | null): {
  bg: string;
  text: string;
  label: string;
} {
  if (score === null) {
    return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'No data' };
  }
  if (score >= 70) {
    return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Healthy' };
  }
  if (score >= 40) {
    return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Watch' };
  }
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'At Risk' };
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function AdvisorPortfolioClient({ clients }: AdvisorPortfolioClientProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  async function handleSwitchToClient(orgId: string) {
    setSwitching(orgId);
    try {
      const res = await fetch('/api/advisor/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
        setTimeout(() => window.location.href = '/dashboard', 150);
      }
    } catch (err) {
      console.error('[AdvisorPortfolio] Failed to switch:', err);
    } finally {
      setSwitching(null);
    }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">No Client Organisations</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You don't have any client organisations linked yet. Contact support to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Summary KPIs
  const totalClients = clients.length;
  const healthyCount = clients.filter((c) => c.health_score !== null && c.health_score >= 70).length;
  const watchCount = clients.filter((c) => c.health_score !== null && c.health_score >= 40 && c.health_score < 70).length;
  const atRiskCount = clients.filter((c) => c.health_score !== null && c.health_score < 40).length;

  return (
    <div className="space-y-6">
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Clients</p>
            <p className="text-2xl font-bold mt-1">{totalClients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Healthy</p>
            <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{healthyCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Watch</p>
            <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-400">{watchCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">At Risk</p>
            <p className="text-2xl font-bold mt-1 text-red-700 dark:text-red-400">{atRiskCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Client cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => {
          const health = getHealthColor(client.health_score);
          const isSwitching = switching === client.client_org_id;

          return (
            <Card
              key={client.client_org_id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
                isSwitching && 'opacity-60 pointer-events-none',
              )}
              onClick={() => handleSwitchToClient(client.client_org_id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold truncate">
                      {client.org_name}
                    </CardTitle>
                    {client.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {client.industry}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn('text-[10px] font-semibold shrink-0 ml-2', health.bg, health.text)}
                  >
                    {client.health_score !== null
                      ? `${Math.round(client.health_score)}% ${health.label}`
                      : health.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Revenue</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {client.revenue !== null ? formatCurrency(client.revenue) : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cash</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {client.cash_position !== null ? formatCurrency(client.cash_position) : '--'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-[10px] text-muted-foreground">
                    Last sync: {formatRelativeDate(client.last_sync)}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {isSwitching ? 'Switching...' : 'View'}
                    <svg className="inline-block ml-0.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
