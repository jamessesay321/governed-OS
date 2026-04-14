/**
 * Refinance Scenario Calculator — Deterministic Computation Layer
 * ---------------------------------------------------------------
 * Pure functions for modelling debt refinancing scenarios.
 * Given current facilities + proposed actions, computes monthly/annual
 * savings, new repayment schedule, breakeven period, and debt trajectory.
 *
 * DETERMINISTIC — no AI, no side effects, no database calls.
 *
 * Domain context (Alonuko):
 * - ~£870K total debt across 13+ facilities
 * - MCAs at effective 40-60% APR via daily sweeps
 * - YouLend/Elect at 17% revenue sweep
 * - Creative UK £500K term loan being sought to consolidate
 * - Director loans credit-impacting via personal credit cards
 */

import type { RefinanceAction } from '@/types/debt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FacilitySnapshot {
  id: string;
  facility_name: string;
  lender: string;
  category: string;
  classification: string;
  current_balance: number;
  monthly_repayment: number;
  interest_rate: number;       // Annual rate as decimal (0.17 = 17%)
  effective_apr: number | null;
  remaining_months: number | null; // null if unknown
  facility_type: string;
  refinance_eligible: boolean;
}

export interface NewFundingSource {
  name: string;
  amount: number;
  annual_rate: number;          // Decimal (0.08 = 8%)
  term_months: number;
  setup_fee: number;            // One-off arrangement fee
  monthly_repayment?: number;   // Override if known; otherwise computed
}

export interface RefinanceScenarioInput {
  facilities: FacilitySnapshot[];
  actions: RefinanceAction[];
  funding_source: NewFundingSource | null; // New loan to fund the payoffs
}

export interface FacilityOutcome {
  facility_id: string;
  facility_name: string;
  action: RefinanceAction['action'];
  current_balance: number;
  current_monthly: number;
  current_annual_cost: number;  // monthly * 12
  new_balance: number;
  new_monthly: number;
  new_annual_cost: number;
  monthly_saving: number;
  annual_saving: number;
  justification: string;
}

export interface RefinanceScenarioResult {
  // Per-facility outcomes
  outcomes: FacilityOutcome[];

  // Funding source
  funding_source: NewFundingSource | null;
  funding_monthly_repayment: number;

  // Aggregates — current state
  total_current_debt: number;
  total_current_monthly: number;
  total_current_annual: number;

  // Aggregates — post-refinance
  total_post_debt: number;
  total_post_monthly: number;
  total_post_annual: number;

  // Savings
  monthly_saving: number;
  annual_saving: number;
  pct_monthly_saving: number; // as decimal

  // Debt freed
  total_cleared: number;
  facilities_cleared: number;

  // Breakeven (months until setup costs are recovered by savings)
  breakeven_months: number | null;

  // 12-month projection
  monthly_projection: MonthlyDebtProjection[];
}

export interface MonthlyDebtProjection {
  month: number; // 1-based
  label: string; // "Month 1", "Month 2", etc.
  current_total: number;   // What you'd owe without refinancing
  refinanced_total: number; // What you'd owe with refinancing
  cumulative_saving: number;
}

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Standard loan monthly repayment (PMT formula).
 * P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param principal  Loan amount
 * @param annualRate Annual interest rate as decimal (0.08 = 8%)
 * @param termMonths Number of months
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return round2(principal / termMonths); // Interest-free

  const r = annualRate / 12;
  const n = termMonths;
  const pmt = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return round2(pmt);
}

/**
 * Total interest paid over the life of a loan.
 */
export function totalInterestPaid(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthly = calculateMonthlyPayment(principal, annualRate, termMonths);
  return round2(monthly * termMonths - principal);
}

/**
 * Remaining balance after N months of a fixed-rate loan.
 */
