/**
 * Cash Flow Root Cause Analysis & Debt Service Metrics
 * --------------------------------------------------
 * Determines WHY a business is cash-flow positive or negative, and
 * calculates debt service coverage ratios for businesses with debt.
 *
 * Skill references:
 *  - debt-service-reality.md: Full debt service burden, not just interest
 *  - cash-flow-intelligence.md: Root cause labelling
 *  - client-context-derivation.md: Derives these for any new client
 */

import type { FinanceCostsResult } from './finance-costs';

// ─── Types ──────────────────────────────────────────────────

export type CashFlowRootCause =
  | 'profitable_no_debt'      // Operating profitably, no debt — healthy
  | 'profitable_debt_covered'  // Operating profit covers debt service — sustainable
  | 'profitable_debt_strain'   // Operationally profitable but debt service creates shortfall
  | 'operational_loss'         // Losing money from operations (before debt)
  | 'breakeven'               // Close to breakeven operations
  | 'growth_investment'        // Negative because of growth spending (high capex/marketing)
  | 'insufficient_data';       // Not enough data to determine

export type DSCRStatus = 'healthy' | 'adequate' | 'tight' | 'critical' | 'negative' | 'no_debt';

export interface DebtServiceMetrics {
  /** Monthly operating profit (before debt service) */
  monthlyOperatingProfit: number;
  /** Total monthly debt service (interest + principal) */
  totalMonthlyDebtService: number;
  /** Monthly interest-only component */
  monthlyInterest: number;
  /** Monthly principal repayment component */
  monthlyPrincipal: number;
  /** Debt Service Coverage Ratio: operating profit / total debt service */
  dscr: number;
  /** DSCR health status */
  dscrStatus: DSCRStatus;
  /** Interest cover ratio: operating profit / interest only */
  interestCoverRatio: number;
  /** Annual debt service / annual revenue */
  debtToRevenuePercent: number;
  /** Total outstanding across all facilities */
  totalOutstanding: number;
  /** Nearest maturity date across active facilities */
  nearestMaturity: string | null;
  /** Free cash after debt service = operating profit - total debt service */
  freeCashAfterDebt: number;
  /** Whether the business has any active debt */
  hasDebt: boolean;
}

export interface CashFlowDiagnosis {
  rootCause: CashFlowRootCause;
  /** Human-readable label for the dashboard */
  label: string;
  /** Detailed explanation */
  explanation: string;
  /** Severity: how urgently does this need attention? */
  severity: 'healthy' | 'watch' | 'concern' | 'critical';
  /** Debt metrics (if business has debt) */
  debtMetrics: DebtServiceMetrics | null;
}

// ─── DSCR Calculation ───────────────────────────────────────

function computeDSCRStatus(dscr: number, operatingProfit: number): DSCRStatus {
  if (operatingProfit < 0) return 'negative';
  if (dscr >= 2.0) return 'healthy';
  if (dscr >= 1.5) return 'adequate';
  if (dscr >= 1.0) return 'tight';
  return 'critical';
}

/**
 * Compute full debt service metrics from finance costs and P&L data.
 */
export function computeDebtServiceMetrics(
  monthlyOperatingProfit: number,
  monthlyRevenue: number,
  financeCosts: FinanceCostsResult
): DebtServiceMetrics {
  if (!financeCosts.hasDebt) {
    return {
      monthlyOperatingProfit,
      totalMonthlyDebtService: 0,
      monthlyInterest: 0,
      monthlyPrincipal: 0,
      dscr: 0,
      dscrStatus: 'no_debt',
      interestCoverRatio: 0,
      debtToRevenuePercent: 0,
      totalOutstanding: 0,
      nearestMaturity: null,
      freeCashAfterDebt: monthlyOperatingProfit,
      hasDebt: false,
    };
  }

  const monthlyInterest = financeCosts.totalMonthlyInterest;

  // Total monthly repayment from facilities (includes interest + principal)
  const totalMonthlyRepayment = financeCosts.facilities.reduce(
    (sum, f) => sum + (f.monthly_repayment ?? 0),
    0
  );

  // If monthly_repayment is available, use it as total debt service
  // Otherwise fall back to interest-only
  const totalMonthlyDebtService = totalMonthlyRepayment > 0
    ? totalMonthlyRepayment
    : monthlyInterest;

  const monthlyPrincipal = Math.max(0, totalMonthlyDebtService - monthlyInterest);

  // DSCR = Operating Profit / Total Debt Service
  const dscr = totalMonthlyDebtService > 0
    ? monthlyOperatingProfit / totalMonthlyDebtService
    : 0;

  // Interest cover ratio
  const interestCoverRatio = monthlyInterest > 0
    ? monthlyOperatingProfit / monthlyInterest
    : 0;

  // Debt-to-revenue ratio (annual)
  const annualDebtService = totalMonthlyDebtService * 12;
  const annualRevenue = monthlyRevenue * 12;
  const debtToRevenuePercent = annualRevenue > 0
    ? (annualDebtService / annualRevenue) * 100
    : 0;

  // Total outstanding balance
  const totalOutstanding = financeCosts.facilities.reduce(
    (sum, f) => sum + (f.outstanding_balance ?? 0),
    0
  );

  // Free cash after debt
  const freeCashAfterDebt = monthlyOperatingProfit - totalMonthlyDebtService;

  return {
    monthlyOperatingProfit,
    totalMonthlyDebtService,
    monthlyInterest,
    monthlyPrincipal,
    dscr: Math.round(dscr * 100) / 100,
    dscrStatus: computeDSCRStatus(dscr, monthlyOperatingProfit),
    interestCoverRatio: Math.round(interestCoverRatio * 100) / 100,
    debtToRevenuePercent: Math.round(debtToRevenuePercent * 10) / 10,
    totalOutstanding,
    nearestMaturity: null, // Would need maturity_date from extended query
    freeCashAfterDebt,
    hasDebt: true,
  };
}

