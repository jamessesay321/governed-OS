/**
 * Source Fetchers — Reconciliation Centre
 * ----------------------------------------
 * One function per integration. Each returns either a numeric value for the
 * given period, or null when the integration is not configured / not connected
 * for the org / no data is available.
 *
 * NEVER throws — caller decides how to handle "data unavailable" (typically
 * renders as "—" rather than as a red drift).
 *
 * Period contract: an ISO date string for the first day of the month being
 * reconciled (e.g. "2026-04-01"). Fetchers compute the corresponding period
 * end internally.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { fetchOrders, type ShopifyOrder } from '@/lib/integrations/shopify';
import { getAppointments, type AcuityAppointment } from '@/lib/integrations/acuity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceValue {
  integration: string;
  /** numeric value, or null when source is unavailable */
  value: number | null;
  /** when the source was queried (ISO timestamp) */
  queried_at: string;
  /** present when fetch failed but didn't blow up the run */
  error?: string;
  /** present for forward-looking sources where breakdown is useful */
  meta?: Record<string, unknown>;
}

export interface PeriodWindow {
  /** YYYY-MM-DD first of the month */
  start: string;
  /** YYYY-MM-DD first of the next month (exclusive end) */
  endExclusive: string;
  /** YYYY-MM-DD last day of the month (inclusive — used for HubSpot close-date filters) */
  endInclusive: string;
}

/** Parse a period (YYYY-MM-01) into a window of useful date strings. */
export function buildPeriodWindow(period: string): PeriodWindow {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(nextYear, nextMonth - 1, 0).getDate();
  const endInclusive = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, endExclusive, endInclusive };
}

function nowISO(): string {
  return new Date().toISOString();
}

function ok(integration: string, value: number, meta?: Record<string, unknown>): SourceValue {
  return { integration, value, queried_at: nowISO(), meta };
}

function unavailable(integration: string, error?: string): SourceValue {
  return { integration, value: null, queried_at: nowISO(), error };
}

// ---------------------------------------------------------------------------
// Xero
// ---------------------------------------------------------------------------

/**
 * Sum of REVENUE class accounts for the given period from normalised_financials.
 * Period must be the first-of-month (YYYY-MM-01).
 */
export async function getXeroRevenue(
  orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    const supabase = await createUntypedServiceClient();
    const { data, error } = await supabase
      .from('normalised_financials')
      .select('amount, chart_of_accounts!inner(class)')
      .eq('org_id', orgId)
      .eq('period', period);

    if (error) return unavailable('xero', error.message);

    const rows = (data ?? []) as unknown as Array<{
      amount: number;
      chart_of_accounts: { class: string };
    }>;
    const revenue = rows
      .filter((r) => (r.chart_of_accounts?.class || '').toUpperCase() === 'REVENUE')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return ok('xero', round2(revenue));
  } catch (err) {
    return unavailable('xero', errorMessage(err));
  }
}

/**
 * Count of invoices issued in the given period (raw_transactions where
 * type = 'invoice'). Counts both AUTHORISED and PAID — anything that has
 * been issued.
 */
export async function getXeroInvoiceCount(
  orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    const w = buildPeriodWindow(period);
    const supabase = await createUntypedServiceClient();
    const { count, error } = await supabase
      .from('raw_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('type', 'invoice')
      .gte('date', w.start)
      .lt('date', w.endExclusive);

    if (error) return unavailable('xero', error.message);
    return ok('xero', count ?? 0);
  } catch (err) {
    return unavailable('xero', errorMessage(err));
  }
}

/**
 * Outstanding accounts receivable: sum of unpaid AUTHORISED invoices as of
 * the end of the period. Reads invoice status from raw_payload.
 */
