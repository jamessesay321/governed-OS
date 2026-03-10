import { roundCurrency } from '@/lib/financial/normalise';
import type { ResolvedAssumptions } from './assumptions';

// === Input Types ===

export type ActualsInput = {
  period: string;
  revenue: number;
  cost_of_sales: number;
  operating_expenses: number;
  cash_balance: number;
};

export type RevenueProjectionInput = {
  baseRevenue: number;
  growthRate: number;
  seasonalityFactor: number;
};

export type CostProjectionInput = {
  baseCosts: number;
  fixedCosts: number;
  variableCostRate: number;
  projectedRevenue: number;
};

export type CashFlowInput = {
  revenue: number;
  costOfSales: number;
  operatingExpenses: number;
  openingCash: number;
  receivablesDays: number;
  payablesDays: number;
  capitalExpenditure: number;
};

// === Output Types ===

export type PeriodProjection = {
  period: string;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  closingCash: number;
  burnRate: number;
  runwayMonths: number;
  isBreakEven: boolean;
};

export type BreakEvenResult = {
  revenueRequired: number;
  monthsToBreakEven: number | null;
  breakEvenPeriod: string | null;
};

// === Pure Functions ===

/** Project revenue for a single future period. */
export function projectRevenue(input: RevenueProjectionInput): number {
  return roundCurrency(
    input.baseRevenue * (1 + input.growthRate) * input.seasonalityFactor
  );
}

/** Project costs for a single future period. */
export function projectCosts(input: CostProjectionInput): number {
  const variableCosts = input.projectedRevenue * input.variableCostRate;
  return roundCurrency(input.fixedCosts + variableCosts);
}

/** Calculate gross margin: (revenue - costOfSales) / revenue. */
export function calcGrossMargin(
  revenue: number,
  costOfSales: number
): number {
  if (revenue === 0) return 0;
  return roundCurrency((revenue - costOfSales) / revenue * 10000) / 10000;
}

/** Calculate contribution margin: (revenue - variableCosts) / revenue. */
export function calcContributionMargin(
  revenue: number,
  variableCosts: number
): number {
  if (revenue === 0) return 0;
  return roundCurrency((revenue - variableCosts) / revenue * 10000) / 10000;
}

/** Project cash flow for a single period. */
export function projectCashFlow(input: CashFlowInput): {
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  closingCash: number;
} {
  // Adjust for receivables/payables timing
  const collectionRate = Math.max(0, Math.min(1, 1 - input.receivablesDays / 90));
  const paymentRate = Math.max(0, Math.min(1, 1 - input.payablesDays / 90));

  const cashIn = roundCurrency(input.revenue * collectionRate);
  const cashOut = roundCurrency(
    (input.costOfSales + input.operatingExpenses) * paymentRate +
    input.capitalExpenditure
  );
  const netCashFlow = roundCurrency(cashIn - cashOut);
  const closingCash = roundCurrency(input.openingCash + netCashFlow);

  return { cashIn, cashOut, netCashFlow, closingCash };
}

/** Calculate burn rate from net cash flow (positive when burning). */
export function calcBurnRate(netCashFlow: number): number {
  if (netCashFlow >= 0) return 0;
  return roundCurrency(Math.abs(netCashFlow));
}

/** Calculate runway in months from closing cash and burn rate. */
export function calcRunway(closingCash: number, burnRate: number): number {
  if (burnRate <= 0) return 0;
  if (closingCash <= 0) return 0;
  return roundCurrency(closingCash / burnRate);
}

/** Determine break-even point from projection array. */
export function calcBreakEven(projections: PeriodProjection[]): BreakEvenResult {
  let monthsToBreakEven: number | null = null;
  let breakEvenPeriod: string | null = null;

  for (let i = 0; i < projections.length; i++) {
    if (projections[i].netProfit >= 0) {
      monthsToBreakEven = i;
      breakEvenPeriod = projections[i].period;
      break;
    }
  }

  // Estimate revenue required for break-even from last projection
  const last = projections[projections.length - 1];
  let revenueRequired = 0;
  if (last) {
    const totalCosts = last.costOfSales + last.operatingExpenses;
    revenueRequired = roundCurrency(totalCosts);
  }

  return { revenueRequired, monthsToBreakEven, breakEvenPeriod };
}