// ─── Root Cause Analysis ────────────────────────────────────

/**
 * Diagnose the root cause of a business's cash flow position.
 * This is the key intelligence function that turns numbers into understanding.
 */
export function diagnoseCashFlow(
  monthlyRevenue: number,
  monthlyOperatingProfit: number,
  financeCosts: FinanceCostsResult,
  monthlyExpenses?: number
): CashFlowDiagnosis {
  const debtMetrics = financeCosts.hasDebt
    ? computeDebtServiceMetrics(monthlyOperatingProfit, monthlyRevenue, financeCosts)
    : null;

  // Insufficient data check
  if (monthlyRevenue === 0 && monthlyOperatingProfit === 0) {
    return {
      rootCause: 'insufficient_data',
      label: 'Insufficient data',
      explanation: 'Not enough financial data to determine cash flow position. Complete a Xero sync to populate.',
      severity: 'watch',
      debtMetrics: null,
    };
  }

  // Operating margin
  const operatingMargin = monthlyRevenue > 0
    ? (monthlyOperatingProfit / monthlyRevenue) * 100
    : 0;

  // Case 1: No debt
  if (!financeCosts.hasDebt) {
    if (monthlyOperatingProfit > 0) {
      return {
        rootCause: 'profitable_no_debt',
        label: 'Profitable, debt-free',
        explanation: `Operating profit of £${Math.round(monthlyOperatingProfit).toLocaleString()}/month with no debt obligations. Operating margin: ${operatingMargin.toFixed(1)}%.`,
        severity: 'healthy',
        debtMetrics: null,
      };
    }
    if (Math.abs(operatingMargin) < 3) {
      return {
        rootCause: 'breakeven',
        label: 'Near breakeven',
        explanation: `Operating close to breakeven with ${operatingMargin.toFixed(1)}% margin. No debt obligations.`,
        severity: 'watch',
        debtMetrics: null,
      };
    }
    return {
      rootCause: 'operational_loss',
      label: 'Operating loss',
      explanation: `Losing £${Math.round(Math.abs(monthlyOperatingProfit)).toLocaleString()}/month from operations. Operating margin: ${operatingMargin.toFixed(1)}%.`,
      severity: operatingMargin < -20 ? 'critical' : 'concern',
      debtMetrics: null,
    };
  }

  // Case 2: Has debt
  const dm = debtMetrics!;

  // Operationally profitable and debt covered
  if (monthlyOperatingProfit > 0 && dm.freeCashAfterDebt >= 0) {
    return {
      rootCause: 'profitable_debt_covered',
      label: 'Profitable, debt serviced',
      explanation: `Operating profit of £${Math.round(monthlyOperatingProfit).toLocaleString()}/month covers debt service of £${Math.round(dm.totalMonthlyDebtService).toLocaleString()}/month. DSCR: ${dm.dscr}x. Free cash: £${Math.round(dm.freeCashAfterDebt).toLocaleString()}/month.`,
      severity: dm.dscrStatus === 'healthy' ? 'healthy' : 'watch',
      debtMetrics: dm,
    };
  }

  // Operationally profitable but debt creates shortfall
  if (monthlyOperatingProfit > 0 && dm.freeCashAfterDebt < 0) {
    return {
      rootCause: 'profitable_debt_strain',
      label: `Operationally profitable, debt creates £${Math.round(Math.abs(dm.freeCashAfterDebt)).toLocaleString()}/mo shortfall`,
      explanation: `Operating profit of £${Math.round(monthlyOperatingProfit).toLocaleString()}/month is insufficient to cover debt service of £${Math.round(dm.totalMonthlyDebtService).toLocaleString()}/month. DSCR: ${dm.dscr}x. Monthly shortfall: £${Math.round(Math.abs(dm.freeCashAfterDebt)).toLocaleString()}. Debt service is ${dm.debtToRevenuePercent.toFixed(1)}% of revenue.`,
      severity: dm.dscrStatus === 'critical' ? 'critical' : 'concern',
      debtMetrics: dm,
    };
  }

  // Near breakeven with debt
  if (Math.abs(operatingMargin) < 3) {
    return {
      rootCause: 'breakeven',
      label: `Near breakeven, £${Math.round(dm.totalMonthlyDebtService).toLocaleString()}/mo debt service`,
      explanation: `Operating close to breakeven with ${operatingMargin.toFixed(1)}% margin, plus £${Math.round(dm.totalMonthlyDebtService).toLocaleString()}/month in debt service. Total monthly cash shortfall: £${Math.round(Math.abs(dm.freeCashAfterDebt)).toLocaleString()}.`,
      severity: 'concern',
      debtMetrics: dm,
    };
  }

  // Operating at a loss with debt
  return {
    rootCause: 'operational_loss',
    label: `Operating loss of £${Math.round(Math.abs(monthlyOperatingProfit)).toLocaleString()}/mo plus £${Math.round(dm.totalMonthlyDebtService).toLocaleString()}/mo debt`,
    explanation: `Losing £${Math.round(Math.abs(monthlyOperatingProfit)).toLocaleString()}/month from operations before £${Math.round(dm.totalMonthlyDebtService).toLocaleString()}/month in debt service. Total monthly cash drain: £${Math.round(Math.abs(dm.freeCashAfterDebt)).toLocaleString()}. This is unsustainable without revenue growth or debt restructuring.`,
    severity: 'critical',
    debtMetrics: dm,
  };
}

