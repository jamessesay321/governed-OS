import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  buildProfilesByCustomer,
  computeOrgProfile,
  computeSizeBucketProfiles,
  predictExpectedDate,
  type CustomerPaymentProfile,
  type HistoricalInvoice,
  type PredictionContext,
  type PredictionResult,
} from '@/lib/cash/payment-prediction';
import { CashInClient } from './cash-in-client';

export const dynamic = 'force-dynamic';

// ── Types ──

export interface CashInInvoice {
  id: string;
  xero_id: string;
  invoice_number: string | null;
  reference: string | null;
  contact_xero_id: string | null;
  contact_name: string | null;
  total: number;
  amount_due: number;
  amount_paid: number;
  currency: string;
  date: string;
  due_date: string;
  status: string;
  is_recurring: boolean;
  prediction: PredictionResult;
  override: {
    override_date: string | null;
    excluded_from_forecast: boolean;
    note: string | null;
  } | null;
  effective_expected_date: string;
  effective_excluded: boolean;
}

interface RawTxRow {
  id: string;
  xero_id: string;
  contact_name: string | null;
  total: number;
  currency: string;
  date: string;
  raw_payload: Record<string, unknown>;
}

interface OverrideRow {
  invoice_xero_id: string;
  override_date: string | null;
  excluded_from_forecast: boolean;
  note: string | null;
}

// ── Helpers ──