export async function getXeroOutstandingAR(
  orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    const w = buildPeriodWindow(period);
    const supabase = await createUntypedServiceClient();
    const { data, error } = await supabase
      .from('raw_transactions')
      .select('total, raw_payload, date')
      .eq('org_id', orgId)
      .eq('type', 'invoice')
      .lte('date', w.endInclusive);

    if (error) return unavailable('xero', error.message);

    const rows = (data ?? []) as Array<{
      total: number;
      raw_payload: Record<string, unknown> | null;
    }>;

    let total = 0;
    for (const row of rows) {
      const payload = (row.raw_payload ?? {}) as Record<string, unknown>;
      const status = String(payload.Status ?? payload.status ?? '').toUpperCase();
      const amountDue = Number(
        payload.AmountDue ?? payload.amount_due ?? row.total ?? 0
      );
      // AUTHORISED = sent but not paid; SUBMITTED = awaiting approval.
      // PAID / VOIDED / DELETED are excluded.
      if ((status === 'AUTHORISED' || status === 'SUBMITTED') && amountDue > 0) {
        total += amountDue;
      }
    }

    return ok('xero', round2(total));
  } catch (err) {
    return unavailable('xero', errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// Shopify
// ---------------------------------------------------------------------------

interface ShopifyConn {
  accessToken: string;
  shopDomain: string;
}

async function getShopifyConn(orgId: string): Promise<ShopifyConn | null> {
  const supabase = await createUntypedServiceClient();
  const { data } = await supabase
    .from('integration_connections')
    .select('credentials, status')
    .eq('org_id', orgId)
    .eq('integration_id', 'shopify')
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return null;
  const creds = (data.credentials ?? {}) as Record<string, unknown>;
  const accessToken = creds.accessToken as string | undefined;
  const shopDomain = creds.shopDomain as string | undefined;
  if (!accessToken || !shopDomain) return null;
  return { accessToken, shopDomain };
}

async function fetchAllShopifyOrdersForPeriod(
  conn: ShopifyConn,
  window: PeriodWindow
): Promise<ShopifyOrder[]> {
  const all: ShopifyOrder[] = [];
  let pageInfo: string | undefined;
  let safety = 0;
  do {
    const page = await fetchOrders({
      shopDomain: conn.shopDomain,
      accessToken: conn.accessToken,
      status: 'any',
      limit: 250,
      ...(pageInfo
        ? { page_info: pageInfo }
        : {
            createdAtMin: `${window.start}T00:00:00Z`,
            createdAtMax: `${window.endExclusive}T00:00:00Z`,
          }),
    });
    all.push(...page.orders);
    pageInfo = page.nextPageInfo ?? undefined;
    safety++;
  } while (pageInfo && safety < 20);
  return all;
}

/**
 * Sum of Shopify order totals where the order was created in the period.
 * Excludes voided and refunded orders.
 */
export async function getShopifyRevenue(
  orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    const conn = await getShopifyConn(orgId);
    if (!conn) return unavailable('shopify', 'not_connected');

    const window = buildPeriodWindow(period);
    const orders = await fetchAllShopifyOrdersForPeriod(conn, window);
    const revenue = orders
      .filter(
        (o) =>
          o.financial_status !== 'voided' && o.financial_status !== 'refunded'
      )
      .reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
    return ok('shopify', round2(revenue), { orderCount: orders.length });
  } catch (err) {
    return unavailable('shopify', errorMessage(err));
  }
}

/** Count of Shopify orders created in the period (excl. voided/refunded). */
export async function getShopifyOrderCount(
  orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    const conn = await getShopifyConn(orgId);
    if (!conn) return unavailable('shopify', 'not_connected');

    const window = buildPeriodWindow(period);
    const orders = await fetchAllShopifyOrdersForPeriod(conn, window);
    const count = orders.filter(
      (o) => o.financial_status !== 'voided' && o.financial_status !== 'refunded'
    ).length;
    return ok('shopify', count);
  } catch (err) {
    return unavailable('shopify', errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// HubSpot — pulled live via env-token, no DB persistence
// ---------------------------------------------------------------------------

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

interface HubSpotDealRow {
  id: string;
  properties: {
    dealname: string | null;
    amount: string | null;
    dealstage: string | null;
    pipeline: string | null;
    closedate: string | null;
    createdate: string | null;
  };
}

interface HubSpotSearchResponse {
  results: HubSpotDealRow[];
  paging?: { next?: { after: string } };
}

function isHubSpotConfigured(): boolean {
  return !!process.env.HUBSPOT_ACCESS_TOKEN;
}

async function searchHubSpotDeals(
  filterGroups: unknown[]
): Promise<HubSpotDealRow[]> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN!;
  const all: HubSpotDealRow[] = [];
  let after: string | undefined;
  let safety = 0;
  do {
    const body: Record<string, unknown> = {
      filterGroups,
      properties: ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'createdate'],
      limit: 100,
      ...(after ? { after } : {}),
    };
    const resp = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => 'unknown');
      throw new Error(`HubSpot ${resp.status}: ${text}`);
    }
    const data = (await resp.json()) as HubSpotSearchResponse;
    all.push(...data.results);
    after = data.paging?.next?.after;
    safety++;
  } while (after && safety < 20);
  return all;
}