/**
 * MASTER FUNCTION: Generate full projection for all periods.
 * Takes actuals array, resolved assumptions, and timeline periods.
 * Returns PeriodProjection[] — one per period.
 */
export function generateFullProjection(
  actuals: ActualsInput[],
  assumptions: ResolvedAssumptions,
  periods: string[]
): PeriodProjection[] {
  const actualsMap = new Map<string, ActualsInput>();
  for (const a of actuals) {
    actualsMap.set(a.period, a);
  }

  // Read assumptions with defaults
  const growthRate = assumptions.get('revenue_growth_rate') ?? 0;
  const seasonalityFactor = assumptions.get('seasonality_factor') ?? 1;
  const variableCostRate = assumptions.get('variable_cost_rate') ?? 0.35;
  const fixedCosts = assumptions.get('fixed_costs') ?? 0;
  const receivablesDays = assumptions.get('receivables_days') ?? 30;
  const payablesDays = assumptions.get('payables_days') ?? 30;
  const capitalExpenditure = assumptions.get('capital_expenditure') ?? 0;

  const projections: PeriodProjection[] = [];
  let prevCash = actuals.length > 0 ? actuals[actuals.length - 1].cash_balance : 0;

  for (const period of periods) {
    const actual = actualsMap.get(period);

    let revenue: number;
    let costOfSales: number;
    let operatingExpenses: number;

    if (actual) {
      // Use actuals for historical periods
      revenue = actual.revenue;
      costOfSales = actual.cost_of_sales;
      operatingExpenses = actual.operating_expenses;
      prevCash = actual.cash_balance;
    } else {
      // Project forward
      const baseRevenue = projections.length > 0
        ? projections[projections.length - 1].revenue
        : (actuals.length > 0 ? actuals[actuals.length - 1].revenue : 0);

      revenue = projectRevenue({ baseRevenue, growthRate, seasonalityFactor });

      const baseCosts = projections.length > 0
        ? projections[projections.length - 1].costOfSales
        : (actuals.length > 0 ? actuals[actuals.length - 1].cost_of_sales : 0);

      costOfSales = projectCosts({
        baseCosts,
        fixedCosts: 0,
        variableCostRate,
        projectedRevenue: revenue,
      });

      operatingExpenses = fixedCosts || (projections.length > 0
        ? projections[projections.length - 1].operatingExpenses
        : (actuals.length > 0 ? actuals[actuals.length - 1].operating_expenses : 0));
    }

    const grossProfit = roundCurrency(revenue - costOfSales);
    const grossMarginPct = calcGrossMargin(revenue, costOfSales);
    const netProfit = roundCurrency(grossProfit - operatingExpenses);
    const netMarginPct = revenue === 0 ? 0 : roundCurrency(netProfit / revenue * 10000) / 10000;

    const cashFlow = projectCashFlow({
      revenue,
      costOfSales,
      operatingExpenses,
      openingCash: prevCash,
      receivablesDays,
      payablesDays,
      capitalExpenditure,
    });

    const burnRate = calcBurnRate(cashFlow.netCashFlow);
    const runwayMonths = calcRunway(cashFlow.closingCash, burnRate);

    projections.push({
      period,
      revenue,
      costOfSales,
      grossProfit,
      grossMarginPct,
      operatingExpenses,
      netProfit,
      netMarginPct,
      cashIn: cashFlow.cashIn,
      cashOut: cashFlow.cashOut,
      netCashFlow: cashFlow.netCashFlow,
      closingCash: cashFlow.closingCash,
      burnRate,
      runwayMonths,
      isBreakEven: netProfit >= 0,
    });

    prevCash = cashFlow.closingCash;
  }

  return projections;
}
