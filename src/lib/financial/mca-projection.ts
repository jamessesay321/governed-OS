/**
 * MCA (Merchant Cash Advance) Repayment Projection Engine
 *
 * IMPORTANT: All outputs from this engine are PROJECTIONS based on historical
 * cashflow patterns. They should be treated as dynamic estimates, not guarantees.
 * Actual repayment timelines will vary with revenue.
 *
 * MCA loans are repaid via a percentage sweep of revenue through payment processors
 * (e.g. Shopify, Stripe). They do not have fixed maturity dates — they end when
 * the total repayment amount (original advance + fixed fee) is reached.
 *
 * This is a pure deterministic library — no AI, no database calls. All inputs
 * are passed in; all outputs are computed.
 */

// ─── Interfaces ────────────────────────────────────────────────────

export interface MCAFacility {
  id: string;
  facilityName: string;
  lender: string;
  originalAmount: number;       // Total advance received
  fixedFee: number;             // Fixed repayment fee (total = original + fee)
  totalToRepay: number;         // original + fixedFee
  currentBalance: number;       // Remaining to repay
  sweepPercentage: number;      // e.g. 0.17 = 17%
  sweepSource: string;          // 'shopify' | 'stripe' | 'both'
  startDate: string;            // ISO date string
}

export interface CashflowProjectionInput {
  /** Historical monthly revenue by Shopify source (last 6-12 months) */
  historicalShopifyRevenue: { period: string; amount: number }[];
  /** Historical monthly revenue by Stripe source (last 6-12 months) */
  historicalStripeRevenue: { period: string; amount: number }[];
  /** Optional monthly growth rate assumption (default 0 = flat projection) */
  monthlyGrowthRate?: number;
  /** Optional seasonality multipliers keyed by month number 1-12 */
  seasonalityFactors?: Record<string, number>;
}

export interface MCAProjectionResult {
  facility: MCAFacility;
  monthlyProjections: MCAMonthProjection[];
  estimatedPayoffDate: string | null;
  estimatedMonthsRemaining: number | null;
  totalInterestCost: number;
  effectiveAPR: number;
  averageMonthlyRepayment: number;
  /** Pessimistic / Baseline / Optimistic payoff scenarios */
  scenarios: {
    pessimistic: { payoffDate: string | null; months: number | null };
    baseline: { payoffDate: string | null; months: number | null };
    optimistic: { payoffDate: string | null; months: number | null };
  };
}

