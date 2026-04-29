'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Repeat,
  Search,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatting/currency';
import {
  aggregateHorizons,
  bucketForDate,
  HORIZON_LABELS,
  type HorizonBucket,
} from '@/lib/cash/invoice-aggregation';
import type { CashInInvoice } from './page';
import type { CustomerPaymentProfile, Confidence } from '@/lib/cash/payment-prediction';

/* ──────────────────────────────────────────────────────────── */
/*  Props                                                        */
/* ──────────────────────────────────────────────────────────── */

interface CustomerSummary {
  contact_xero_id: string;
  contact_name: string | null;
  open_invoices: number;
  open_amount: number;
  profile: CustomerPaymentProfile | null;
}

interface CashInClientProps {
  invoices: CashInInvoice[];
  customerSummaries: CustomerSummary[];
  currency: string;
  asOfDate: string; // YYYY-MM-DD
}

type Tab = 'invoices' | 'customers' | 'recurring' | 'once_off';

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  high: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-300',
  low: 'bg-zinc-500/10 text-zinc-600 border-zinc-300',
};

const BUCKET_STYLES: Record<HorizonBucket, string> = {
  overdue: 'bg-red-500/15 text-red-700 border-red-300',
  today: 'bg-blue-500/15 text-blue-700 border-blue-300',
  next_7: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  next_8_30: 'bg-zinc-500/15 text-zinc-700 border-zinc-300',
  beyond: 'bg-zinc-200 text-zinc-600 border-zinc-300',
};

/* ──────────────────────────────────────────────────────────── */
/*  Component                                                    */
/* ──────────────────────────────────────────────────────────── */

