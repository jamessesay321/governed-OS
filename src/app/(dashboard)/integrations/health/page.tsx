'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Plug,
  RefreshCw,
  ShieldCheck,
  XCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HealthStatus = 'healthy' | 'warning' | 'error' | 'inactive';

type ConnectedIntegration = {
  name: string;
  colour: string;
  status: HealthStatus;
  lastSync: string;
  dataQuality: number;
  recordCount: number;
};

type SyncError = {
  id: string;
  integration: string;
  message: string;
  timestamp: string;
  severity: 'error' | 'warning';
};

// ---------------------------------------------------------------------------
// Demo data (replace with real data when backend is wired up)
// ---------------------------------------------------------------------------

const CONNECTED_INTEGRATIONS: ConnectedIntegration[] = [
  {
    name: 'Xero',
    colour: '#13B5EA',
    status: 'healthy',
    lastSync: '2 minutes ago',
    dataQuality: 98,
    recordCount: 12847,
  },
];

const SYNC_ERRORS: SyncError[] = [
  { id: '1', integration: 'Xero', message: 'Rate limit reached during invoice sync. Retrying in 60s.', timestamp: '12 min ago', severity: 'warning' },
  { id: '2', integration: 'Xero', message: 'Duplicate contact detected: "Acme Corp" matched 2 records.', timestamp: '1 hour ago', severity: 'warning' },
  { id: '3', integration: 'Xero', message: 'Currency conversion failed for 3 transactions (missing exchange rate).', timestamp: '3 hours ago', severity: 'error' },
  { id: '4', integration: 'Xero', message: 'Partial sync: 4 archived invoices skipped per filter rules.', timestamp: '5 hours ago', severity: 'warning' },
  { id: '5', integration: 'Xero', message: 'API timeout during bank transaction pull. Recovered on retry.', timestamp: '8 hours ago', severity: 'warning' },
  { id: '6', integration: 'Xero', message: 'Schema change detected in Xero line items. Mapping updated.', timestamp: '1 day ago', severity: 'warning' },
  { id: '7', integration: 'Xero', message: 'Missing tracking category on 12 expense records.', timestamp: '1 day ago', severity: 'warning' },
  { id: '8', integration: 'Xero', message: 'Sync completed with 2 unresolved field mapping warnings.', timestamp: '2 days ago', severity: 'warning' },
  { id: '9', integration: 'Xero', message: 'Token refresh succeeded after initial auth failure.', timestamp: '2 days ago', severity: 'warning' },
  { id: '10', integration: 'Xero', message: 'Journal entry import failed: invalid account code "9999".', timestamp: '3 days ago', severity: 'error' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function overallHealthScore(integrations: ConnectedIntegration[]): number {
  if (integrations.length === 0) return 0;
  const total = integrations.reduce((sum, i) => sum + i.dataQuality, 0);
  return Math.round(total / integrations.length);
}

function statusConfig(status: HealthStatus) {
  switch (status) {
    case 'healthy':
      return { label: 'Healthy', icon: CheckCircle2, colour: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500' };
    case 'warning':
      return { label: 'Warning', icon: AlertTriangle, colour: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500' };
    case 'error':
      return { label: 'Error', icon: XCircle, colour: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', dot: 'bg-red-500' };
    case 'inactive':
      return { label: 'Inactive', icon: Clock, colour: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', dot: 'bg-gray-400' };
  }
}

function qualityColour(score: number): string {
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function qualityBarColour(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverallScoreCard({ integrations }: { integrations: ConnectedIntegration[] }) {
  const score = overallHealthScore(integrations);
  const healthy = integrations.filter((i) => i.status === 'healthy').length;
  const warnings = integrations.filter((i) => i.status === 'warning').length;
  const errors = integrations.filter((i) => i.status === 'error').length;

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-card">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Score */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
              <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Data Health</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-3xl font-bold ${qualityColour(score)}`}>{score}%</span>
                <span className="text-xs text-muted-foreground">quality score</span>
              </div>
            </div>
          </div>

          {/* Status counts */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{healthy}</p>
              <p className="text-[10px] text-muted-foreground">Healthy</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600">{warnings}</p>
              <p className="text-[10px] text-muted-foreground">Warnings</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{errors}</p>
              <p className="text-[10px] text-muted-foreground">Errors</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{integrations.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationHealthRow({
  integration,
  onResync,
  syncing,
}: {
  integration: ConnectedIntegration;
  onResync: () => void;
  syncing: boolean;
}) {
  const config = statusConfig(integration.status);
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: integration.colour }}
        >
          {integration.name.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold">{integration.name}</h4>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.colour}`}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last sync: {integration.lastSync}
            </span>
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              {integration.recordCount.toLocaleString()} records
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:flex-shrink-0">
        {/* Quality score */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Quality</span>
              <span className={`font-semibold ${qualityColour(integration.dataQuality)}`}>
                {integration.dataQuality}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all ${qualityBarColour(integration.dataQuality)}`}
                style={{ width: `${integration.dataQuality}%` }}
              />
            </div>
          </div>
        </div>

        {/* Re-sync button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onResync}
          disabled={syncing}
          className="gap-1.5"
        >
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {syncing ? 'Syncing...' : 'Re-sync'}
        </Button>
      </div>
    </div>
  );
}

function SyncErrorLog({ errors }: { errors: SyncError[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Sync Error Log
        </CardTitle>
        <CardDescription>Last 10 sync issues across all integrations</CardDescription>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">All clear</p>
            <p className="text-xs text-muted-foreground mt-0.5">No sync errors in the log.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {errors.map((err) => (
              <div
                key={err.id}
                className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
              >
                {err.severity === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed">{err.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{err.integration}</Badge>
                    <span className="text-[10px] text-muted-foreground">{err.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Activity className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-1">No integrations connected</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Connect at least one integration to monitor data health, sync status and quality scores.
        </p>
        <Link href="/integrations/catalogue">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            <Plug className="h-4 w-4" />
            Browse Catalogue
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DataHealthPage() {
  const [syncingSet, setSyncingSet] = useState<Set<string>>(new Set());

  // In production this would come from a server component / API.
  // For now we show demo data when Xero is connected.
  const integrations = CONNECTED_INTEGRATIONS;
  const hasIntegrations = integrations.length > 0;

  function handleResync(name: string) {
    setSyncingSet((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
    // Simulate sync duration
    setTimeout(() => {
      setSyncingSet((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }, 3000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Health</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor connection status, sync reliability and data quality across your integrations.
          </p>
        </div>
        <Link href="/integrations/catalogue">
          <Button variant="outline" size="sm" className="mt-2 sm:mt-0 gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            Add Integration
          </Button>
        </Link>
      </div>

      {!hasIntegrations ? (
        <EmptyState />
      ) : (
        <>
          {/* Overall score card */}
          <OverallScoreCard integrations={integrations} />

          {/* Connection status list */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Plug className="h-4 w-4 text-muted-foreground" />
              Connection Status
            </h3>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <IntegrationHealthRow
                  key={integration.name}
                  integration={integration}
                  onResync={() => handleResync(integration.name)}
                  syncing={syncingSet.has(integration.name)}
                />
              ))}
            </div>
          </div>

          {/* Sync error log */}
          <SyncErrorLog errors={SYNC_ERRORS} />

          {/* Helpful tip */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Data health checks run automatically every 15 minutes. Use Re-sync to trigger an immediate refresh.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
