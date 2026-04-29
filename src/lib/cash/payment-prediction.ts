/**
 * Expected-payment-date prediction.
 *
 * Per customer, we look at the last 24 months of fully-paid invoices and learn
 * how many days late they typically pay relative to the invoice due date,
 * weighted by recency (90-day half-life). When a customer has too few samples,
 * we fall back to org-wide behaviour, then to size-bucket behaviour, then to
 * the raw due date.
 *
 * Pure functions only — no database access. The page loads historical
 * invoices and calls these helpers.
 */

export type Confidence = 'high' | 'medium' | 'low';

export interface HistoricalInvoice {
  contactXeroId: string;
  dueDate: string; // YYYY-MM-DD
  fullyPaidOn: string; // YYYY-MM-DD
  total: number;
}

export interface CustomerPaymentProfile {
  contactXeroId: string;
  contactName?: string;
  avgDaysLate: number;
  weightedDaysLate: number;
  varianceDays: number;
  sampleSize: number;
  confidence: Confidence;
}

export interface PredictionInput {
  contactXeroId: string | null;
  dueDate: string; // YYYY-MM-DD
  total: number;
}

export interface PredictionResult {
  expectedDate: string; // YYYY-MM-DD
  expectedDaysLate: number; // clamped, may be negative
  confidence: Confidence;
  source: 'customer' | 'org' | 'size_bucket' | 'due_date';
}

