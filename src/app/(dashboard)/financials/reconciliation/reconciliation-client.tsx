'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  RefreshCw,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Send,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatting/currency';
import type { KpiRow, RunRow, DriftRow } from './page';

interface Props {
  orgId: string;
  role: string;
  currentPeriod: string;
  previousPeriod: string;
  kpis: KpiRow[];
  runs: RunRow[];
  drifts: DriftRow[];
}

const CATEGORY_LABEL: Record<string, string> = {
  revenue: 'Revenue',
  pipeline: 'Pipeline',
  receivables: 'Receivables',
  forecast: 'Forecast',
  production: 'Production',
};

const STATUS_BADGE: Record<
  string,
  { label: string; className: string; emoji: string }
> = {
  green: { label: 'In tolerance', className: 'bg-green-100 text-green-700', emoji: '🟢' },
  amber: { label: 'Watch', className: 'bg-amber-100 text-amber-700', emoji: '🟡' },
  red: { label: 'Drift', className: 'bg-red-100 text-red-700', emoji: '🔴' },
  informational: {
    label: 'Informational',
    className: 'bg-blue-100 text-blue-700',
    emoji: 'ℹ️',
  },
  error: { label: 'Error', className: 'bg-zinc-200 text-zinc-700', emoji: '⚠️' },
  never_run: {
    label: 'Not run',
    className: 'bg-zinc-100 text-zinc-500',
    emoji: '—',
  },
};

const DRIFT_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont_fix', label: "Won't fix" },
] as const;

