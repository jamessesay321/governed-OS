/**
 * Normalised EBITDA & Breakeven Analysis
 *
 * Computes standard EBITDA (same logic as valuation page), then normalises
 * the interest cost using a benchmark rate to show how much a business
 * overpays on debt vs a market-rate facility.
 *
 * All financial math is deterministic — pure TypeScript functions.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface NormalisedEBITDAResult {
  // Standard metrics
  revenue: number;
  directCosts: number;
  overheads: number;
  depreciationAddback: number;
  interestAddback: number; // actual interest being added back
  ebitda: number;
  ebitdaMargin: number;

  // Interest normalisation
  actualInterestExpense: number;
  actualWeightedRate: number;
  benchmarkRate: number;
  normalisedInterestExpense: number;
  interestDelta: number; // how much overpaying (annual)
  totalDebtBalance: number;

  // Normalised profit
  normalisedNetProfit: number;
  actualNetProfit: number;
  normalisedNetMargin: number;

  // Breakeven
  monthlyFixedCosts: number;
  monthlyVariableCostRatio: number;
  breakEvenRevenue: number;
  currentMonthlyRevenue: number;
  monthsToBreakEven: number | null;
  revenueGapToBreakEven: number;
}

export interface DebtFacility {
  current_balance: number;
  effective_apr: number;
  interest_rate: number;
  category: string;
  status: string;
}

export interface NormalisedEBITDAInput {
  /** Annual revenue (trailing 12 months) */
  revenue: number;
  /** Annual direct costs */
  directCosts: number;
  /** Annual overheads (includes depreciation + interest) */
  overheads: number;
  /** Depreciation / amortisation identified in overheads */
  depreciationAddback: number;
  /** Interest expense identified in overheads */
  interestAddback: number;
  /** Active lender debt facilities */
  debtFacilities: DebtFacility[];
  /** Benchmark interest rate for normalisation (default 0.08 = 8%) */
  benchmarkRate?: number;
  /** Monthly revenue for latest period (for breakeven) */
  currentMonthlyRevenue: number;
  /** Monthly revenue growth rate (for months-to-breakeven calc) */
  monthlyRevenueGrowthRate?: number;
  /** Average order value (for volume lever) */
  averageOrderValue?: number;
}

// ── Default benchmark rate ─────────────────────────────────────────────

/**
 * UK SME benchmark interest rate.
 * BoE base rate (~4.5%) + 3.5% margin for a fashion SME with £1-5m revenue.
 * Configurable per-call.
 */
export const UK_SME_BENCHMARK_RATE = 0.08;

// ── Core calculation ───────────────────────────────────────────────────

