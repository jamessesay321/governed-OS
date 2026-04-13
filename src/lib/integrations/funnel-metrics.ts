/**
 * Cross-Platform Funnel Metrics — Deterministic Computation Layer
 * ---------------------------------------------------------------
 * Tracks the bride journey across platforms:
 *   Acuity (consultation) → HubSpot (deal) → Monday (confirmed order) → Shopify (payments)
 *
 * Uses fuzzy name matching to link records across systems since there is
 * no shared unique identifier. The matching is conservative: only names
 * with high similarity are considered the same person.
 *
 * DETERMINISTIC — no AI, no side effects, no database calls.
 */

// ---------------------------------------------------------------------------
// Input types (from each platform's metrics layer)
// ---------------------------------------------------------------------------

export interface FunnelConsultation {
  name: string;
  email?: string;
  date: string;
  type: string; // e.g. 'Made-to-order: In-person Consultation'
  price: number;
  paid: boolean;
  cancelled: boolean;
}

export interface FunnelDeal {
  name: string; // deal name (usually client name)
  email?: string;
  stage: string; // e.g. 'Consultation Booked', 'Closed Won', 'Closed Lost'
  pipeline: string; // 'Sales Pipeline' or 'Unconfirmed Orders'
  amount: number;
  createdAt: string;
  closedAt?: string;
}

export interface FunnelOrder {
  clientName: string;
  email?: string;
  status: string; // 'confirmed', 'on_hold', 'cancelled', 'completed', 'enquiry'
  dressPrice: number;
  totalPaid: number;
  outstandingBalance: number;
  orderDate?: string;
  weddingDate?: string;
}

