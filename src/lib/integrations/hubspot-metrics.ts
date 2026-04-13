/**
 * HubSpot Deal Pipeline — Deterministic Computation Layer
 *
 * Pure functions that take deal data as input and compute pipeline metrics.
 * No API calls, no side effects, no AI — follows the same pattern as
 * buildSemanticPnL in src/lib/financial/aggregate.ts.
 *
 * Domain: Alonuko luxury bridal fashion house — each deal is a bride,
 * average deal size £4–9K.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HubSpotDeal {
  id: string;
  dealname: string;
  amount: number | null;
  dealstage: string;
  pipeline: string;
  closedate: string | null;
  createdate: string;
  /** Timestamp when deal entered current stage (hs_date_entered_{stageId}) */
  stageEnteredAt?: string | null;
}

export interface HubSpotStage {
  stageId: string;
  label: string;
  probability: number; // 0–1
  /** Whether this stage represents a closed state (won or lost) */
  isClosed: boolean;
  /** Whether this is a "won" close rather than a "lost" close */
  isWon: boolean;
  displayOrder: number;
}

export interface StageSummary {
  stageId: string;
  label: string;
  count: number;
  value: number;
  probability: number;
  weightedValue: number;
}

export interface PipelineSummary {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  avgDealSize: number;
  byStage: StageSummary[];
}

export interface PipelineVelocity {
  avgDaysToClose: number;
  medianDaysToClose: number;
  /** Closed Won / Total Closed (won + lost), 0–1 */
  conversionRate: number;
  avgDaysInCurrentStage: number;
}

export interface RevenueForecast {
  /** Weighted value of deals expected to close within 30 days */
  forecast30d: number;
  /** Weighted value of deals expected to close within 60 days */
  forecast60d: number;
  /** Weighted value of deals expected to close within 90 days */
  forecast90d: number;
  /** Total weighted pipeline value (all open deals × stage probability) */
  weightedPipelineValue: number;
}

export interface DealTrends {
  newDealsThisMonth: number;
  newDealsLastMonth: number;
  closedWonThisMonth: number;
  closedWonLastMonth: number;
  /** (thisMonth - lastMonth) / lastMonth, or null if lastMonth was 0 */
  monthOverMonthChange: number | null;
}

// ---------------------------------------------------------------------------
// Constants — Alonuko pipeline stage definitions
// ---------------------------------------------------------------------------

export const SALES_PIPELINE_ID = '1518125264';
export const UNCONFIRMED_ORDERS_PIPELINE_ID = '2869061873';

export const SALES_PIPELINE_STAGES: HubSpotStage[] = [
  { stageId: 'consultation_booked', label: 'Consultation Booked', probability: 0.20, isClosed: false, isWon: false, displayOrder: 0 },
  { stageId: 'no_deposit_no_tcs', label: 'No Deposit No T&Cs', probability: 0.40, isClosed: false, isWon: false, displayOrder: 1 },
  { stageId: 'no_show', label: 'No Show', probability: 0, isClosed: true, isWon: false, displayOrder: 2 },
  { stageId: 'deposit_paid_no_tcs', label: 'Deposit Paid no T&Cs', probability: 0.30, isClosed: false, isWon: false, displayOrder: 3 },
  { stageId: 'order_pack_sent', label: 'Order Pack Sent', probability: 0.20, isClosed: false, isWon: false, displayOrder: 4 },
  { stageId: 'closedwon', label: 'Closed Won', probability: 1.0, isClosed: true, isWon: true, displayOrder: 5 },
  { stageId: 'closedlost', label: 'Closed Lost', probability: 0, isClosed: true, isWon: false, displayOrder: 6 },
];