export function computeNormalisedEBITDA(
  input: NormalisedEBITDAInput,
): NormalisedEBITDAResult {
  const {
    revenue,
    directCosts,
    overheads,
    depreciationAddback,
    interestAddback,
    debtFacilities,
    benchmarkRate = UK_SME_BENCHMARK_RATE,
    currentMonthlyRevenue,
    monthlyRevenueGrowthRate = 0,
  } = input;

  // ── Standard EBITDA ──────────────────────────────────────────────
  const ebitda = revenue - directCosts - overheads + depreciationAddback + interestAddback;
  const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;

  // ── Weighted average interest rate from active lender facilities ──
  const activeLenderFacilities = debtFacilities.filter(
    (d) => d.category === 'lender' && d.status === 'active',
  );

  const totalDebtBalance = activeLenderFacilities.reduce(
    (sum, d) => sum + Math.abs(Number(d.current_balance)),
    0,
  );

  const weightedInterestSum = activeLenderFacilities.reduce(
    (sum, d) => sum + Math.abs(Number(d.current_balance)) * Number(d.effective_apr),
    0,
  );

  const actualWeightedRate =
    totalDebtBalance > 0 ? weightedInterestSum / totalDebtBalance : 0;

  // ── Normalised interest ──────────────────────────────────────────
  // Annual normalised interest = total_debt_balance * benchmark_rate
  const normalisedInterestAnnual = totalDebtBalance * benchmarkRate;
  // Monthly normalised interest
  const normalisedInterestMonthly = normalisedInterestAnnual / 12;

  // Actual interest expense (from P&L)
  const actualInterestExpense = interestAddback;

  // Delta: how much overpaying annually
  const interestDelta = actualInterestExpense - normalisedInterestAnnual;

  // ── Normalised Net Profit ────────────────────────────────────────
  // Actual Net Profit = Revenue - Direct Costs - Overheads (overheads already includes interest)
  const actualNetProfit = revenue - directCosts - overheads;

  // Normalised Net Profit = Actual Net Profit + actual interest addback - normalised interest
  const normalisedNetProfit =
    actualNetProfit + actualInterestExpense - normalisedInterestAnnual;

  const normalisedNetMargin = revenue > 0 ? (normalisedNetProfit / revenue) * 100 : 0;

  // ── Breakeven Analysis ───────────────────────────────────────────
  // Monthly fixed costs = (overheads - interest) / 12
  // We separate interest since it's being normalised
  const monthlyOverheadsExInterest = (overheads - interestAddback) / 12;
  const monthlyFixedCosts = monthlyOverheadsExInterest + normalisedInterestMonthly;

  // Variable cost ratio = direct costs / revenue
  const monthlyVariableCostRatio = revenue > 0 ? directCosts / revenue : 0;

  // Break-even monthly revenue = fixed costs / (1 - variable cost ratio)
  const contributionMarginRatio = 1 - monthlyVariableCostRatio;
  const breakEvenRevenue =
    contributionMarginRatio > 0 ? monthlyFixedCosts / contributionMarginRatio : 0;

  // Revenue gap
  const revenueGapToBreakEven = Math.max(0, breakEvenRevenue - currentMonthlyRevenue);

  // Months to breakeven
  let monthsToBreakEven: number | null = null;
  if (currentMonthlyRevenue >= breakEvenRevenue) {
    monthsToBreakEven = 0; // Already at/above breakeven
  } else if (monthlyRevenueGrowthRate > 0) {
    // months = ln(breakEvenRevenue / currentMonthlyRevenue) / ln(1 + growthRate)
    const ratio = breakEvenRevenue / currentMonthlyRevenue;
    monthsToBreakEven = Math.ceil(
      Math.log(ratio) / Math.log(1 + monthlyRevenueGrowthRate),
    );
    // Cap at 60 months (5 years) for reasonableness
    if (monthsToBreakEven > 60) monthsToBreakEven = null;
  }

  return {
    revenue,
    directCosts,
    overheads,
    depreciationAddback,
    interestAddback,
    ebitda,
    ebitdaMargin,

    actualInterestExpense,
    actualWeightedRate,
    benchmarkRate,
    normalisedInterestExpense: normalisedInterestAnnual,
    interestDelta,
    totalDebtBalance,

    normalisedNetProfit,
    actualNetProfit,
    normalisedNetMargin,

    monthlyFixedCosts,
    monthlyVariableCostRatio,
    breakEvenRevenue,
    currentMonthlyRevenue,
    monthsToBreakEven,
    revenueGapToBreakEven,
  };
}

// ── Action Levers ──────────────────────────────────────────────────────

export interface ActionLever {
  id: string;
  icon: string;
  title: string;
  description: string;
  impact: string;
  impactValue: number;
}