const HALF_LIFE_DAYS = 90;
const LOOKBACK_DAYS = 24 * 30; // ~24 months
const MIN_CONFIDENCE_FOR_CUSTOMER = 0.3;
const CLAMP_MIN = -14;
const CLAMP_MAX = 90;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(s: string): Date {
  // Treat YYYY-MM-DD as UTC midnight to avoid TZ drift.
  return new Date(`${s.substring(0, 10)}T00:00:00Z`);
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return formatDate(d);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function confidenceLabel(score: number): Confidence {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Compute one customer's payment profile from historical paid invoices.
 *
 * weight_i = exp(-ln(2) * age_days / 90)
 * weighted_days_late = Σ(days_late × weight) / Σ(weight)
 * confidence = clamp(n/10, 0, 1) × exp(-variance/100)
 */
export function computeCustomerProfile(
  contactXeroId: string,
  contactName: string | undefined,
  paidInvoices: HistoricalInvoice[],
  referenceDate: Date = new Date(),
): CustomerPaymentProfile {
  const cutoff = new Date(referenceDate.getTime() - LOOKBACK_DAYS * MS_PER_DAY);

  const samples = paidInvoices.filter((inv) => {
    const paid = parseDate(inv.fullyPaidOn);
    return paid >= cutoff && paid <= referenceDate;
  });

  if (samples.length === 0) {
    return {
      contactXeroId,
      contactName,
      avgDaysLate: 0,
      weightedDaysLate: 0,
      varianceDays: 0,
      sampleSize: 0,
      confidence: 'low',
    };
  }

  let sumDaysLate = 0;
  let sumWeight = 0;
  let sumWeightedDaysLate = 0;
  const daysLateSamples: number[] = [];

  for (const inv of samples) {
    const due = parseDate(inv.dueDate);
    const paid = parseDate(inv.fullyPaidOn);
    const daysLate = diffDays(paid, due);
    daysLateSamples.push(daysLate);
    sumDaysLate += daysLate;

    const ageDays = diffDays(referenceDate, paid);
    const weight = Math.exp((-Math.LN2 * Math.max(ageDays, 0)) / HALF_LIFE_DAYS);
    sumWeight += weight;
    sumWeightedDaysLate += daysLate * weight;
  }

  const avgDaysLate = sumDaysLate / samples.length;
  const weightedDaysLate = sumWeight > 0 ? sumWeightedDaysLate / sumWeight : avgDaysLate;

  let variance = 0;
  for (const d of daysLateSamples) {
    variance += (d - avgDaysLate) ** 2;
  }
  variance = variance / samples.length;

  const confidenceScore =
    clamp(samples.length / 10, 0, 1) * Math.exp(-variance / 100);

  return {
    contactXeroId,
    contactName,
    avgDaysLate: Number(avgDaysLate.toFixed(2)),
    weightedDaysLate: Number(weightedDaysLate.toFixed(2)),
    varianceDays: Number(variance.toFixed(2)),
    sampleSize: samples.length,
    confidence: confidenceLabel(confidenceScore),
  };
}

/**
 * Build per-customer profiles from a flat list of paid invoices.
 */
export function buildProfilesByCustomer(
  paidInvoices: HistoricalInvoice[],
  contactNames: Record<string, string> = {},
  referenceDate: Date = new Date(),
): Map<string, CustomerPaymentProfile> {
  const grouped = new Map<string, HistoricalInvoice[]>();
  for (const inv of paidInvoices) {
    if (!inv.contactXeroId) continue;
    const list = grouped.get(inv.contactXeroId) ?? [];
    list.push(inv);
    grouped.set(inv.contactXeroId, list);
  }

  const profiles = new Map<string, CustomerPaymentProfile>();
  for (const [contactId, invs] of grouped) {
    profiles.set(
      contactId,
      computeCustomerProfile(contactId, contactNames[contactId], invs, referenceDate),
    );
  }
  return profiles;
}

/**
 * Compute the org-wide weighted-average days-late, used as fallback.
 */
export function computeOrgProfile(
  paidInvoices: HistoricalInvoice[],
  referenceDate: Date = new Date(),
): { weightedDaysLate: number; sampleSize: number } {
  if (paidInvoices.length === 0) {
    return { weightedDaysLate: 0, sampleSize: 0 };
  }
  const profile = computeCustomerProfile('__org__', undefined, paidInvoices, referenceDate);
  return { weightedDaysLate: profile.weightedDaysLate, sampleSize: profile.sampleSize };
}

/**
 * Bucket invoice by total — used for the size-bucket fallback.
 * Buckets are coarse on purpose: we just want a "small/medium/large" signal.
 */
export function sizeBucket(total: number): 'small' | 'medium' | 'large' {
  const v = Math.abs(total);
  if (v < 1000) return 'small';
  if (v < 10000) return 'medium';
  return 'large';
}

/**
 * Compute weighted-days-late by size bucket (org-wide), for the second fallback.
 */
export function computeSizeBucketProfiles(
  paidInvoices: HistoricalInvoice[],
  referenceDate: Date = new Date(),
): Record<'small' | 'medium' | 'large', { weightedDaysLate: number; sampleSize: number }> {
  const buckets: Record<'small' | 'medium' | 'large', HistoricalInvoice[]> = {
    small: [],
    medium: [],
    large: [],
  };
  for (const inv of paidInvoices) {
    buckets[sizeBucket(inv.total)].push(inv);
  }
  return {
    small: computeOrgProfile(buckets.small, referenceDate),
    medium: computeOrgProfile(buckets.medium, referenceDate),
    large: computeOrgProfile(buckets.large, referenceDate),
  };
}

export interface PredictionContext {
  customerProfiles: Map<string, CustomerPaymentProfile>;
  orgProfile: { weightedDaysLate: number; sampleSize: number };
  sizeBuckets: Record<'small' | 'medium' | 'large', { weightedDaysLate: number; sampleSize: number }>;
}

/**
 * Predict expected payment date for a single open invoice.
 *
 * Selection order:
 *   1. customer profile if confidence ≥ 'medium' (≈ 0.4 score)
 *   2. org-wide weighted average if it has samples
 *   3. size-bucket weighted average if that bucket has samples
 *   4. due date as-is
 *
 * The result is clamped to [-14, +90] days relative to the due date.
 */
export function predictExpectedDate(
  invoice: PredictionInput,
  ctx: PredictionContext,
): PredictionResult {
  const customer = invoice.contactXeroId
    ? ctx.customerProfiles.get(invoice.contactXeroId)
    : undefined;

  const customerOk =
    customer &&
    (customer.confidence === 'high' || customer.confidence === 'medium') &&
    customer.sampleSize >= 2;

  if (customerOk && customer) {
    const days = clamp(customer.weightedDaysLate, CLAMP_MIN, CLAMP_MAX);
    return {
      expectedDate: addDays(invoice.dueDate, days),
      expectedDaysLate: Number(days.toFixed(1)),
      confidence: customer.confidence,
      source: 'customer',
    };
  }

  if (ctx.orgProfile.sampleSize >= 5) {
    const days = clamp(ctx.orgProfile.weightedDaysLate, CLAMP_MIN, CLAMP_MAX);
    return {
      expectedDate: addDays(invoice.dueDate, days),
      expectedDaysLate: Number(days.toFixed(1)),
      confidence: 'low',
      source: 'org',
    };
  }

  const bucket = ctx.sizeBuckets[sizeBucket(invoice.total)];
  if (bucket.sampleSize >= 3) {
    const days = clamp(bucket.weightedDaysLate, CLAMP_MIN, CLAMP_MAX);
    return {
      expectedDate: addDays(invoice.dueDate, days),
      expectedDaysLate: Number(days.toFixed(1)),
      confidence: 'low',
      source: 'size_bucket',
    };
  }

  return {
    expectedDate: invoice.dueDate,
    expectedDaysLate: 0,
    confidence: 'low',
    source: 'due_date',
  };
}

// Exports for tests / fallback callers
export const __internals = {
  HALF_LIFE_DAYS,
  LOOKBACK_DAYS,
  MIN_CONFIDENCE_FOR_CUSTOMER,
  CLAMP_MIN,
  CLAMP_MAX,
  parseDate,
  formatDate,
  addDays,
  clamp,
};