// ─── Dashboard Labels ───────────────────────────────────────

/**
 * Get a concise cash position label for the dashboard.
 * Shows operating profit status + debt impact in one line.
 */
export function getCashPositionLabel(diagnosis: CashFlowDiagnosis): {
  text: string;
  color: 'green' | 'amber' | 'red';
} {
  switch (diagnosis.severity) {
    case 'healthy':
      return { text: diagnosis.label, color: 'green' };
    case 'watch':
      return { text: diagnosis.label, color: 'amber' };
    case 'concern':
      return { text: diagnosis.label, color: 'amber' };
    case 'critical':
      return { text: diagnosis.label, color: 'red' };
    default:
      return { text: diagnosis.label, color: 'amber' };
  }
}

/**
 * Get DSCR display info for health/KPI pages.
 */
export function getDSCRDisplay(dscrStatus: DSCRStatus, dscr: number): {
  label: string;
  description: string;
  color: 'green' | 'amber' | 'red';
} {
  switch (dscrStatus) {
    case 'no_debt':
      return { label: 'No Debt', description: 'No active debt facilities.', color: 'green' };
    case 'healthy':
      return { label: `${dscr}x`, description: 'Healthy — comfortable debt servicing with headroom.', color: 'green' };
    case 'adequate':
      return { label: `${dscr}x`, description: 'Adequate — debt serviced but limited headroom.', color: 'amber' };
    case 'tight':
      return { label: `${dscr}x`, description: 'Tight — vulnerable to any revenue dip.', color: 'amber' };
    case 'critical':
      return { label: `${dscr}x`, description: 'Critical — cannot service debt from operations.', color: 'red' };
    case 'negative':
      return { label: `${dscr}x`, description: 'Operating at a loss with debt obligations.', color: 'red' };
    default:
      return { label: `${dscr}x`, description: '', color: 'amber' };
  }
}

/**
 * Get debt-to-revenue ratio display.
 */
export function getDebtToRevenueDisplay(percent: number): {
  label: string;
  status: 'manageable' | 'elevated' | 'critical' | 'unsustainable';
  color: 'green' | 'amber' | 'red';
} {
  if (percent < 15) return { label: `${percent.toFixed(1)}%`, status: 'manageable', color: 'green' };
  if (percent < 30) return { label: `${percent.toFixed(1)}%`, status: 'elevated', color: 'amber' };
  if (percent < 50) return { label: `${percent.toFixed(1)}%`, status: 'critical', color: 'red' };
  return { label: `${percent.toFixed(1)}%`, status: 'unsustainable', color: 'red' };
}