export function remainingBalance(
  principal: number,
  annualRate: number,
  termMonths: number,
  monthsElapsed: number
): number {
  if (annualRate <= 0) {
    const paid = (principal / termMonths) * monthsElapsed;
    return round2(Math.max(0, principal - paid));
  }

  const r = annualRate / 12;
  const pmt = calculateMonthlyPayment(principal, annualRate, termMonths);

  // B_n = P(1+r)^n - PMT * [(1+r)^n - 1] / r
  const compounded = principal * Math.pow(1 + r, monthsElapsed);
  const paidPart = pmt * (Math.pow(1 + r, monthsElapsed) - 1) / r;
  return round2(Math.max(0, compounded - paidPart));
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

/**
 * Compute full refinance scenario results.
 *
 * DETERMINISTIC — pure function, no side effects.
 */
export function computeRefinanceScenario(
  input: RefinanceScenarioInput
): RefinanceScenarioResult {
  const { facilities, actions, funding_source } = input;

  // Map actions by facility ID for lookup
  const actionMap = new Map<string, RefinanceAction>();
  for (const a of actions) {
    actionMap.set(a.facility_id, a);
  }

  // Compute per-facility outcomes
  const outcomes: FacilityOutcome[] = [];
  let totalCleared = 0;
  let facilitiesCleared = 0;

  for (const facility of facilities) {
    const action = actionMap.get(facility.id);
    const actionType = action?.action ?? 'keep';

    const currentBalance = facility.current_balance;
    const currentMonthly = facility.monthly_repayment;
    const currentAnnual = round2(currentMonthly * 12);

    let newBalance = currentBalance;
    let newMonthly = currentMonthly;

    switch (actionType) {
      case 'pay_off':
        newBalance = 0;
        newMonthly = 0;
        totalCleared += currentBalance;
        facilitiesCleared++;
        break;

      case 'refinance':
        // Refinance into new terms
        if (action?.new_amount != null) newBalance = action.new_amount;
        if (action?.new_rate != null && action?.new_term_months != null) {
          newMonthly = action.new_monthly ??
            calculateMonthlyPayment(newBalance, action.new_rate, action.new_term_months);
        } else if (action?.new_monthly != null) {
          newMonthly = action.new_monthly;
        }
        break;

      case 'consolidate':
        // Consolidated into the new funding source — treated like pay_off for this facility
        newBalance = 0;
        newMonthly = 0;
        totalCleared += currentBalance;
        facilitiesCleared++;
        break;

      case 'keep':
      default:
        // No change
        break;
    }

    const newAnnual = round2(newMonthly * 12);

    outcomes.push({
      facility_id: facility.id,
      facility_name: facility.facility_name,
      action: actionType,
      current_balance: currentBalance,
      current_monthly: currentMonthly,
      current_annual_cost: currentAnnual,
      new_balance: newBalance,
      new_monthly: newMonthly,
      new_annual_cost: newAnnual,
      monthly_saving: round2(currentMonthly - newMonthly),
      annual_saving: round2(currentAnnual - newAnnual),
      justification: action?.justification ?? '',
    });
  }

  // Funding source repayment
  let fundingMonthly = 0;
  if (funding_source) {
    fundingMonthly = funding_source.monthly_repayment ??
      calculateMonthlyPayment(
        funding_source.amount,
        funding_source.annual_rate,
        funding_source.term_months
      );
  }

  // Aggregate current state
  const totalCurrentDebt = round2(facilities.reduce((s, f) => s + f.current_balance, 0));
  const totalCurrentMonthly = round2(facilities.reduce((s, f) => s + f.monthly_repayment, 0));
  const totalCurrentAnnual = round2(totalCurrentMonthly * 12);

  // Aggregate post-refinance
  const totalPostFacilities = round2(outcomes.reduce((s, o) => s + o.new_balance, 0));
  const totalPostDebt = round2(totalPostFacilities + (funding_source?.amount ?? 0));
  const totalPostMonthly = round2(
    outcomes.reduce((s, o) => s + o.new_monthly, 0) + fundingMonthly
  );
  const totalPostAnnual = round2(totalPostMonthly * 12);

  // Savings
  const monthlySaving = round2(totalCurrentMonthly - totalPostMonthly);
  const annualSaving = round2(totalCurrentAnnual - totalPostAnnual);
  const pctMonthlySaving = totalCurrentMonthly > 0
    ? round4(monthlySaving / totalCurrentMonthly)
    : 0;

  // Breakeven
  const setupCosts = funding_source?.setup_fee ?? 0;
  const breakevenMonths = monthlySaving > 0 && setupCosts > 0
    ? Math.ceil(setupCosts / monthlySaving)
    : monthlySaving > 0 ? 0 : null;

  // 12-month projection
  const monthlyProjection: MonthlyDebtProjection[] = [];
  let currentRunning = totalCurrentDebt;
  let refinancedRunning = totalPostDebt;
  let cumSaving = 0;

  for (let m = 1; m <= 12; m++) {
    // Current trajectory: reduce by monthly repayments
    currentRunning = round2(Math.max(0, currentRunning - totalCurrentMonthly));

    // Refinanced trajectory: reduce by new monthly repayments
    refinancedRunning = round2(Math.max(0, refinancedRunning - totalPostMonthly));

    cumSaving = round2(cumSaving + monthlySaving);

    monthlyProjection.push({
      month: m,
      label: `Month ${m}`,
      current_total: currentRunning,
      refinanced_total: refinancedRunning,
      cumulative_saving: cumSaving,
    });
  }

  return {
    outcomes,
    funding_source: funding_source ?? null,
    funding_monthly_repayment: fundingMonthly,
    total_current_debt: totalCurrentDebt,
    total_current_monthly: totalCurrentMonthly,
    total_current_annual: totalCurrentAnnual,
    total_post_debt: totalPostDebt,
    total_post_monthly: totalPostMonthly,
    total_post_annual: totalPostAnnual,
    monthly_saving: monthlySaving,
    annual_saving: annualSaving,
    pct_monthly_saving: pctMonthlySaving,
    total_cleared: totalCleared,
    facilities_cleared: facilitiesCleared,
    breakeven_months: breakevenMonths,
    monthly_projection: monthlyProjection,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}