export const UNCONFIRMED_ORDERS_STAGES: HubSpotStage[] = [
  { stageId: 'consultation_scheduled', label: 'Consultation Scheduled', probability: 0.70, isClosed: false, isWon: false, displayOrder: 0 },
  { stageId: 'consultation_completed', label: 'Consultation Completed', probability: 0.40, isClosed: false, isWon: false, displayOrder: 1 },
  { stageId: 'order_pack_sent_uc', label: 'Order Pack Sent', probability: 0.30, isClosed: false, isWon: false, displayOrder: 2 },
  { stageId: 'committed_awaiting_deposit', label: 'Committed Awaiting Deposit', probability: 0.80, isClosed: false, isWon: false, displayOrder: 3 },
  { stageId: 'order_confirmed', label: 'Order Confirmed', probability: 1.0, isClosed: true, isWon: true, displayOrder: 4 },
  { stageId: 'deal_lost', label: 'Deal Lost', probability: 0, isClosed: true, isWon: false, displayOrder: 5 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Currency-safe rounding to 2 decimal places. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Days between two dates (absolute). */
function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

/** Median of a sorted numeric array. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Build a lookup map from stageId to HubSpotStage. */
function buildStageMap(stages: HubSpotStage[]): Map<string, HubSpotStage> {
  const map = new Map<string, HubSpotStage>();
  for (const s of stages) {
    map.set(s.stageId, s);
  }
  return map;
}

/** Get start of month (midnight local). */
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Get start of previous month (midnight local). */
function startOfPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

// ---------------------------------------------------------------------------
// 1. Pipeline Summary
// ---------------------------------------------------------------------------

/**
 * Compute aggregate pipeline metrics.
 * DETERMINISTIC — pure function, no side effects.
 */
export function computePipelineSummary(
  deals: HubSpotDeal[],
  stages: HubSpotStage[]
): PipelineSummary {
  const stageMap = buildStageMap(stages);

  // Initialise per-stage accumulators
  const stageAccum = new Map<string, StageSummary>();
  for (const stage of stages) {
    stageAccum.set(stage.stageId, {
      stageId: stage.stageId,
      label: stage.label,
      count: 0,
      value: 0,
      probability: stage.probability,
      weightedValue: 0,
    });
  }

  let totalValue = 0;
  let totalDeals = 0;

  for (const deal of deals) {
    const amount = deal.amount ?? 0;
    const stage = stageMap.get(deal.dealstage);
    const prob = stage?.probability ?? 0;

    totalDeals++;
    totalValue += amount;

    const accum = stageAccum.get(deal.dealstage);
    if (accum) {
      accum.count++;
      accum.value += amount;
      accum.weightedValue += amount * prob;
    }
  }

  const byStage = Array.from(stageAccum.values())
    .map((s) => ({
      ...s,
      value: round2(s.value),
      weightedValue: round2(s.weightedValue),
    }))
    .sort((a, b) => {
      const stageA = stages.find((s) => s.stageId === a.stageId);
      const stageB = stages.find((s) => s.stageId === b.stageId);
      return (stageA?.displayOrder ?? 0) - (stageB?.displayOrder ?? 0);
    });

  const weightedValue = round2(
    byStage.reduce((sum, s) => sum + s.weightedValue, 0)
  );

  return {
    totalDeals,
    totalValue: round2(totalValue),
    weightedValue,
    avgDealSize: totalDeals > 0 ? round2(totalValue / totalDeals) : 0,
    byStage,
  };
}

// ---------------------------------------------------------------------------
// 2. Pipeline Velocity
// ---------------------------------------------------------------------------

/**
 * Compute deal velocity and conversion metrics.
 * DETERMINISTIC — pure function, no side effects.
 */
export function computePipelineVelocity(
  deals: HubSpotDeal[],
  stages: HubSpotStage[]
): PipelineVelocity {
  const stageMap = buildStageMap(stages);
  const now = new Date();

  const closedWonDays: number[] = [];
  let closedWonCount = 0;
  let totalClosedCount = 0;
  const daysInCurrentStage: number[] = [];

  for (const deal of deals) {
    const stage = stageMap.get(deal.dealstage);
    if (!stage) continue;

    if (stage.isClosed) {
      totalClosedCount++;

      if (stage.isWon && deal.closedate) {
        closedWonCount++;
        const created = new Date(deal.createdate);
        const closed = new Date(deal.closedate);
        const days = daysBetween(created, closed);
        closedWonDays.push(days);
      }
    } else {
      // Open deal — calculate time in current stage
      if (deal.stageEnteredAt) {
        const entered = new Date(deal.stageEnteredAt);
        daysInCurrentStage.push(daysBetween(entered, now));
      } else {
        // Fallback: use createdate as proxy for time in pipeline
        const created = new Date(deal.createdate);
        daysInCurrentStage.push(daysBetween(created, now));
      }
    }
  }

  // Sort for median calculation
  closedWonDays.sort((a, b) => a - b);

  const avgDaysToClose =
    closedWonDays.length > 0
      ? round2(closedWonDays.reduce((s, d) => s + d, 0) / closedWonDays.length)
      : 0;

  const avgDaysInCurrentStage =
    daysInCurrentStage.length > 0
      ? round2(
          daysInCurrentStage.reduce((s, d) => s + d, 0) /
            daysInCurrentStage.length
        )
      : 0;

  return {
    avgDaysToClose,
    medianDaysToClose: round2(median(closedWonDays)),
    conversionRate:
      totalClosedCount > 0 ? round2(closedWonCount / totalClosedCount) : 0,
    avgDaysInCurrentStage,
  };
}

// ---------------------------------------------------------------------------
// 3. Revenue Forecast
// ---------------------------------------------------------------------------

/**
 * Compute weighted revenue forecast based on deal close dates and stage
 * probabilities. Open deals only — closed deals are excluded.
 * DETERMINISTIC — pure function, no side effects.
 *
 * @param now - optional date override for deterministic testing
 */
export function computeRevenueForecast(
  deals: HubSpotDeal[],
  stages: HubSpotStage[],
  now: Date = new Date()
): RevenueForecast {
  const stageMap = buildStageMap(stages);

  let forecast30d = 0;
  let forecast60d = 0;
  let forecast90d = 0;
  let weightedPipelineValue = 0;

  for (const deal of deals) {
    const stage = stageMap.get(deal.dealstage);
    if (!stage || stage.isClosed) continue;

    const amount = deal.amount ?? 0;
    const weighted = amount * stage.probability;
    weightedPipelineValue += weighted;

    if (!deal.closedate) continue;

    const close = new Date(deal.closedate);
    const daysUntilClose = (close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Only count future close dates
    if (daysUntilClose < 0) continue;

    if (daysUntilClose <= 30) forecast30d += weighted;
    if (daysUntilClose <= 60) forecast60d += weighted;
    if (daysUntilClose <= 90) forecast90d += weighted;
  }

  return {
    forecast30d: round2(forecast30d),
    forecast60d: round2(forecast60d),
    forecast90d: round2(forecast90d),
    weightedPipelineValue: round2(weightedPipelineValue),
  };
}

// ---------------------------------------------------------------------------
// 4. Deal Trends
// ---------------------------------------------------------------------------

/**
 * Compute month-over-month deal activity trends.
 * DETERMINISTIC — pure function, no side effects.
 *
 * @param now - optional date override for deterministic testing
 */
export function computeDealTrends(
  deals: HubSpotDeal[],
  stages: HubSpotStage[],
  now: Date = new Date()
): DealTrends {
  const stageMap = buildStageMap(stages);

  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfPreviousMonth(now);

  let newDealsThisMonth = 0;
  let newDealsLastMonth = 0;
  let closedWonThisMonth = 0;
  let closedWonLastMonth = 0;

  for (const deal of deals) {
    const created = new Date(deal.createdate);

    // New deals created this month
    if (created >= thisMonthStart) {
      newDealsThisMonth++;
    } else if (created >= lastMonthStart && created < thisMonthStart) {
      newDealsLastMonth++;
    }

    // Closed won deals
    const stage = stageMap.get(deal.dealstage);
    if (stage?.isWon && deal.closedate) {
      const closed = new Date(deal.closedate);
      if (closed >= thisMonthStart) {
        closedWonThisMonth++;
      } else if (closed >= lastMonthStart && closed < thisMonthStart) {
        closedWonLastMonth++;
      }
    }
  }

  const monthOverMonthChange =
    closedWonLastMonth > 0
      ? round2((closedWonThisMonth - closedWonLastMonth) / closedWonLastMonth)
      : null;

  return {
    newDealsThisMonth,
    newDealsLastMonth,
    closedWonThisMonth,
    closedWonLastMonth,
    monthOverMonthChange,
  };
}
