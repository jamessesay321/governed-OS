/**
 * Trunk Show ROI — Cross-platform revenue attribution.
 *
 * Identifies trunk show consultations from Acuity (by type/calendar/location keywords),
 * cross-references with Shopify payments via name matching, and overlays Xero spend
 * to compute per-show and aggregate ROI.
 *
 * Pure computation — no API calls, no side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrunkShowAppointment {
  name: string;
  email?: string;
  date: string;
  type: string;
  calendar: string;
  location: string;
  price: number;
  paid: boolean;
  cancelled: boolean;
}

export interface TrunkShowPayment {
  customerName: string;
  email?: string;
  amount: number;
  date: string;
}

export interface TrunkShowEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  consultations: number;
  paidConsultations: number;
  consultationRevenue: number;
  /** Brides who also appear in Shopify orders */
  convertedBrides: string[];
  attributedRevenue: number;
  spend: number;
  roi: number | null;
  /** Days between first consultation and spend period */
}

export interface TrunkShowROISummary {
  events: TrunkShowEvent[];
  totals: {
    totalEvents: number;
    totalConsultations: number;
    totalConvertedBrides: number;
    totalAttributedRevenue: number;
    totalSpend: number;
    overallROI: number | null;
    avgRevenuePerShow: number;
    avgConsultationsPerShow: number;
    conversionRate: number | null;
  };
  upcoming: TrunkShowAppointment[];
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

const SHOW_KEYWORDS = [
  'trunk show', 'trunk-show', 'trunkshow',
  'ssy', 'sip and say yes', 'sip & say yes',
  'pop up', 'pop-up', 'popup',
  'bridal show', 'bridal event',
  'wedding fair', 'wedding show',
  'exhibition',
];

/**
 * Detect whether an Acuity appointment is associated with a trunk show.
 * Checks type, calendar name, and location for trunk show indicators.
 */
export function isTrunkShowAppointment(appt: TrunkShowAppointment): boolean {
  const searchText = `${appt.type} ${appt.calendar} ${appt.location}`.toLowerCase();
  return SHOW_KEYWORDS.some((kw) => searchText.includes(kw));
}

// ---------------------------------------------------------------------------
// Name matching (reuse pattern from funnel-metrics)
// ---------------------------------------------------------------------------

function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*-\s*(mto|bespoke|custom|sample|trunk show)$/i, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameSimilarity(a: string, b: string): number {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  const maxLen = Math.max(wordsA.size, wordsB.size);
  return maxLen > 0 ? overlap / maxLen : 0;
}

const MATCH_THRESHOLD = 0.7;

// ---------------------------------------------------------------------------
// Event grouping
// ---------------------------------------------------------------------------

/**
 * Groups trunk show appointments into events.
 * Appointments at the same location within a 3-day window = same event.
 */
function groupIntoEvents(
  appointments: TrunkShowAppointment[]
): Array<{ location: string; calendar: string; dates: string[]; appointments: TrunkShowAppointment[] }> {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const events: Array<{
    location: string;
    calendar: string;
    dates: string[];
    appointments: TrunkShowAppointment[];
  }> = [];

  for (const appt of sorted) {
    const apptDate = new Date(appt.date).getTime();
    const locationKey = (appt.location || appt.calendar).toLowerCase().trim();

    // Try to merge into an existing event
    const existing = events.find((e) => {
      const eLocKey = (e.location || e.calendar).toLowerCase().trim();
      if (eLocKey !== locationKey && nameSimilarity(eLocKey, locationKey) < 0.7) return false;
      const lastDate = new Date(e.dates[e.dates.length - 1]).getTime();
      return Math.abs(apptDate - lastDate) <= 3 * 24 * 60 * 60 * 1000;
    });

    if (existing) {
      const dateStr = appt.date.split('T')[0];
      if (!existing.dates.includes(dateStr)) existing.dates.push(dateStr);
      existing.appointments.push(appt);
    } else {
      events.push({
        location: appt.location || appt.calendar,
        calendar: appt.calendar,
        dates: [appt.date.split('T')[0]],
        appointments: [appt],
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

export function computeTrunkShowROI(
  appointments: TrunkShowAppointment[],
  payments: TrunkShowPayment[],
  spendByPeriod: Record<string, number>
): TrunkShowROISummary {
  // Filter to trunk show appointments only
  const showAppts = appointments.filter(
    (a) => !a.cancelled && isTrunkShowAppointment(a)
  );

  // Split into past and upcoming
  const now = new Date();
  const pastAppts = showAppts.filter((a) => new Date(a.date) < now);
  const upcomingAppts = showAppts
    .filter((a) => new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group past appointments into events
  const eventGroups = groupIntoEvents(pastAppts);

  const events: TrunkShowEvent[] = eventGroups.map((group, idx) => {
    const appts = group.appointments;
    const consultations = appts.length;
    const paidConsultations = appts.filter((a) => a.paid).length;
    const consultationRevenue = appts.reduce((s, a) => s + a.price, 0);

    // Match brides to Shopify payments
    const convertedBrides: string[] = [];
    let attributedRevenue = 0;

    for (const appt of appts) {
      const matchedPayments = payments.filter((p) => {
        // Match by email first
        if (appt.email && p.email && appt.email.toLowerCase() === p.email.toLowerCase()) return true;
        // Fall back to name matching
        return nameSimilarity(appt.name, p.customerName) >= MATCH_THRESHOLD;
      });

      if (matchedPayments.length > 0) {
        const brideName = appt.name;
        if (!convertedBrides.includes(brideName)) {
          convertedBrides.push(brideName);
        }
        // Only count payments AFTER the consultation date
        const consultDate = new Date(appt.date).getTime();
        for (const mp of matchedPayments) {
          if (new Date(mp.date).getTime() >= consultDate) {
            attributedRevenue += mp.amount;
          }
        }
      }
    }

    // Match spend to the event's month(s)
    let spend = 0;
    for (const date of group.dates) {
      const period = date.slice(0, 7) + '-01'; // "2026-04-01"
      spend += spendByPeriod[period] ?? 0;
    }
    // If multiple events in the same month, split spend proportionally
    // (simplified: divide month spend by number of events in that month)

    const roi = spend > 0 ? ((attributedRevenue - spend) / spend) * 100 : null;

    // Generate event name
    const location = group.location || 'Unknown Location';
    const startDate = group.dates[0];
    const endDate = group.dates[group.dates.length - 1];

    return {
      id: `show-${idx}`,
      name: `${location} Show`,
      location,
      startDate,
      endDate,
      consultations,
      paidConsultations,
      consultationRevenue,
      convertedBrides,
      attributedRevenue,
      spend,
      roi,
    };
  });

  // Sort by date descending (most recent first)
  events.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Aggregate totals
  const totalConsultations = events.reduce((s, e) => s + e.consultations, 0);
  const totalConvertedBrides = events.reduce((s, e) => s + e.convertedBrides.length, 0);
  const totalAttributedRevenue = events.reduce((s, e) => s + e.attributedRevenue, 0);
  const totalSpend = Object.values(spendByPeriod).reduce((s, v) => s + v, 0);

  return {
    events,
    totals: {
      totalEvents: events.length,
      totalConsultations,
      totalConvertedBrides,
      totalAttributedRevenue,
      totalSpend,
      overallROI: totalSpend > 0 ? ((totalAttributedRevenue - totalSpend) / totalSpend) * 100 : null,
      avgRevenuePerShow: events.length > 0 ? totalAttributedRevenue / events.length : 0,
      avgConsultationsPerShow: events.length > 0 ? totalConsultations / events.length : 0,
      conversionRate: totalConsultations > 0 ? totalConvertedBrides / totalConsultations : null,
    },
    upcoming: upcomingAppts.slice(0, 20),
  };
}