function pickString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function pickNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseXeroDateField(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  // Microsoft JSON: /Date(1326530063760+0000)/
  const ms = v.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
  if (ms) {
    const d = new Date(parseInt(ms[1], 10));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  if (v.includes('T')) return v.split('T')[0];
  return v;
}

function extractContactId(raw: Record<string, unknown>): string | null {
  const c = raw.Contact as Record<string, unknown> | undefined;
  if (!c) return null;
  return pickString(c.ContactID) ?? pickString(c.contactID) ?? null;
}

function isRecurringRef(ref: string | null, invoiceNumber: string | null): boolean {
  // Xero exposes RepeatingInvoiceID on raw_payload, but it's not always populated.
  // Conservative heuristic: numbers like "REP-..." or refs containing "recurring".
  const haystack = `${ref ?? ''} ${invoiceNumber ?? ''}`.toLowerCase();
  return /\brep[-_]/.test(haystack) || haystack.includes('recurring');
}

function todayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Page ──

export default async function CashInPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // 1. Pull org currency
  let baseCurrency = 'GBP';
  try {
    const { data: cfg } = await supabase
      .from('org_accounting_config')
      .select('base_currency')
      .eq('org_id', orgId)
      .maybeSingle();
    const v = (cfg as Record<string, unknown> | null)?.base_currency;
    if (typeof v === 'string' && v.length > 0) baseCurrency = v;
  } catch {
    // default GBP
  }

  // 2. Pull all sales invoices (type='invoice') from raw_transactions
  const { data: invoiceRows } = await supabase
    .from('raw_transactions')
    .select('id, xero_id, contact_name, total, currency, date, raw_payload')
    .eq('org_id', orgId)
    .eq('type', 'invoice')
    .order('date', { ascending: false })
    .limit(5000);

  const rows = (invoiceRows ?? []) as unknown as RawTxRow[];

  // 3. Pull existing user overrides
  const { data: overrideRows } = await supabase
    .from('invoice_forecast_overrides')
    .select('invoice_xero_id, override_date, excluded_from_forecast, note')
    .eq('org_id', orgId);

  const overrides = new Map<string, OverrideRow>();
  for (const o of (overrideRows ?? []) as unknown as OverrideRow[]) {
    overrides.set(o.invoice_xero_id, o);
  }

  // 4. Split into open vs historical-paid
  const openInvoices: Array<{
    row: RawTxRow;
    invoiceNumber: string | null;
    reference: string | null;
    contactXeroId: string | null;
    amountDue: number;
    amountPaid: number;
    dueDate: string | null;
    status: string;
  }> = [];

  const historical: HistoricalInvoice[] = [];
  const contactNames: Record<string, string> = {};

  for (const row of rows) {
    const raw = row.raw_payload ?? {};
    const status = pickString(raw.Status)?.toUpperCase() ?? '';
    const invoiceType = pickString(raw.Type)?.toUpperCase();
    if (invoiceType !== 'ACCREC') continue; // only customer-receivable invoices

    const dueDate = parseXeroDateField(raw.DueDateString) ?? parseXeroDateField(raw.DueDate);
    const fullyPaidOn =
      parseXeroDateField(raw.FullyPaidOnDateString) ??
      parseXeroDateField(raw.FullyPaidOnDate);
    const contactXeroId = extractContactId(raw);
    const invoiceNumber = pickString(raw.InvoiceNumber);
    const reference = pickString(raw.Reference);
    const amountDue = pickNumber(raw.AmountDue);
    const amountPaid = pickNumber(raw.AmountPaid);

    if (contactXeroId && row.contact_name) {
      contactNames[contactXeroId] = row.contact_name;
    }

    if (status === 'PAID' && fullyPaidOn && dueDate && contactXeroId) {
      historical.push({
        contactXeroId,
        dueDate,
        fullyPaidOn,
        total: row.total,
      });
      continue;
    }

    if (status === 'AUTHORISED' && dueDate && amountDue > 0) {
      openInvoices.push({
        row,
        invoiceNumber,
        reference,
        contactXeroId,
        amountDue,
        amountPaid,
        dueDate,
        status,
      });
    }
  }

  // 5. Build prediction context
  const customerProfiles = buildProfilesByCustomer(historical, contactNames);
  const orgProfile = computeOrgProfile(historical);
  const sizeBuckets = computeSizeBucketProfiles(historical);

  const ctx: PredictionContext = { customerProfiles, orgProfile, sizeBuckets };

  // 6. Predict each open invoice + apply overrides
  const invoices: CashInInvoice[] = openInvoices.map((o) => {
    const prediction = predictExpectedDate(
      {
        contactXeroId: o.contactXeroId,
        dueDate: o.dueDate as string,
        total: o.amountDue,
      },
      ctx,
    );
    const override = overrides.get(o.row.xero_id) ?? null;
    const effective_expected_date = override?.override_date ?? prediction.expectedDate;
    const effective_excluded = override?.excluded_from_forecast ?? false;

    return {
      id: o.row.id,
      xero_id: o.row.xero_id,
      invoice_number: o.invoiceNumber,
      reference: o.reference,
      contact_xero_id: o.contactXeroId,
      contact_name: o.row.contact_name,
      total: o.row.total,
      amount_due: o.amountDue,
      amount_paid: o.amountPaid,
      currency: o.row.currency || baseCurrency,
      date: o.row.date,
      due_date: o.dueDate as string,
      status: o.status,
      is_recurring: isRecurringRef(o.reference, o.invoiceNumber),
      prediction,
      override: override
        ? {
            override_date: override.override_date,
            excluded_from_forecast: override.excluded_from_forecast,
            note: override.note,
          }
        : null,
      effective_expected_date,
      effective_excluded,
    };
  });

  // Customer-level summary view (one row per customer with open invoices)
  const customerSummaries: Array<{
    contact_xero_id: string;
    contact_name: string | null;
    open_invoices: number;
    open_amount: number;
    profile: CustomerPaymentProfile | null;
  }> = (() => {
    const m = new Map<string, { name: string | null; count: number; amount: number }>();
    for (const inv of invoices) {
      if (inv.effective_excluded) continue;
      const key = inv.contact_xero_id ?? '__unknown__';
      const cur = m.get(key) ?? { name: inv.contact_name, count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += inv.amount_due;
      cur.name = cur.name ?? inv.contact_name;
      m.set(key, cur);
    }
    return Array.from(m.entries())
      .map(([cid, v]) => ({
        contact_xero_id: cid,
        contact_name: v.name,
        open_invoices: v.count,
        open_amount: v.amount,
        profile: cid === '__unknown__' ? null : customerProfiles.get(cid) ?? null,
      }))
      .sort((a, b) => b.open_amount - a.open_amount);
  })();

  return (
    <CashInClient
      invoices={invoices}
      customerSummaries={customerSummaries}
      currency={baseCurrency}
      asOfDate={todayUTC()}
    />
  );
}