export function CashInClient({
  invoices: initialInvoices,
  customerSummaries,
  currency,
  asOfDate,
}: CashInClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('invoices');
  const [invoices, setInvoices] = useState<CashInInvoice[]>(initialInvoices);
  const [showExcluded, setShowExcluded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCustomDays, setBulkCustomDays] = useState<string>('14');
  const [isSaving, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Derived ──

  const today = useMemo(() => new Date(`${asOfDate}T00:00:00Z`), [asOfDate]);

  const horizonTotals = useMemo(
    () =>
      aggregateHorizons(
        invoices.map((i) => ({
          amount: i.amount_due,
          expectedDate: i.effective_expected_date,
          excluded: i.effective_excluded,
        })),
        today,
      ),
    [invoices, today],
  );

  const filteredInvoices = useMemo(() => {
    const s = search.trim().toLowerCase();
    return invoices
      .filter((i) => (showExcluded ? true : !i.effective_excluded))
      .filter((i) => {
        if (tab === 'recurring') return i.is_recurring;
        if (tab === 'once_off') return !i.is_recurring;
        return true;
      })
      .filter((i) => {
        if (!s) return true;
        return (
          (i.contact_name ?? '').toLowerCase().includes(s) ||
          (i.invoice_number ?? '').toLowerCase().includes(s) ||
          (i.reference ?? '').toLowerCase().includes(s)
        );
      })
      .sort((a, b) => a.effective_expected_date.localeCompare(b.effective_expected_date));
  }, [invoices, showExcluded, tab, search]);

  const allVisibleSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((i) => selectedIds.has(i.xero_id));

  // ── Mutations ──

  async function postOverrides(
    payload: Array<{
      invoice_xero_id: string;
      override_date?: string | null;
      excluded_from_forecast?: boolean;
      note?: string | null;
    }>,
  ) {
    setErrorMsg(null);
    const res = await fetch('/api/cash/invoice-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides: payload }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErrorMsg(j.error ?? 'Failed to save override');
      return false;
    }
    return true;
  }

  function applyLocalUpdate(
    ids: string[],
    update: (inv: CashInInvoice) => Partial<CashInInvoice>,
  ) {
    setInvoices((curr) =>
      curr.map((inv) => (ids.includes(inv.xero_id) ? { ...inv, ...update(inv) } : inv)),
    );
  }

  function toggleExclude(inv: CashInInvoice) {
    const nextExcluded = !inv.effective_excluded;
    applyLocalUpdate([inv.xero_id], () => ({
      effective_excluded: nextExcluded,
      override: {
        override_date: inv.override?.override_date ?? null,
        excluded_from_forecast: nextExcluded,
        note: inv.override?.note ?? null,
      },
    }));
    startTransition(() => {
      void postOverrides([
        {
          invoice_xero_id: inv.xero_id,
          override_date: inv.override?.override_date ?? null,
          excluded_from_forecast: nextExcluded,
          note: inv.override?.note ?? null,
        },
      ]).then((ok) => {
        if (!ok) router.refresh();
      });
    });
  }

  function bulkShiftDays(days: number) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const updates = invoices
      .filter((i) => ids.includes(i.xero_id))
      .map((i) => {
        const base = new Date(`${i.effective_expected_date}T00:00:00Z`);
        base.setUTCDate(base.getUTCDate() + days);
        const newDate = base.toISOString().split('T')[0];
        return {
          invoice_xero_id: i.xero_id,
          override_date: newDate,
          excluded_from_forecast: i.effective_excluded,
          note: i.override?.note ?? null,
        };
      });
    setInvoices((curr) =>
      curr.map((inv) => {
        const u = updates.find((up) => up.invoice_xero_id === inv.xero_id);
        if (!u) return inv;
        return {
          ...inv,
          effective_expected_date: u.override_date,
          override: {
            override_date: u.override_date,
            excluded_from_forecast: inv.effective_excluded,
            note: inv.override?.note ?? null,
          },
        };
      }),
    );
    startTransition(() => {
      void postOverrides(updates).then((ok) => {
        if (!ok) router.refresh();
        else {
          setSelectedIds(new Set());
          setBulkOpen(false);
        }
      });
    });
  }

  function bulkSetExcluded(excluded: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const updates = invoices
      .filter((i) => ids.includes(i.xero_id))
      .map((i) => ({
        invoice_xero_id: i.xero_id,
        override_date: i.override?.override_date ?? null,
        excluded_from_forecast: excluded,
        note: i.override?.note ?? null,
      }));
    applyLocalUpdate(ids, (inv) => ({
      effective_excluded: excluded,
      override: {
        override_date: inv.override?.override_date ?? null,
        excluded_from_forecast: excluded,
        note: inv.override?.note ?? null,
      },
    }));
    startTransition(() => {
      void postOverrides(updates).then((ok) => {
        if (!ok) router.refresh();
        else {
          setSelectedIds(new Set());
          setBulkOpen(false);
        }
      });
    });
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      const newSet = new Set(selectedIds);
      filteredInvoices.forEach((i) => newSet.delete(i.xero_id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filteredInvoices.forEach((i) => newSet.add(i.xero_id));
      setSelectedIds(newSet);
    }
  }

  function toggleSelected(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  /* ── Render ── */

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-zinc-700" />
          <h1 className="text-2xl font-semibold">Cash In / Invoices</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Open sales invoices with predicted payment dates. Adjust expected dates or
          exclude invoices to refine the cash horizon.
        </p>
      </div>

      {/* Horizon KPI cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <HorizonCard
          label="Today"
          icon={<Clock className="size-4 text-blue-600" />}
          count={horizonTotals.today.count}
          amount={horizonTotals.today.amount}
          currency={currency}
        />
        <HorizonCard
          label="Next 1-7 days"
          icon={<Calendar className="size-4 text-emerald-600" />}
          count={horizonTotals.next_7.count}
          amount={horizonTotals.next_7.amount}
          currency={currency}
        />
        <HorizonCard
          label="Next 8-30 days"
          icon={<Calendar className="size-4 text-zinc-600" />}
          count={horizonTotals.next_8_30.count}
          amount={horizonTotals.next_8_30.amount}
          currency={currency}
        />
        <HorizonCard
          label="Overdue"
          icon={<AlertCircle className="size-4 text-red-600" />}
          count={horizonTotals.overdue.count}
          amount={horizonTotals.overdue.amount}
          currency={currency}
          tone="negative"
        />
      </div>

      {errorMsg && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative grow max-w-md">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search customer, invoice number or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-600">
          <Checkbox
            checked={showExcluded}
            onCheckedChange={(v) => setShowExcluded(Boolean(v))}
          />
          Show excluded invoices
        </label>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkShiftDays(7)} disabled={isSaving}>
            +7 days
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkShiftDays(30)} disabled={isSaving}>
            +30 days
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} disabled={isSaving}>
            Custom…
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkSetExcluded(true)} disabled={isSaving}>
            Exclude
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkSetExcluded(false)} disabled={isSaving}>
            Include
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="customers">Customer view</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="once_off">Once-off</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <InvoiceTable
            invoices={filteredInvoices}
            currency={currency}
            today={today}
            selectedIds={selectedIds}
            allSelected={allVisibleSelected}
            onToggleAll={toggleSelectAllVisible}
            onToggleOne={toggleSelected}
            onToggleExclude={toggleExclude}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <CustomerTable summaries={customerSummaries} currency={currency} />
        </TabsContent>

        <TabsContent value="recurring" className="mt-4">
          <InvoiceTable
            invoices={filteredInvoices}
            currency={currency}
            today={today}
            selectedIds={selectedIds}
            allSelected={allVisibleSelected}
            onToggleAll={toggleSelectAllVisible}
            onToggleOne={toggleSelected}
            onToggleExclude={toggleExclude}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="once_off" className="mt-4">
          <InvoiceTable
            invoices={filteredInvoices}
            currency={currency}
            today={today}
            selectedIds={selectedIds}
            allSelected={allVisibleSelected}
            onToggleAll={toggleSelectAllVisible}
            onToggleOne={toggleSelected}
            onToggleExclude={toggleExclude}
            isSaving={isSaving}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift expected payment date</DialogTitle>
            <DialogDescription>
              Move {selectedIds.size} selected invoice
              {selectedIds.size === 1 ? '' : 's'} forward by a custom number of days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={-30}
              max={180}
              value={bulkCustomDays}
              onChange={(e) => setBulkCustomDays(e.target.value)}
            />
            <span className="text-sm text-zinc-500">days</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const n = Number(bulkCustomDays);
                if (Number.isFinite(n)) bulkShiftDays(Math.round(n));
              }}
              disabled={isSaving}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Sub-components                                               */
/* ──────────────────────────────────────────────────────────── */

function HorizonCard({
  label,
  icon,
  count,
  amount,
  currency,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  amount: number;
  currency: string;
  tone?: 'negative';
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle
          className={cn('text-2xl tabular-nums', tone === 'negative' && 'text-red-700')}
        >
          {formatCurrency(amount, currency)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-zinc-500">
          {count} invoice{count === 1 ? '' : 's'}
        </p>
      </CardContent>
    </Card>
  );
}

function InvoiceTable({
  invoices,
  currency,
  today,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggleOne,
  onToggleExclude,
  isSaving,
}: {
  invoices: CashInInvoice[];
  currency: string;
  today: Date;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onToggleExclude: (inv: CashInInvoice) => void;
  isSaving: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
        No open invoices match your filters.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="w-10 px-3 py-2">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
            </th>
            <th className="px-3 py-2">Customer</th>
            <th className="px-3 py-2">Bucket</th>
            <th className="px-3 py-2 text-right">Amount due</th>
            <th className="px-3 py-2">Reference</th>
            <th className="px-3 py-2">Due date</th>
            <th className="px-3 py-2">Expected payment</th>
            <th className="px-3 py-2 text-center">Include</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const bucket = bucketForDate(inv.effective_expected_date, today);
            const daysLate = inv.prediction.expectedDaysLate;
            const usingOverride = !!inv.override?.override_date;
            return (
              <tr
                key={inv.xero_id}
                className={cn(
                  'border-t border-zinc-100 hover:bg-zinc-50/60',
                  inv.effective_excluded && 'opacity-50',
                )}
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={selectedIds.has(inv.xero_id)}
                    onCheckedChange={() => onToggleOne(inv.xero_id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inv.contact_name ?? '—'}</span>
                    {inv.is_recurring && (
                      <Repeat className="size-3 text-zinc-400" aria-label="Recurring" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge className={cn('border', BUCKET_STYLES[bucket])}>
                    {HORIZON_LABELS[bucket]}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(inv.amount_due, inv.currency || currency)}
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {inv.invoice_number ?? inv.reference ?? '—'}
                </td>
                <td className="px-3 py-2 tabular-nums">{inv.due_date}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        'inline-flex w-fit items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium tabular-nums',
                        usingOverride
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : CONFIDENCE_STYLES[inv.prediction.confidence],
                      )}
                    >
                      {usingOverride && <CheckCircle2 className="size-3" />}
                      {inv.effective_expected_date}
                    </span>
                    {!usingOverride && (
                      <span className="text-[11px] text-zinc-500">
                        {daysLate >= 0 ? `+${daysLate}` : daysLate}d vs due ·{' '}
                        {inv.prediction.confidence} confidence
                      </span>
                    )}
                    {usingOverride && (
                      <span className="text-[11px] text-blue-600">manual override</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <Checkbox
                    checked={!inv.effective_excluded}
                    onCheckedChange={() => onToggleExclude(inv)}
                    disabled={isSaving}
                    aria-label="Include in forecast"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CustomerTable({
  summaries,
  currency,
}: {
  summaries: CustomerSummary[];
  currency: string;
}) {
  if (summaries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
        No customers with open invoices.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2">Customer</th>
            <th className="px-3 py-2 text-right">Open invoices</th>
            <th className="px-3 py-2 text-right">Open amount</th>
            <th className="px-3 py-2">Avg days late</th>
            <th className="px-3 py-2">Sample size</th>
            <th className="px-3 py-2">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.contact_xero_id} className="border-t border-zinc-100">
              <td className="px-3 py-2 font-medium">{s.contact_name ?? '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{s.open_invoices}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(s.open_amount, currency)}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {s.profile
                  ? `${s.profile.weightedDaysLate >= 0 ? '+' : ''}${s.profile.weightedDaysLate.toFixed(1)}d`
                  : '—'}
              </td>
              <td className="px-3 py-2 tabular-nums">{s.profile?.sampleSize ?? 0}</td>
              <td className="px-3 py-2">
                {s.profile ? (
                  <Badge className={cn('border', CONFIDENCE_STYLES[s.profile.confidence])}>
                    {s.profile.confidence}
                  </Badge>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