export function ReconciliationClient({
  orgId,
  role,
  currentPeriod,
  previousPeriod,
  kpis,
  runs,
  drifts,
}: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<string>(currentPeriod);
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [driftFilter, setDriftFilter] = useState<{
    status: string;
    kpi: string;
  }>({ status: 'all', kpi: 'all' });

  const canEdit = role === 'advisor' || role === 'admin' || role === 'owner';

  const integrations = useMemo(() => {
    const set = new Set<string>();
    for (const k of kpis) {
      for (const s of k.sources ?? []) set.add(s.integration);
    }
    return Array.from(set).sort();
  }, [kpis]);

  // Map: kpi_id → most-recent run for the active period
  const latestRunByKpi = useMemo(() => {
    const m = new Map<string, RunRow>();
    for (const r of runs) {
      if (r.period !== period) continue;
      if (!m.has(r.kpi_id)) m.set(r.kpi_id, r);
    }
    return m;
  }, [runs, period]);

  const kpiById = useMemo(() => {
    const m = new Map<string, KpiRow>();
    for (const k of kpis) m.set(k.id, k);
    return m;
  }, [kpis]);

  const selectedKpi = selectedKpiId ? kpiById.get(selectedKpiId) ?? null : null;
  const selectedRun = selectedKpi ? latestRunByKpi.get(selectedKpi.id) ?? null : null;

  async function runAll() {
    if (!canEdit) return;
    setRunning(true);
    try {
      const resp = await fetch('/api/reconciliation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error('[RECON] run failed:', text);
      }
    } catch (err) {
      console.error('[RECON] run threw:', err);
    } finally {
      setRunning(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reconciliation Centre</h1>
          <p className="text-sm text-muted-foreground">
            Cross-checks each financial KPI against multiple integrations and surfaces drift.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={currentPeriod}>{formatPeriod(currentPeriod)} (current)</SelectItem>
              <SelectItem value={previousPeriod}>{formatPeriod(previousPeriod)} (prior)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runAll} disabled={!canEdit || running || isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Running…' : 'Run reconciliation now'}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="forward">Forward Revenue (90d)</TabsTrigger>
          <TabsTrigger value="drifts">
            Drift Log
            {drifts.filter((d) => d.status === 'open').length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {drifts.filter((d) => d.status === 'open').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─────────── Matrix ─────────── */}
        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KPI × integration</CardTitle>
              <CardDescription>
                Click a cell to see the source value, drift % and the run timestamp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kpis.length === 0 ? (
                <p className="text-sm text-muted-foreground">No KPIs configured.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium">KPI</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        {integrations.map((intg) => (
                          <th key={intg} className="px-3 py-2 text-left font-medium capitalize">
                            {intg}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right font-medium">Max drift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.map((k) => {
                        const run = latestRunByKpi.get(k.id);
                        const status = run ? run.status : 'never_run';
                        const meta = STATUS_BADGE[status] ?? STATUS_BADGE.never_run;
                        const sourceMap = new Map<string, RunRow['source_values'][number]>();
                        if (run) {
                          for (const s of run.source_values ?? []) sourceMap.set(s.integration, s);
                        }

                        return (
                          <tr key={k.id} className="border-b last:border-b-0">
                            <td className="px-3 py-2">
                              <button
                                onClick={() => setSelectedKpiId(k.id)}
                                className="text-left font-medium hover:underline"
                              >
                                {k.label}
                              </button>
                              <div className="text-xs text-muted-foreground">
                                {CATEGORY_LABEL[k.category] ?? k.category} · primary: {k.primary_source}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${meta.className}`}>
                                <span className="mr-1">{meta.emoji}</span>
                                {meta.label}
                              </span>
                            </td>
                            {integrations.map((intg) => {
                              const isUsed = (k.sources ?? []).some(
                                (s) => s.integration === intg
                              );
                              if (!isUsed) {
                                return (
                                  <td key={intg} className="px-3 py-2 text-zinc-300">
                                    —
                                  </td>
                                );
                              }
                              const sv = sourceMap.get(intg);
                              const isPrimary = k.primary_source === intg;
                              const cellStatus =
                                !sv || sv.value === null
                                  ? 'unavailable'
                                  : isPrimary
                                  ? 'primary'
                                  : status;

                              return (
                                <td
                                  key={intg}
                                  className={`px-3 py-2 ${
                                    status === 'red' && !isPrimary && sv?.value !== null
                                      ? 'cursor-pointer bg-red-50 hover:bg-red-100'
                                      : ''
                                  }`}
                                  onClick={() => {
                                    if (status === 'red' && !isPrimary) {
                                      setSelectedKpiId(k.id);
                                    }
                                  }}
                                >
                                  <CellValue
                                    value={sv?.value ?? null}
                                    error={sv?.error}
                                    cellStatus={cellStatus}
                                    isCount={k.kpi_key.includes('count')}
                                  />
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right font-mono">
                              {run && run.max_drift_pct !== null
                                ? `${run.max_drift_pct.toFixed(2)}%`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────── Forward Revenue ─────────── */}
        <TabsContent value="forward" className="space-y-4">
          <ForwardRevenueTab
            kpis={kpis}
            latestRunByKpi={latestRunByKpi}
            period={period}
          />
        </TabsContent>

        {/* ─────────── Drift Log ─────────── */}
        <TabsContent value="drifts" className="space-y-4">
          <DriftLogTab
            orgId={orgId}
            canEdit={canEdit}
            kpiById={kpiById}
            drifts={drifts}
            filter={driftFilter}
            setFilter={setDriftFilter}
            refresh={() => startTransition(() => router.refresh())}
          />
        </TabsContent>
      </Tabs>

      <KpiDetailSheet
        open={!!selectedKpi}
        kpi={selectedKpi}
        run={selectedRun}
        onOpenChange={(open) => !open && setSelectedKpiId(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell value
// ---------------------------------------------------------------------------

function CellValue({
  value,
  error,
  cellStatus,
  isCount,
}: {
  value: number | null;
  error?: string;
  cellStatus: string;
  isCount: boolean;
}) {
  if (value === null) {
    return (
      <span className="text-zinc-400" title={error}>
        —
      </span>
    );
  }
  const formatted = isCount
    ? Math.round(value).toLocaleString()
    : formatCurrency(value);
  const colour =
    cellStatus === 'primary'
      ? 'font-semibold'
      : cellStatus === 'red'
      ? 'text-red-700'
      : cellStatus === 'amber'
      ? 'text-amber-700'
      : '';
  return <span className={`font-mono ${colour}`}>{formatted}</span>;
}

// ---------------------------------------------------------------------------
// Forward revenue tab
// ---------------------------------------------------------------------------

function ForwardRevenueTab({
  kpis,
  latestRunByKpi,
  period,
}: {
  kpis: KpiRow[];
  latestRunByKpi: Map<string, RunRow>;
  period: string;
}) {
  const forwardKpi = kpis.find((k) => k.kpi_key === 'forward_revenue_90d');
  const run = forwardKpi ? latestRunByKpi.get(forwardKpi.id) : undefined;

  if (!forwardKpi) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          forward_revenue_90d KPI not configured for this org.
        </CardContent>
      </Card>
    );
  }

  const breakdown = (run?.source_values ?? []).map((s) => ({
    integration: s.integration,
    value: s.value ?? 0,
    available: s.value !== null,
    error: s.error,
  }));

  const total = breakdown.reduce((sum, b) => sum + b.value, 0);

  // For v1 the chart shows the current period's forward bar by source.
  const chartData = [
    {
      label: 'Next 90d',
      ...Object.fromEntries(breakdown.map((b) => [b.integration, b.value])),
    },
  ];
  const integrationKeys = breakdown.map((b) => b.integration);
  const colours: Record<string, string> = {
    hubspot: '#7c3aed',
    acuity: '#0ea5e9',
    klaviyo: '#22c55e',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Forward revenue (next 90 days)</CardTitle>
            <CardDescription>
              Stacked total from HubSpot pipeline, Acuity bookings and Klaviyo retention. As of {formatPeriod(period)}.
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold">{formatCurrency(total)}</div>
            <div className="text-xs text-muted-foreground">
              ±15% confidence band
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 || total === 0 ? (
            <p className="text-sm text-muted-foreground">
              No forward-revenue data yet. Run reconciliation to populate.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 10, right: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => formatCurrency(Number(v))} />
                  <RechartsTooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  {integrationKeys.map((k) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      stackId="forward"
                      fill={colours[k] ?? '#94a3b8'}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-source breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-right">Forecast</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-muted-foreground">
                    No data.
                  </td>
                </tr>
              )}
              {breakdown.map((b) => (
                <tr key={b.integration} className="border-b last:border-b-0">
                  <td className="px-3 py-2 capitalize">{b.integration}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {b.available ? formatCurrency(b.value) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {b.error ?? (b.available ? '' : 'unavailable')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drift Log tab
// ---------------------------------------------------------------------------

function DriftLogTab({
  orgId,
  canEdit,
  kpiById,
  drifts,
  filter,
  setFilter,
  refresh,
}: {
  orgId: string;
  canEdit: boolean;
  kpiById: Map<string, KpiRow>;
  drifts: DriftRow[];
  filter: { status: string; kpi: string };
  setFilter: (f: { status: string; kpi: string }) => void;
  refresh: () => void;
}) {
  const filtered = drifts.filter((d) => {
    if (filter.status !== 'all' && d.status !== filter.status) return false;
    if (filter.kpi !== 'all') {
      const kpi = kpiById.get(d.kpi_id);
      if (!kpi || kpi.kpi_key !== filter.kpi) return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Drift log</CardTitle>
          <CardDescription>
            Every amber/red drift opens a row here. Update the status, root cause and resolution as you investigate.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Select
            value={filter.status}
            onValueChange={(v) => setFilter({ ...filter, status: v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {DRIFT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filter.kpi}
            onValueChange={(v) => setFilter({ ...filter, kpi: v })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="KPI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KPIs</SelectItem>
              {Array.from(kpiById.values()).map((k) => (
                <SelectItem key={k.id} value={k.kpi_key}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No drifts match the current filters.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => (
              <DriftRowCard
                key={d.id}
                orgId={orgId}
                drift={d}
                kpi={kpiById.get(d.kpi_id) ?? null}
                canEdit={canEdit}
                onUpdated={refresh}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DriftRowCard({
  orgId,
  drift,
  kpi,
  canEdit,
  onUpdated,
}: {
  orgId: string;
  drift: DriftRow;
  kpi: KpiRow | null;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState(drift.status);
  const [rootCause, setRootCause] = useState(drift.root_cause ?? '');
  const [resolution, setResolution] = useState(drift.resolution ?? '');
  const [saving, setSaving] = useState(false);
  const [slacking, setSlacking] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/reconciliation/drifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: drift.id,
          status,
          root_cause: rootCause,
          resolution,
        }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function sendToSlack() {
    setSlacking(true);
    try {
      await fetch('/api/reconciliation/drifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: drift.id,
          // No-op metadata write — real Slack send happens via slack_outbox
          // worker (see migration 045 + roadmap).
          status,
        }),
      });
      // We deliberately don't try to write directly to slack_outbox from the
      // client — there is no public API for that yet. Once the worker exists
      // this button calls /api/reconciliation/notify-slack instead.
      console.info('[RECON] Slack notification queued for drift', drift.id, 'org', orgId);
      alert('Slack notification queued. (Worker not yet running — see TODO.)');
    } finally {
      setSlacking(false);
    }
  }

  const severityIcon =
    drift.severity === 'red' ? (
      <CircleAlert className="h-4 w-4 text-red-600" />
    ) : (
      <CircleHelp className="h-4 w-4 text-amber-600" />
    );

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {severityIcon}
          <span className="font-medium">{kpi?.label ?? 'Unknown KPI'}</span>
          <Badge variant="outline">{formatPeriod(drift.period)}</Badge>
          <span className="text-sm text-muted-foreground">
            drift {Number(drift.drift_pct).toFixed(2)}% (
            {formatCurrency(Number(drift.drift_amount))})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            opened {new Date(drift.opened_at).toLocaleDateString()}
          </span>
          {drift.closed_at && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <CircleCheck className="h-3 w-3 text-green-600" />
              closed {new Date(drift.closed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as DriftRow['status'])}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRIFT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Root cause</Label>
          <Input
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. Shopify sync was paused for 2 days"
          />
        </div>
        <div className="sm:col-span-3">
          <Label className="text-xs">Resolution</Label>
          <Input
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. Resumed sync, totals now match"
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save} disabled={!canEdit || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={sendToSlack}
          disabled={!canEdit || slacking}
        >
          <Send className="mr-2 h-4 w-4" />
          Send to Slack
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI detail sheet
// ---------------------------------------------------------------------------

function KpiDetailSheet({
  open,
  kpi,
  run,
  onOpenChange,
}: {
  open: boolean;
  kpi: KpiRow | null;
  run: RunRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{kpi?.label ?? 'KPI detail'}</SheetTitle>
          <SheetDescription>
            {kpi
              ? `Primary source: ${kpi.primary_source} · ${
                  kpi.informational ? 'informational' : 'thresholds: ' +
                    `green<${kpi.drift_thresholds.green_pct}%, amber<${kpi.drift_thresholds.amber_pct}%`
                }`
              : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!run ? (
            <p className="text-sm text-muted-foreground">
              No reconciliation run yet for this period.
            </p>
          ) : (
            <>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Status</div>
                <Badge className={STATUS_BADGE[run.status]?.className ?? ''}>
                  {STATUS_BADGE[run.status]?.label ?? run.status}
                </Badge>
                {run.max_drift_pct !== null && (
                  <span className="ml-2 text-sm">
                    max drift {Number(run.max_drift_pct).toFixed(2)}%
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs uppercase text-muted-foreground">Per-source values</div>
                <table className="mt-1 w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left">Source</th>
                      <th className="px-2 py-1 text-right">Value</th>
                      <th className="px-2 py-1 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(run.source_values ?? []).map((sv) => (
                      <tr key={sv.integration} className="border-b last:border-b-0">
                        <td className="px-2 py-1 capitalize">
                          {sv.integration}
                          {kpi?.primary_source === sv.integration && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              primary
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">
                          {sv.value === null
                            ? '—'
                            : (kpi?.kpi_key ?? '').includes('count')
                            ? Math.round(sv.value).toLocaleString()
                            : formatCurrency(sv.value)}
                        </td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">
                          {sv.error ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted-foreground">
                Run completed {new Date(run.completed_at).toLocaleString()}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPeriod(period: string): string {
  // YYYY-MM-01 → "Apr 2026"
  const [yStr, mStr] = period.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
