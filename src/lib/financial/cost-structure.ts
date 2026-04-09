/**
 * Cost Structure Auto-Classification
 * --------------------------------------------------
 * Classifies each cost account as Fixed, Variable, or Semi-Variable
 * based on account name patterns and Xero account class.
 *
 * Used by:
 *  - Costs page: tag each category as Fixed/Variable/Discretionary
 *  - Breakeven page: fixed vs variable cost split
 *  - Forecast page: variable costs scale with revenue assumptions
 *  - Scenario engine: "cut costs by 10%" targets discretionary only
 *
 * Skill references:
 *  - cost-structure-analysis.md
 *  - client-context-derivation.md
 */

// ─── Types ──────────────────────────────────────────────────

export type CostNature = 'fixed' | 'variable' | 'semi_variable';

export interface ClassifiedCost {
  accountId: string;
  accountName: string;
  accountCode: string;
  xeroClass: string;
  costNature: CostNature;
  isDiscretionary: boolean;
  totalAmount: number;
}

export interface CostStructureSummary {
  /** Total fixed costs (don't change with revenue) */
  totalFixed: number;
  /** Total variable costs (change with revenue/volume) */
  totalVariable: number;
  /** Total semi-variable costs (step functions) */
  totalSemiVariable: number;
  /** Total all costs */
  totalCosts: number;
  /** Total discretionary costs (can be cut without structural change) */
  totalDiscretionary: number;
  /** Total non-discretionary costs (locked in - rent, salaries, debt) */
  totalNonDiscretionary: number;
  /** Fixed cost ratio (fixed / total revenue) */
  fixedCostRatio: number;
  /** Variable cost ratio (variable / total revenue) */
  variableCostRatio: number;
  /** Contribution margin: 1 - variable cost ratio */
  contributionMargin: number;
  /** Breakeven revenue: fixed costs / contribution margin */
  breakevenRevenue: number;
  /** Monthly breakeven revenue */
  monthlyBreakevenRevenue: number;
  /** Operating leverage: how much profits amplify with revenue changes */
  operatingLeverage: string;
  /** Individual account classifications */
  accounts: ClassifiedCost[];
}

// ─── Pattern Matching Rules ─────────────────────────────────

/** Fixed cost patterns — don't change with revenue */
const FIXED_PATTERNS: RegExp[] = [
  /^rent$/i,
  /premises/i,
  /lease/i,
  /insurance/i,
  /salary|salaries|wages/i,
  /director.*remuneration/i,
  /employer.*nic|employers.*nic/i,
  /employer.*pension|employers.*pension|^pensions$/i,
  /payroll/i,
  /accountancy|accounting/i,
  /legal/i,
  /software/i,
  /subscription/i,
  /internet|telephone|telecom/i,
  /rates$/i,
  /gas.*electric|light.*heat|utilities/i,
  /cleaning/i,
  /storage/i,
  /depreciation/i,
  /bank charge/i,
  /loan.*fee/i,
  /interest|bbl|overdraft/i,
  /vehicle lease/i,
  /smart pension/i,
  /recruitment/i,
];

/** Variable cost patterns — change with revenue/volume */
const VARIABLE_PATTERNS: RegExp[] = [
  /^fabric$/i,
  /material/i,
  /embroidery/i,
  /sewing/i,
  /purchases/i,
  /cost of sales|cos\s/i,
  /cogs/i,
  /shipping/i,
  /courier/i,
  /freelance|contractor/i,
  /commission/i,
  /merchant.*fee|stripe.*fee|paypal.*fee|square.*fee|shopify.*fee/i,
  /credit card charge/i,
  /payment.*fee/i,
  /packaging/i,
  /raw material/i,
  /stock/i,
  /direct cost/i,
];

/** Semi-variable patterns — step functions */
const SEMI_VARIABLE_PATTERNS: RegExp[] = [
  /staff.*(?:production|bridal|samples)/i,
  /intern/i,
  /marketing|advertising/i,
  /media.*manage/i,
  /photoshoot/i,
  /event/i,
  /trunk.*show/i,
  /consultancy|consulting/i,
  /agency/i,
  /travel/i,
];

/** Discretionary patterns — can be cut */
const DISCRETIONARY_PATTERNS: RegExp[] = [
  /marketing|advertising/i,
  /media.*manage/i,
  /photoshoot/i,
  /event/i,
  /trunk.*show/i,
  /travel|motor|subsistence/i,
  /entertainment|refreshment|food/i,
  /training/i,
  /subscription/i,
  /consulting|consultancy/i,
  /agency/i,
  /donation/i,
  /equipment/i,
  /website/i,
  /staff.*training/i,
];

// ─── Classification Logic ───────────────────────────────────

/**
 * Classify a single account's cost nature based on name patterns.
 */
export function classifyCostNature(accountName: string, xeroClass: string): CostNature {
  // Direct costs (DIRECTCOSTS class) are almost always variable
  if (xeroClass === 'DIRECTCOSTS') {
    // Check if it matches a fixed pattern (e.g., production staff salaries)
    for (const pattern of FIXED_PATTERNS) {
      if (pattern.test(accountName)) return 'semi_variable';
    }
    return 'variable';
  }

  // Check variable patterns first (more specific)
  for (const pattern of VARIABLE_PATTERNS) {
    if (pattern.test(accountName)) return 'variable';
  }

  // Check semi-variable
  for (const pattern of SEMI_VARIABLE_PATTERNS) {
    if (pattern.test(accountName)) return 'semi_variable';
  }

  // Check fixed
  for (const pattern of FIXED_PATTERNS) {
    if (pattern.test(accountName)) return 'fixed';
  }

  // Default: overheads are typically fixed, expenses are semi-variable
  if (xeroClass === 'OVERHEADS') return 'fixed';
  return 'semi_variable';
}