/**
 * Sum of HubSpot deals with dealstage = closedwon (or any won-stage) and
 * closedate within the period.
 */
export async function getHubSpotClosedWonValue(
  _orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    if (!isHubSpotConfigured()) return unavailable('hubspot', 'not_configured');
    const w = buildPeriodWindow(period);
    const startMs = new Date(`${w.start}T00:00:00Z`).getTime();
    const endMs = new Date(`${w.endExclusive}T00:00:00Z`).getTime();

    const deals = await searchHubSpotDeals([
      {
        filters: [
          { propertyName: 'closedate', operator: 'GTE', value: String(startMs) },
          { propertyName: 'closedate', operator: 'LT', value: String(endMs) },
        ],
      },
    ]);

    // Won stages: closedwon (sales pipeline) or order_confirmed (unconfirmed pipeline)
    const wonStages = new Set(['closedwon', 'order_confirmed']);
    const wonDeals = deals.filter((d) =>
      wonStages.has(d.properties.dealstage ?? '')
    );
    const total = wonDeals.reduce(
      (sum, d) => sum + parseFloat(d.properties.amount ?? '0'),
      0
    );
    return ok('hubspot', round2(total), { dealCount: wonDeals.length });
  } catch (err) {
    return unavailable('hubspot', errorMessage(err));
  }
}

/** Count of HubSpot deals closed-won with closedate in the period. */
export async function getHubSpotClosedWonCount(
  _orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    if (!isHubSpotConfigured()) return unavailable('hubspot', 'not_configured');
    const w = buildPeriodWindow(period);
    const startMs = new Date(`${w.start}T00:00:00Z`).getTime();
    const endMs = new Date(`${w.endExclusive}T00:00:00Z`).getTime();

    const deals = await searchHubSpotDeals([
      {
        filters: [
          { propertyName: 'closedate', operator: 'GTE', value: String(startMs) },
          { propertyName: 'closedate', operator: 'LT', value: String(endMs) },
        ],
      },
    ]);
    const wonStages = new Set(['closedwon', 'order_confirmed']);
    const count = deals.filter((d) =>
      wonStages.has(d.properties.dealstage ?? '')
    ).length;
    return ok('hubspot', count);
  } catch (err) {
    return unavailable('hubspot', errorMessage(err));
  }
}

/**
 * Forward revenue forecast from HubSpot: sum of (deal amount × stage probability)
 * for OPEN deals with closedate within the next 90 days.
 */
const SALES_STAGE_PROBABILITY: Record<string, number> = {
  consultation_booked: 0.2,
  no_deposit_no_tcs: 0.4,
  deposit_paid_no_tcs: 0.3,
  order_pack_sent: 0.2,
  consultation_scheduled: 0.7,
  consultation_completed: 0.4,
  order_pack_sent_uc: 0.3,
  committed_awaiting_deposit: 0.8,
};
const CLOSED_STAGES = new Set([
  'closedwon',
  'closedlost',
  'no_show',
  'order_confirmed',
  'deal_lost',
]);