export interface MCAMonthProjection {
  period: string;               // YYYY-MM
  projectedRevenue: number;     // Revenue through this MCA's sweep source
  sweepAmount: number;          // revenue * sweepPercentage
  openingBalance: number;
  closingBalance: number;
  isPaidOff: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────

/** Maximum months to project forward to avoid infinite loops */
const MAX_PROJECTION_MONTHS = 120; // 10 years

/** Scenario revenue adjustments */
const PESSIMISTIC_FACTOR = 0.80; // -20%
const OPTIMISTIC_FACTOR = 1.20;  // +20%

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Compute the average monthly revenue from a historical series.
 * Returns 0 if no data is provided.
 */
function computeAverageRevenue(
  history: { period: string; amount: number }[],
): number {
  if (history.length === 0) return 0;
  const total = history.reduce((sum, h) => sum + h.amount, 0);
  return total / history.length;
}

/**
 * Generate the next month period string from a given YYYY-MM period.
 */
function nextPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Get the current period as YYYY-MM.
 */
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format a period string into a human-readable label.
 */
export function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * Get the month number (1-12) from a YYYY-MM period.
 */
function getMonthNumber(period: string): number {
  return parseInt(period.split('-')[1], 10);
}

// ─── Core Projection ───────────────────────────────────────────────

/**
 * Project monthly sweep repayments for a single MCA facility.
 *
 * PROJECTION ONLY: Results are estimates based on historical revenue patterns.
 * Actual repayment speed depends on future revenue through the sweep source.
 *
 * @param facility       The MCA facility to project
 * @param averageRevenue Average monthly revenue through the facility's sweep source
 * @param growthRate     Monthly revenue growth rate (default 0)
 * @param seasonality    Optional month-keyed seasonality multipliers
 * @param revenueFactor  Scenario multiplier (e.g. 0.8 for pessimistic)
 * @returns Array of monthly projections until payoff or max months
 */
function projectFacility(
  facility: MCAFacility,
  averageRevenue: number,
  growthRate: number = 0,
  seasonality?: Record<string, number>,
  revenueFactor: number = 1.0,
): MCAMonthProjection[] {
  const projections: MCAMonthProjection[] = [];
  let balance = facility.currentBalance;
  let period = currentPeriod();
  const baseRevenue = averageRevenue * revenueFactor;

  for (let i = 0; i < MAX_PROJECTION_MONTHS; i++) {
    if (balance <= 0) break;

    const openingBalance = balance;

    // Apply growth compounding
    const grownRevenue = baseRevenue * Math.pow(1 + growthRate, i);

    // Apply seasonality multiplier if provided
    const monthNum = getMonthNumber(period);
    const seasonalMultiplier = seasonality?.[String(monthNum)] ?? 1.0;

    const projectedRevenue = Math.max(0, grownRevenue * seasonalMultiplier);
    const sweepAmount = Math.min(projectedRevenue * facility.sweepPercentage, balance);
    balance = Math.max(0, balance - sweepAmount);

    projections.push({
      period,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      sweepAmount: Math.round(sweepAmount * 100) / 100,
      openingBalance: Math.round(openingBalance * 100) / 100,
      closingBalance: Math.round(balance * 100) / 100,
      isPaidOff: balance <= 0,
    });

    if (balance <= 0) break;
    period = nextPeriod(period);
  }

  return projections;
}

/**
 * Compute effective APR for an MCA facility.
 *
 * For MCAs, the cost is a fixed fee rather than an interest rate. The effective
 * APR is calculated as: (fixedFee / originalAmount) / (estimatedMonths / 12)
 *
 * This gives an annualised cost percentage. Note: this is only an estimate
 * because the actual term depends on revenue throughput.
 */
function computeEffectiveAPR(
  fixedFee: number,
  originalAmount: number,
  estimatedMonths: number | null,
): number {
  if (!estimatedMonths || estimatedMonths <= 0 || originalAmount <= 0) return 0;
  const costRatio = fixedFee / originalAmount;
  const yearsToPayoff = estimatedMonths / 12;
  return costRatio / yearsToPayoff;
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Generate a full MCA projection for a single facility.
 *
 * PROJECTION DISCLAIMER: All dates, amounts, and APR values are estimates
 * based on historical cashflow patterns. They are not guarantees and will
 * change as actual revenue fluctuates.
 */
export function projectMCAFacility(
  facility: MCAFacility,
  input: CashflowProjectionInput,
): MCAProjectionResult {
  // Determine average monthly revenue for this facility's sweep source
  let averageRevenue = 0;
  if (facility.sweepSource === 'shopify') {
    averageRevenue = computeAverageRevenue(input.historicalShopifyRevenue);
  } else if (facility.sweepSource === 'stripe') {
    averageRevenue = computeAverageRevenue(input.historicalStripeRevenue);
  } else {
    // 'both' or unknown — combine both sources
    averageRevenue =
      computeAverageRevenue(input.historicalShopifyRevenue) +
      computeAverageRevenue(input.historicalStripeRevenue);
  }

  const growthRate = input.monthlyGrowthRate ?? 0;
  const seasonality = input.seasonalityFactors;

  // Run baseline projection
  const baselineProjections = projectFacility(
    facility, averageRevenue, growthRate, seasonality, 1.0,
  );

  // Run scenario projections
  const pessimisticProjections = projectFacility(
    facility, averageRevenue, growthRate, seasonality, PESSIMISTIC_FACTOR,
  );
  const optimisticProjections = projectFacility(
    facility, averageRevenue, growthRate, seasonality, OPTIMISTIC_FACTOR,
  );

  // Extract payoff info from each scenario
  const basePayoff = baselineProjections.find((p) => p.isPaidOff);
  const pessPayoff = pessimisticProjections.find((p) => p.isPaidOff);
  const optPayoff = optimisticProjections.find((p) => p.isPaidOff);

  const baselineMonths = basePayoff
    ? baselineProjections.indexOf(basePayoff) + 1
    : null;
  const pessimisticMonths = pessPayoff
    ? pessimisticProjections.indexOf(pessPayoff) + 1
    : null;
  const optimisticMonths = optPayoff
    ? optimisticProjections.indexOf(optPayoff) + 1
    : null;

  // Calculate total interest cost (fee portion of total repayment)
  const totalInterestCost = facility.fixedFee;

  // Effective APR based on the total term from advance start to projected payoff
  // We estimate total term = months already elapsed + projected remaining months
  const monthsElapsed = (() => {
    if (!facility.startDate) return 0;
    const start = new Date(facility.startDate);
    const now = new Date();
    return Math.max(0, Math.round(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    ));
  })();
  const totalEstimatedTerm = baselineMonths !== null
    ? monthsElapsed + baselineMonths
    : null;
  const effectiveAPR = computeEffectiveAPR(
    facility.fixedFee, facility.originalAmount, totalEstimatedTerm,
  );

  // Average monthly repayment from baseline
  const totalSweep = baselineProjections.reduce((sum, p) => sum + p.sweepAmount, 0);
  const averageMonthlyRepayment = baselineProjections.length > 0
    ? totalSweep / baselineProjections.length
    : 0;

  return {
    facility,
    monthlyProjections: baselineProjections,
    estimatedPayoffDate: basePayoff?.period ?? null,
    estimatedMonthsRemaining: baselineMonths,
    totalInterestCost,
    effectiveAPR,
    averageMonthlyRepayment,
    scenarios: {
      pessimistic: {
        payoffDate: pessPayoff?.period ?? null,
        months: pessimisticMonths,
      },
      baseline: {
        payoffDate: basePayoff?.period ?? null,
        months: baselineMonths,
      },
      optimistic: {
        payoffDate: optPayoff?.period ?? null,
        months: optimisticMonths,
      },
    },
  };
}

/**
 * Generate MCA projections for multiple facilities.
 *
 * Convenience wrapper that runs projectMCAFacility for each facility
 * and returns all results.
 */
export function projectAllMCAFacilities(
  facilities: MCAFacility[],
  input: CashflowProjectionInput,
): MCAProjectionResult[] {
  return facilities.map((f) => projectMCAFacility(f, input));
}

/**
 * Convert a DebtFacility database row into an MCAFacility input.
 *
 * This bridges the database schema (snake_case) to the projection engine
 * interface (camelCase). Fixed fee handling:
 * - If fixed_fee is stored as a decimal ratio (e.g. 0.12), compute absolute fee
 * - If fixed_fee is stored as an absolute amount (> 1), use directly
 */
export function debtFacilityToMCA(facility: {
  id: string;
  facility_name: string;
  lender: string;
  original_amount: number;
  current_balance: number;
  fixed_fee: number;
  sweep_percentage: number | null;
  sweep_source: string | null;
  start_date: string | null;
}): MCAFacility {
  const originalAmount = Number(facility.original_amount) || 0;
  const rawFee = Number(facility.fixed_fee) || 0;

  // If fixed_fee is a ratio (< 1), compute the absolute fee amount
  // e.g. 0.12 on a 180000 advance = 21600 fixed fee
  const fixedFee = rawFee > 0 && rawFee < 1
    ? originalAmount * rawFee
    : rawFee;

  // Sweep percentage stored as whole number (17) in DB, convert to decimal (0.17)
  const rawSweep = Number(facility.sweep_percentage) || 0;
  const sweepPercentage = rawSweep > 1 ? rawSweep / 100 : rawSweep;

  return {
    id: facility.id,
    facilityName: facility.facility_name,
    lender: facility.lender,
    originalAmount,
    fixedFee,
    totalToRepay: originalAmount + fixedFee,
    currentBalance: Number(facility.current_balance) || 0,
    sweepPercentage,
    sweepSource: facility.sweep_source ?? 'both',
    startDate: facility.start_date ?? '',
  };
}