export function computeActionLevers(
  result: NormalisedEBITDAResult,
  averageOrderValue: number = 8957, // Alonuko default
): ActionLever[] {
  const levers: ActionLever[] = [];

  // 1. Revenue Growth — % increase needed to reach breakeven
  const revenueGrowthPct =
    result.currentMonthlyRevenue > 0
      ? ((result.breakEvenRevenue - result.currentMonthlyRevenue) /
          result.currentMonthlyRevenue) *
        100
      : 0;

  levers.push({
    id: 'revenue-growth',
    icon: 'TrendingUp',
    title: 'Revenue Growth',
    description: `Increase monthly revenue by ${Math.max(0, revenueGrowthPct).toFixed(1)}% (${formatGBP(result.revenueGapToBreakEven)}/month)`,
    impact: `Reach breakeven at ${formatGBP(result.breakEvenRevenue)}/month`,
    impactValue: result.revenueGapToBreakEven * 12,
  });

  // 2. Cost Reduction — target overheads reduction
  const costReductionNeeded = result.revenueGapToBreakEven * (1 - result.monthlyVariableCostRatio);
  levers.push({
    id: 'cost-reduction',
    icon: 'Scissors',
    title: 'Cost Reduction',
    description: `Reduce monthly overheads by ${formatGBP(costReductionNeeded)}`,
    impact: `Save ${formatGBP(costReductionNeeded * 12)}/year`,
    impactValue: costReductionNeeded * 12,
  });

  // 3. Debt Refinancing — savings from normalised rate
  const annualSavings = Math.max(0, result.interestDelta);
  levers.push({
    id: 'debt-refinancing',
    icon: 'Landmark',
    title: 'Debt Refinancing',
    description: `Refinancing at ${(result.benchmarkRate * 100).toFixed(1)}% vs current ${(result.actualWeightedRate * 100).toFixed(1)}% saves ${formatGBP(annualSavings)}/year`,
    impact: `On ${formatGBP(result.totalDebtBalance)} total debt`,
    impactValue: annualSavings,
  });

  // 4. Pricing — AOV increase needed
  const currentOrders =
    averageOrderValue > 0
      ? result.currentMonthlyRevenue / averageOrderValue
      : 0;
  const aovIncreaseNeeded =
    currentOrders > 0 ? result.revenueGapToBreakEven / currentOrders : 0;

  levers.push({
    id: 'pricing',
    icon: 'Banknote',
    title: 'Pricing Optimisation',
    description: `Increase average order value by ${formatGBP(aovIncreaseNeeded)} (currently ${formatGBP(averageOrderValue)})`,
    impact: `${currentOrders.toFixed(1)} orders/month at higher AOV`,
    impactValue: aovIncreaseNeeded * currentOrders * 12,
  });

  // 5. Volume — additional orders needed
  const additionalOrders =
    averageOrderValue > 0
      ? result.revenueGapToBreakEven / averageOrderValue
      : 0;

  levers.push({
    id: 'volume',
    icon: 'Package',
    title: 'Volume Target',
    description: `Win ${Math.ceil(additionalOrders)} additional orders per month at current AOV`,
    impact: `${formatGBP(additionalOrders * averageOrderValue)}/month additional revenue`,
    impactValue: additionalOrders * averageOrderValue * 12,
  });

  return levers;
}

// ── Sensitivity Matrix ─────────────────────────────────────────────────

export interface SensitivityScenario {
  revenueGrowthLabel: string;
  costReductionLabel: string;
  revenueGrowthPct: number;
  costReductionPct: number;
  monthsToBreakEven: number | null;
  breakEvenRevenue: number;
}

export function computeSensitivityMatrix(
  result: NormalisedEBITDAResult,
): SensitivityScenario[] {
  const revenueGrowthScenarios = [
    { label: '0%', pct: 0 },
    { label: '5%', pct: 0.05 },
    { label: '10%', pct: 0.10 },
    { label: '15%', pct: 0.15 },
    { label: '20%', pct: 0.20 },
  ];

  const costReductionScenarios = [
    { label: '0%', pct: 0 },
    { label: '5%', pct: 0.05 },
    { label: '10%', pct: 0.10 },
    { label: '15%', pct: 0.15 },
    { label: '20%', pct: 0.20 },
  ];

  const matrix: SensitivityScenario[] = [];

  for (const revScenario of revenueGrowthScenarios) {
    for (const costScenario of costReductionScenarios) {
      const adjustedFixedCosts =
        result.monthlyFixedCosts * (1 - costScenario.pct);
      const contributionMarginRatio = 1 - result.monthlyVariableCostRatio;
      const adjustedBreakEven =
        contributionMarginRatio > 0
          ? adjustedFixedCosts / contributionMarginRatio
          : 0;

      let months: number | null = null;
      if (result.currentMonthlyRevenue >= adjustedBreakEven) {
        months = 0;
      } else if (revScenario.pct > 0) {
        const monthlyGrowth = revScenario.pct / 12; // annualised to monthly
        const ratio = adjustedBreakEven / result.currentMonthlyRevenue;
        months = Math.ceil(Math.log(ratio) / Math.log(1 + monthlyGrowth));
        if (months > 60) months = null;
      }

      matrix.push({
        revenueGrowthLabel: revScenario.label,
        costReductionLabel: costScenario.label,
        revenueGrowthPct: revScenario.pct,
        costReductionPct: costScenario.pct,
        monthsToBreakEven: months,
        breakEvenRevenue: adjustedBreakEven,
      });
    }
  }

  return matrix;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatGBP(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `£${(amount / 1_000).toFixed(1)}k`;
  return `£${Math.round(amount)}`;
}