export async function getHubSpotForwardRevenue90d(
  _orgId: string,
  asOfPeriod: string
): Promise<SourceValue> {
  try {
    if (!isHubSpotConfigured()) return unavailable('hubspot', 'not_configured');
    const start = new Date(`${asOfPeriod}T00:00:00Z`);
    const endMs = start.getTime() + 90 * 24 * 60 * 60 * 1000;

    const deals = await searchHubSpotDeals([
      {
        filters: [
          { propertyName: 'closedate', operator: 'GTE', value: String(start.getTime()) },
          { propertyName: 'closedate', operator: 'LT', value: String(endMs) },
        ],
      },
    ]);

    const open = deals.filter(
      (d) => !CLOSED_STAGES.has(d.properties.dealstage ?? '')
    );
    const weighted = open.reduce((sum, d) => {
      const amt = parseFloat(d.properties.amount ?? '0');
      const prob = SALES_STAGE_PROBABILITY[d.properties.dealstage ?? ''] ?? 0.3;
      return sum + amt * prob;
    }, 0);
    return ok('hubspot', round2(weighted), { dealCount: open.length });
  } catch (err) {
    return unavailable('hubspot', errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// Acuity
// ---------------------------------------------------------------------------

function isAcuityConfigured(): boolean {
  return !!(process.env.ACUITY_USER_ID && process.env.ACUITY_API_KEY);
}

/** Count of Acuity bookings (non-cancelled) with date in the period. */
export async function getAcuityBookings(
  _orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    if (!isAcuityConfigured()) return unavailable('acuity', 'not_configured');
    const w = buildPeriodWindow(period);
    const appts: AcuityAppointment[] = await getAppointments({
      minDate: w.start,
      maxDate: w.endInclusive,
      max: 500,
      canceled: false,
    });
    return ok('acuity', appts.length);
  } catch (err) {
    return unavailable('acuity', errorMessage(err));
  }
}

/**
 * Forward revenue from Acuity bookings in the next 90 days.
 *
 * Heuristic (informational only):
 *   forecast = bookingCount × historicalConversion × avgDressPrice
 *
 * Default conversion = 0.20 (1-in-5 consultations convert to a dress order).
 * Default avg dress price = £7,000.
 */
export async function getAcuityForwardRevenue90d(
  _orgId: string,
  asOfPeriod: string
): Promise<SourceValue> {
  try {
    if (!isAcuityConfigured()) return unavailable('acuity', 'not_configured');
    const start = new Date(`${asOfPeriod}T00:00:00Z`);
    const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    const minDate = isoDate(start);
    const maxDate = isoDate(end);

    const appts = await getAppointments({
      minDate,
      maxDate,
      max: 500,
      canceled: false,
    });

    const conversion = Number(process.env.ACUITY_CONVERSION_RATE ?? '0.20');
    const avgDressPrice = Number(process.env.ACUITY_AVG_DRESS_PRICE ?? '7000');
    const forecast = appts.length * conversion * avgDressPrice;
    return ok('acuity', round2(forecast), {
      bookingCount: appts.length,
      conversion,
      avgDressPrice,
    });
  } catch (err) {
    return unavailable('acuity', errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// Monday — production count
// ---------------------------------------------------------------------------

/**
 * Count of Monday production items recorded in the period.
 * Reads from the cached monday_orders_link table (populated by the Monday sync).
 * Counts items with a created_at within the period.
 */
export async function getMondayProductionCount(
  orgId: string,
  period: string
): Promise<SourceValue> {
  try {
    const w = buildPeriodWindow(period);
    const supabase = await createUntypedServiceClient();
    const { count, error } = await supabase
      .from('bridal_orders')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', `${w.start}T00:00:00Z`)
      .lt('created_at', `${w.endExclusive}T00:00:00Z`);

    if (error) return unavailable('monday', error.message);
    return ok('monday', count ?? 0);
  } catch (err) {
    return unavailable('monday', errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// Klaviyo — retention forecast (placeholder — returns null when unavailable)
// ---------------------------------------------------------------------------

/**
 * Klaviyo-driven retention revenue forecast for the next 90 days.
 *
 * Without a fitted retention model in v1 we simply return null so that the
 * forward-revenue chart shows "—" for Klaviyo. The slot is wired up so that a
 * future model can drop in here without UI changes.
 */
export async function getKlaviyoRetentionForecast90d(
  _orgId: string,
  _asOfPeriod: string
): Promise<SourceValue> {
  return unavailable('klaviyo', 'no_retention_model');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown_error';
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