/**
 * Check if a cost is discretionary (can be cut without structural change).
 */
export function isDiscretionaryCost(accountName: string): boolean {
  for (const pattern of DISCRETIONARY_PATTERNS) {
    if (pattern.test(accountName)) return true;
  }
  return false;
}

/**
 * Classify all cost accounts and compute summary metrics.
 *
 * @param accounts - Array of cost accounts with their totals
 * @param totalRevenue - Total revenue for the period (for ratio calculations)
 * @param periodCount - Number of months in the data (for monthly breakeven)
 */
export function analyseCostStructure(
  accounts: Array<{
    accountId: string;
    accountName: string;
    accountCode: string;
    xeroClass: string;
    total: number;
  }>,
  totalRevenue: number,
  periodCount: number = 12
): CostStructureSummary {
  const classified: ClassifiedCost[] = accounts.map(acct => ({
    ...acct,
    costNature: classifyCostNature(acct.accountName, acct.xeroClass),
    isDiscretionary: isDiscretionaryCost(acct.accountName),
    totalAmount: Math.abs(acct.total), // Ensure positive for cost calculations
  }));

  // Aggregate by nature
  let totalFixed = 0;
  let totalVariable = 0;
  let totalSemiVariable = 0;
  let totalDiscretionary = 0;
  let totalNonDiscretionary = 0;

  for (const acct of classified) {
    const amount = acct.totalAmount;
    switch (acct.costNature) {
      case 'fixed':
        totalFixed += amount;
        break;
      case 'variable':
        totalVariable += amount;
        break;
      case 'semi_variable':
        // For breakeven calc, treat semi-variable as 50% fixed, 50% variable
        totalFixed += amount * 0.5;
        totalVariable += amount * 0.5;
        totalSemiVariable += amount;
        break;
    }

    if (acct.isDiscretionary) {
      totalDiscretionary += amount;
    } else {
      totalNonDiscretionary += amount;
    }
  }

  const totalCosts = totalFixed + totalVariable;

  // Ratios
  const fixedCostRatio = totalRevenue > 0 ? totalFixed / totalRevenue : 0;
  const variableCostRatio = totalRevenue > 0 ? totalVariable / totalRevenue : 0;
  const contributionMargin = 1 - variableCostRatio;
  const breakevenRevenue = contributionMargin > 0 ? totalFixed / contributionMargin : 0;
  const monthlyBreakevenRevenue = periodCount > 0 ? breakevenRevenue / periodCount : 0;

  // Operating leverage description
  let operatingLeverage: string;
  if (fixedCostRatio > 0.7) {
    operatingLeverage = 'High — profits amplify significantly with revenue growth, but losses deepen with declines.';
  } else if (fixedCostRatio > 0.5) {
    operatingLeverage = 'Moderate — balanced cost structure provides some amplification.';
  } else if (fixedCostRatio > 0.3) {
    operatingLeverage = 'Low-moderate — variable-heavy structure provides resilience in downturns.';
  } else {
    operatingLeverage = 'Low — highly variable cost structure adapts well to revenue changes.';
  }

  return {
    totalFixed: Math.round(totalFixed),
    totalVariable: Math.round(totalVariable),
    totalSemiVariable: Math.round(totalSemiVariable),
    totalCosts: Math.round(totalCosts),
    totalDiscretionary: Math.round(totalDiscretionary),
    totalNonDiscretionary: Math.round(totalNonDiscretionary),
    fixedCostRatio: Math.round(fixedCostRatio * 1000) / 1000,
    variableCostRatio: Math.round(variableCostRatio * 1000) / 1000,
    contributionMargin: Math.round(contributionMargin * 1000) / 1000,
    breakevenRevenue: Math.round(breakevenRevenue),
    monthlyBreakevenRevenue: Math.round(monthlyBreakevenRevenue),
    operatingLeverage,
    accounts: classified,
  };
}

/**
 * Get a human-readable cost structure description for insights.
 */
export function describeCostStructure(summary: CostStructureSummary): string {
  const fixedPct = (summary.fixedCostRatio * 100).toFixed(0);
  const varPct = (summary.variableCostRatio * 100).toFixed(0);
  const cmPct = (summary.contributionMargin * 100).toFixed(0);

  const parts: string[] = [];

  parts.push(`Cost structure: ${fixedPct}% fixed, ${varPct}% variable relative to revenue.`);
  parts.push(`Contribution margin: ${cmPct}%.`);

  if (summary.monthlyBreakevenRevenue > 0) {
    parts.push(`Monthly breakeven revenue: \u00A3${summary.monthlyBreakevenRevenue.toLocaleString()}.`);
  }

  if (summary.totalDiscretionary > 0) {
    parts.push(`Discretionary costs: \u00A3${summary.totalDiscretionary.toLocaleString()} \u2014 available for reduction if needed.`);
  }

  parts.push(summary.operatingLeverage);

  return parts.join(' ');
}
