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
import { useUser } from '@/components/providers/user-context';

// ─── Types ──────────────────────────────────────────────────────────

type HealthStatus = 'healthy' | 'warning' | 'error' | 'inactive';

type ConnectedIntegration = {
  name: string;
  colour: string;
  status: HealthStatus;
  lastSync: string;
  dataQuality: number;
  recordCount: number;
};

type HealthCheck = {
  name: string;
  score: number;
  status: 'pass' | 'warn' | 'fail';
  message: string;
};

type SyncError = {
  id: string;
  integration: string;
  message: string;
  timestamp: string;
  severity: 'error' | 'warning';
};

type HealthReport = {
  period: string;
  overall_score: number;
  forecast_ready: boolean;
  recommendations: string[];
};

type Props = {
  integration: ConnectedIntegration | null;
  healthReports: HealthReport[];
  checks: HealthCheck[];
  syncErrors: SyncError[];
  orgId: string;
};

// ─── Helpers ────────────────────────────────────────────────────────

const CHECK_LABELS: Record<string, string> = {
  transaction_coverage: 'Transaction Coverage',
  account_mapping_completeness: 'Account Mapping',
  reconciliation_status: 'Reconciliation',
  period_continuity: 'Period Continuity',
  categorisation_quality: 'Categorisation',
  balance_sheet_completeness: 'Balance Sheet',
};

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
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function qualityBarColour(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return ts;
  }
}

function formatPeriod(period: string): string {
  try {
    const d = new Date(period);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  } catch {
    return period;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────

function OverallScoreCard({ score, checks }: { score: number; checks: HealthCheck[] }) {
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  const borderColour = score >= 80
    ? 'border-emerald-200 dark:border-emerald-800'
    : score >= 60
      ? 'border-amber-200 dark:border-amber-800'
      : 'border-red-200 dark:border-red-800';

  const gradientBg = score >= 80
    ? 'from-emerald-50/50 dark:from-emerald-950/20'
    : score >= 60
      ? 'from-amber-50/50 dark:from-amber-950/20'
      : 'from-red-50/50 dark:from-red-950/20';

  return (
    <Card className={`${borderColour} bg-gradient-to-br ${gradientBg} to-white dark:to-card`}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{passCount}</p>
              <p className="text-[10px] text-muted-foreground">Pass</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600">{warnCount}</p>
              <p className="text-[10px] text-muted-foreground">Warn</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{failCount}</p>
              <p className="text-[10px] text-muted-foreground">Fail</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckBreakdown({ checks }: { checks: HealthCheck[] }) {
  if (checks.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Health Checks
        </CardTitle>
        <CardDescription>6 automated checks run after each sync</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => {
            const statusIcon =
              check.status === 'pass' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
              check.status === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
              <XCircle className="h-4 w-4 text-red-500" />;

            return (
              <div key={check.name} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="mt-0.5 flex-shrink-0">{statusIcon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold">
                      {CHECK_LABELS[check.name] ?? check.name}
                    </h4>
                    <span className={`text-xs font-bold ${qualityColour(check.score)}`}>
                      {check.score}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{check.message}</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
                    <div
                      className={`h-1 rounded-full transition-all ${qualityBarColour(check.score)}`}
                      style={{ width: `${check.score}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationRow({
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
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last sync: {integration.lastSync}</span>
            <span className="flex items-center gap-1"><Database className="h-3 w-3" />{integration.recordCount.toLocaleString()} records</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:flex-shrink-0">
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Quality</span>
              <span className={`font-semibold ${qualityColour(integration.dataQuality)}`}>{integration.dataQuality}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className={`h-1.5 rounded-full transition-all ${qualityBarColour(integration.dataQuality)}`} style={{ width: `${integration.dataQuality}%` }} />
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onResync} disabled={syncing} className="gap-1.5">
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {syncing ? 'Syncing...' : 'Re-sync'}
        </Button>
      </div>
    </div>
  );
}

function SyncErrorLog({ errors }: { errors: SyncError[] }) {
  if (errors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Sync Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed py-8 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">All clear</p>
            <p className="text-xs text-muted-foreground mt-0.5">No sync errors in the log.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Sync Error Log
        </CardTitle>
        <CardDescription>Recent sync issues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {errors.map((err) => (
            <div key={err.id} className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
              {err.severity === 'error' ? (
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed">{err.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{err.integration}</Badge>
                  <span className="text-[10px] text-muted-foreground">{formatTimestamp(err.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsCard({ reports }: { reports: HealthReport[] }) {
  const allRecs = reports.flatMap((r) => r.recommendations);
  const uniqueRecs = [...new Set(allRecs)];
  if (uniqueRecs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {uniqueRecs.slice(0, 5).map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <ArrowRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
              {rec}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function HistoryRow({ reports }: { reports: HealthReport[] }) {
  if (reports.length <= 1) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent Periods</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3">
          {reports.map((r) => (
            <div key={r.period} className="rounded-lg border p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{formatPeriod(r.period)}</p>
              <p className={`text-xl font-bold mt-1 ${qualityColour(r.overall_score)}`}>{r.overall_score}%</p>
              {r.forecast_ready ? (
                <Badge className="mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">Forecast Ready</Badge>
              ) : (
                <Badge className="mt-1 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">Needs Work</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Activity className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-1">No integrations connected</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
        Connect your accounting software to monitor data health, sync status and quality scores.
      </p>
      <Link href="/xero">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <Plug className="h-4 w-4" />
          Connect Xero
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function HealthPageClient({
  integration,
  healthReports,
  checks,
  syncErrors,
  orgId,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const { role } = useUser();

  async function handleResync() {
    setSyncing(true);
    try {
      await fetch(`/api/xero/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
    } catch {
      // Non-blocking
    } finally {
      // Allow time for sync to complete before re-enabling button
      setTimeout(() => setSyncing(false), 5000);
    }
  }

  const hasIntegration = !!integration;
  const latestReport = healthReports[0] ?? null;

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
        <Link href="/xero">
          <Button variant="outline" size="sm" className="mt-2 sm:mt-0 gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            Manage Connections
          </Button>
        </Link>
      </div>

      {!hasIntegration ? (
        <EmptyState />
      ) : (
        <>
          {/* Overall score */}
          <OverallScoreCard score={latestReport?.overall_score ?? 0} checks={checks} />

          {/* Integration status */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Plug className="h-4 w-4 text-muted-foreground" />
              Connection Status
            </h3>
            <IntegrationRow
              integration={integration}
              onResync={handleResync}
              syncing={syncing}
            />
          </div>

          {/* Check breakdown */}
          <CheckBreakdown checks={checks} />

          {/* Period history */}
          <HistoryRow reports={healthReports} />

          {/* Recommendations */}
          <RecommendationsCard reports={healthReports} />

          {/* Sync errors */}
          <SyncErrorLog errors={syncErrors} />

          {/* Tip */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Health checks run automatically after each sync. Scores update as your data improves.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