export interface FunnelPayment {
  customerName: string;
  email?: string;
  amount: number;
  date: string;
  lineItemType: string; // 'deposits', 'balance_payments', 'consultations', etc.
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface FunnelStage {
  stage: string;
  count: number;
  value: number;
}

export interface FunnelSummary {
  stages: FunnelStage[];
  conversionRates: {
    consultationToOrder: number | null; // fraction 0-1
    consultationToDeal: number | null;
    dealToConfirmedOrder: number | null;
    orderToFullPayment: number | null;
  };
  /** Total unique names seen across all platforms */
  totalUniqueBrides: number;
  /** Names found in consultation but NOT in confirmed orders */
  droppedAfterConsultation: string[];
  /** Names found in confirmed orders but NOT in Shopify payments */
  awaitingPayment: string[];
  /** Names with completed journey (consultation → order → payment) */
  completedJourneys: number;
  /** Average days from consultation to confirmed order */
  avgDaysToConvert: number | null;
  /** Monthly conversion data */
  monthlyConversions: {
    month: string;
    consultations: number;
    confirmedOrders: number;
    conversionRate: number | null;
  }[];
}

export interface BrideJourney {
  name: string;
  normalizedName: string;
  consultation?: { date: string; type: string; price: number; paid: boolean };
  deal?: { stage: string; pipeline: string; amount: number; createdAt: string };
  order?: { status: string; dressPrice: number; totalPaid: number; outstanding: number };
  payments: { date: string; amount: number; type: string }[];
  journeyStage: 'consultation_only' | 'deal_created' | 'order_confirmed' | 'partially_paid' | 'fully_paid' | 'lost';
  totalValue: number;
  totalPaid: number;
}

// ---------------------------------------------------------------------------
// Name normalisation and fuzzy matching
// ---------------------------------------------------------------------------

/** Normalise a name for matching: lowercase, trim, remove titles and punctuation. */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common titles
    .replace(/\b(mrs?|ms|miss|dr|prof)\.?\s*/gi, '')
    // Remove suffixes like " - MTO", " - Bespoke"
    .replace(/\s*-\s*(mto|bespoke|made to order|ready to wear)$/i, '')
    // Remove non-alpha characters except spaces
    .replace(/[^a-z\s]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/** Simple similarity score between two normalised names (0-1). */
function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  // Check if one contains the other (handles "Ana Fonseca" vs "Ana Karina Fonseca")
  if (a.includes(b) || b.includes(a)) return 0.85;

  // Split into parts and check overlap
  const partsA = a.split(' ');
  const partsB = b.split(' ');
  const commonParts = partsA.filter((p) => partsB.includes(p));

  if (commonParts.length === 0) return 0;

  // Score based on proportion of matching parts
  const maxParts = Math.max(partsA.length, partsB.length);
  return commonParts.length / maxParts;
}

/** Match threshold — names must score above this to be considered the same person. */
const MATCH_THRESHOLD = 0.7;

/**
 * Build a unified name index across all platforms.
 * Groups records that refer to the same person by name similarity.
 */
function buildNameIndex(
  consultations: FunnelConsultation[],
  deals: FunnelDeal[],
  orders: FunnelOrder[],
  payments: FunnelPayment[]
): Map<string, { originalNames: Set<string>; sources: Set<string> }> {
  const allNames: { name: string; source: string }[] = [];

  for (const c of consultations) {
    if (!c.cancelled) allNames.push({ name: c.name, source: 'acuity' });
  }
  for (const d of deals) allNames.push({ name: d.name, source: 'hubspot' });
  for (const o of orders) allNames.push({ name: o.clientName, source: 'monday' });
  for (const p of payments) allNames.push({ name: p.customerName, source: 'shopify' });

  // Group by normalised name, merging similar names
  const groups = new Map<string, { originalNames: Set<string>; sources: Set<string> }>();

  for (const { name, source } of allNames) {
    const normalised = normaliseName(name);
    if (!normalised) continue;

    // Check if this name matches an existing group
    let matched = false;
    for (const [key, group] of groups) {
      if (nameSimilarity(normalised, key) >= MATCH_THRESHOLD) {
        group.originalNames.add(name);
        group.sources.add(source);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.set(normalised, {
        originalNames: new Set([name]),
        sources: new Set([source]),
      });
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Compute the full bride journey for each unique person, matching across platforms.
 */
export function computeBrideJourneys(
  consultations: FunnelConsultation[],
  deals: FunnelDeal[],
  orders: FunnelOrder[],
  payments: FunnelPayment[]
): BrideJourney[] {
  const activeConsultations = consultations.filter((c) => !c.cancelled);

  const journeys: BrideJourney[] = [];

  // Index all records by normalised name for fast lookup
  const consultationsByName = new Map<string, FunnelConsultation>();
  for (const c of activeConsultations) {
    const n = normaliseName(c.name);
    if (n) consultationsByName.set(n, c);
  }

  const dealsByName = new Map<string, FunnelDeal>();
  for (const d of deals) {
    const n = normaliseName(d.name);
    if (n) dealsByName.set(n, d);
  }

  const ordersByName = new Map<string, FunnelOrder>();
  for (const o of orders) {
    const n = normaliseName(o.clientName);
    if (n) ordersByName.set(n, o);
  }

  const paymentsByName = new Map<string, FunnelPayment[]>();
  for (const p of payments) {
    const n = normaliseName(p.customerName);
    if (!n) continue;
    const existing = paymentsByName.get(n) ?? [];
    existing.push(p);
    paymentsByName.set(n, existing);
  }

  // Collect all unique normalised names
  const allNormalisedNames = new Set<string>();
  for (const n of consultationsByName.keys()) allNormalisedNames.add(n);
  for (const n of dealsByName.keys()) allNormalisedNames.add(n);
  for (const n of ordersByName.keys()) allNormalisedNames.add(n);
  for (const n of paymentsByName.keys()) allNormalisedNames.add(n);

  for (const normalizedName of allNormalisedNames) {
    // Find best match in each platform using fuzzy matching
    const consultation = findBestMatch(normalizedName, consultationsByName);
    const deal = findBestMatch(normalizedName, dealsByName);
    const order = findBestMatch(normalizedName, ordersByName);
    const pmts = findBestMatchArray(normalizedName, paymentsByName);

    const totalPayments = pmts.reduce((sum, p) => sum + p.amount, 0);
    const orderValue = order?.dressPrice ?? deal?.amount ?? 0;
    const orderPaid = order?.totalPaid ?? totalPayments;

    // Determine journey stage
    let journeyStage: BrideJourney['journeyStage'];
    if (deal?.stage === 'Closed Lost' || deal?.pipeline === 'Unconfirmed Orders') {
      journeyStage = 'lost';
    } else if (order && orderValue > 0 && orderPaid >= orderValue * 0.95) {
      journeyStage = 'fully_paid';
    } else if (order && orderPaid > 0) {
      journeyStage = 'partially_paid';
    } else if (order) {
      journeyStage = 'order_confirmed';
    } else if (deal) {
      journeyStage = 'deal_created';
    } else {
      journeyStage = 'consultation_only';
    }

    // Pick the best display name
    const displayName = order?.clientName ?? deal?.name ?? consultation?.name ?? normalizedName;

    journeys.push({
      name: displayName,
      normalizedName,
      consultation: consultation
        ? { date: consultation.date, type: consultation.type, price: consultation.price, paid: consultation.paid }
        : undefined,
      deal: deal
        ? { stage: deal.stage, pipeline: deal.pipeline, amount: deal.amount, createdAt: deal.createdAt }
        : undefined,
      order: order
        ? { status: order.status, dressPrice: order.dressPrice, totalPaid: order.totalPaid, outstanding: order.outstandingBalance }
        : undefined,
      payments: pmts.map((p) => ({ date: p.date, amount: p.amount, type: p.lineItemType })),
      journeyStage,
      totalValue: orderValue,
      totalPaid: orderPaid,
    });
  }

  return journeys.sort((a, b) => b.totalValue - a.totalValue);
}

function findBestMatch<T>(name: string, map: Map<string, T>): T | undefined {
  const exact = map.get(name);
  if (exact) return exact;

  let bestScore = 0;
  let bestMatch: T | undefined;
  for (const [key, value] of map) {
    const score = nameSimilarity(name, key);
    if (score >= MATCH_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  return bestMatch;
}

function findBestMatchArray<T>(name: string, map: Map<string, T[]>): T[] {
  const exact = map.get(name);
  if (exact) return exact;

  let bestScore = 0;
  let bestMatch: T[] = [];
  for (const [key, value] of map) {
    const score = nameSimilarity(name, key);
    if (score >= MATCH_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  return bestMatch;
}

/**
 * Compute funnel summary metrics from bride journeys.
 */
export function computeFunnelSummary(
  consultations: FunnelConsultation[],
  deals: FunnelDeal[],
  orders: FunnelOrder[],
  payments: FunnelPayment[]
): FunnelSummary {
  const journeys = computeBrideJourneys(consultations, deals, orders, payments);
  const activeConsultations = consultations.filter((c) => !c.cancelled);

  // Stage counts
  const stageCounts: Record<BrideJourney['journeyStage'], { count: number; value: number }> = {
    consultation_only: { count: 0, value: 0 },
    deal_created: { count: 0, value: 0 },
    order_confirmed: { count: 0, value: 0 },
    partially_paid: { count: 0, value: 0 },
    fully_paid: { count: 0, value: 0 },
    lost: { count: 0, value: 0 },
  };

  for (const j of journeys) {
    stageCounts[j.journeyStage].count++;
    stageCounts[j.journeyStage].value += j.totalValue;
  }

  const stages: FunnelStage[] = [
    { stage: 'Consultation', count: activeConsultations.length, value: round2(activeConsultations.reduce((s, c) => s + c.price, 0)) },
    { stage: 'Deal Created', count: stageCounts.deal_created.count + stageCounts.order_confirmed.count + stageCounts.partially_paid.count + stageCounts.fully_paid.count + stageCounts.lost.count, value: 0 },
    { stage: 'Order Confirmed', count: stageCounts.order_confirmed.count + stageCounts.partially_paid.count + stageCounts.fully_paid.count, value: round2(stageCounts.order_confirmed.value + stageCounts.partially_paid.value + stageCounts.fully_paid.value) },
    { stage: 'Partially Paid', count: stageCounts.partially_paid.count + stageCounts.fully_paid.count, value: round2(stageCounts.partially_paid.value + stageCounts.fully_paid.value) },
    { stage: 'Fully Paid', count: stageCounts.fully_paid.count, value: round2(stageCounts.fully_paid.value) },
    { stage: 'Lost', count: stageCounts.lost.count, value: round2(stageCounts.lost.value) },
  ];

  // Compute deal value for "Deal Created" stage
  stages[1].value = round2(deals.reduce((s, d) => s + d.amount, 0));

  // Conversion rates
  const withConsultation = journeys.filter((j) => j.consultation);
  const withOrder = journeys.filter((j) => j.order && j.order.status !== 'cancelled');
  const confirmedFromConsultation = withConsultation.filter(
    (j) => j.order && j.order.status !== 'cancelled'
  );

  const consultationToOrder = withConsultation.length > 0
    ? round2(confirmedFromConsultation.length / withConsultation.length)
    : null;

  const withDeal = journeys.filter((j) => j.deal);
  const consultationToDeal = withConsultation.length > 0
    ? round2(withDeal.filter((j) => j.consultation).length / withConsultation.length)
    : null;

  const dealToOrder = withDeal.length > 0
    ? round2(withOrder.filter((j) => j.deal).length / withDeal.length)
    : null;

  const fullyPaidOrders = withOrder.filter(
    (j) => j.totalValue > 0 && j.totalPaid >= j.totalValue * 0.95
  );
  const orderToFullPayment = withOrder.length > 0
    ? round2(fullyPaidOrders.length / withOrder.length)
    : null;

  // Dropped after consultation (had consultation, no confirmed order, not lost)
  const droppedAfterConsultation = journeys
    .filter((j) => j.journeyStage === 'consultation_only')
    .map((j) => j.name);

  // Awaiting payment (order confirmed but not fully paid)
  const awaitingPayment = journeys
    .filter((j) => j.journeyStage === 'order_confirmed')
    .map((j) => j.name);

  // Average days to convert (consultation date → order date or deal created date)
  const conversionDays: number[] = [];
  for (const j of confirmedFromConsultation) {
    const consultDate = new Date(j.consultation!.date);
    const orderDate = j.deal?.createdAt ? new Date(j.deal.createdAt) : null;
    if (orderDate && !isNaN(consultDate.getTime()) && !isNaN(orderDate.getTime())) {
      const days = Math.abs(orderDate.getTime() - consultDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days < 365) conversionDays.push(days); // exclude outliers
    }
  }
  const avgDaysToConvert = conversionDays.length > 0
    ? round2(conversionDays.reduce((a, b) => a + b, 0) / conversionDays.length)
    : null;

  // Monthly conversions
  const monthlyMap = new Map<string, { consultations: number; confirmed: number }>();
  for (const c of activeConsultations) {
    const month = toMonthKey(c.date);
    if (!month) continue;
    const entry = monthlyMap.get(month) ?? { consultations: 0, confirmed: 0 };
    entry.consultations++;
    monthlyMap.set(month, entry);
  }
  // Count confirmed orders by their consultation month
  for (const j of confirmedFromConsultation) {
    if (!j.consultation) continue;
    const month = toMonthKey(j.consultation.date);
    if (!month) continue;
    const entry = monthlyMap.get(month) ?? { consultations: 0, confirmed: 0 };
    entry.confirmed++;
    monthlyMap.set(month, entry);
  }

  const monthlyConversions = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      consultations: data.consultations,
      confirmedOrders: data.confirmed,
      conversionRate: data.consultations > 0
        ? round2(data.confirmed / data.consultations)
        : null,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    stages,
    conversionRates: {
      consultationToOrder,
      consultationToDeal,
      dealToConfirmedOrder: dealToOrder,
      orderToFullPayment,
    },
    totalUniqueBrides: journeys.length,
    droppedAfterConsultation,
    awaitingPayment,
    completedJourneys: stageCounts.fully_paid.count,
    avgDaysToConvert,
    monthlyConversions,
  };
}
