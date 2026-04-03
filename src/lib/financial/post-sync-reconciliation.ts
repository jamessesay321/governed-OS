/**
 * Post-sync reconciliation — 5 automated checks run after every Xero sync.
 *
 * Check 1: Platform P&L vs Xero P&L Report (uses existing reconcile() function)
 * Check 2: P&L vs Balance Sheet cross-check (profit vs retained earnings movement)
 * Check 3: Ratio sanity vs industry benchmarks
 * Check 4: Deferred income detection (revenue accounts that look like deposits)
 * Check 5: Missing P&L components (stock, interest, depreciation)
 *
 * All check functions are DETERMINISTIC pure functions. The orchestrator handles I/O.
 */

import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import type { PnLSummary } from './aggregate';
import { reconcile, type ReconciliationReport } from './reconcile';
import type { XeroPnLTotals } from './xero-pnl-parser';
import type { IndustryBenchmarks } from './industry-benchmarks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReconciliationCheckName =
  | 'pnl_vs_xero'
  | 'pnl_vs_balance_sheet'
  | 'ratio_sanity'
  | 'deferred_income'
  | 'missing_pnl_components';

export type ReconciliationSeverity = 'pass' | 'warn' | 'critical';

export interface Discrepancy {
  field: string;
  platformValue: number;
  expectedValue: number;
  difference: number;
  explanation: string;
}

export interface ReconciliationCheck {
  name: ReconciliationCheckName;
  label: string;
  severity: ReconciliationSeverity;
  score: number; // 0-100
  message: string;
  discrepancies: Discrepancy[];
}

export interface ReconciliationResult {
  orgId: string;
  period: string;
  checks: ReconciliationCheck[];
  overallStatus: ReconciliationSeverity;
  overallScore: number;
  hasCritical: boolean;
  recommendations: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Check 1: Platform P&L vs Xero P&L Report
// ---------------------------------------------------------------------------

/**
 * Compare our normalised P&L totals against Xero's own P&L report.
 * Delegates to the existing reconcile() function for line-by-line comparison.
 */
export function checkPnlVsXero(
  normalised: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  xeroPnl: XeroPnLTotals,
  platformPnl: PnLSummary,
  period: string
): ReconciliationCheck {
  const discrepancies: Discrepancy[] = [];

  // Use existing reconcile() for line-by-line comparison (tolerance £1 for P&L report rounding)
  const reconReport: ReconciliationReport = reconcile(
    normalised,
    xeroPnl.byAccountCode,
    accounts,
    period,
    1.0 // £1 tolerance for rounding in Xero reports
  );

  // Check total-level discrepancies
  const revDiff = Math.abs(platformPnl.revenue - xeroPnl.totalRevenue);
  if (revDiff > 100) {
    discrepancies.push({
      field: 'Total Revenue',
      platformValue: platformPnl.revenue,
      expectedValue: xeroPnl.totalRevenue,
      difference: platformPnl.revenue - xeroPnl.totalRevenue,
      explanation: revDiff > xeroPnl.totalRevenue * 0.5
        ? 'Revenue is more than 50% higher than Xero reports. Likely double-counting from bank transactions.'
        : 'Revenue does not match Xero P&L report.',
    });
  }

  const cogsDiff = Math.abs(platformPnl.costOfSales - xeroPnl.totalCostOfSales);
  if (cogsDiff > 100) {
    discrepancies.push({
      field: 'Cost of Sales',
      platformValue: platformPnl.costOfSales,
      expectedValue: xeroPnl.totalCostOfSales,
      difference: platformPnl.costOfSales - xeroPnl.totalCostOfSales,
      explanation: 'Cost of sales does not match Xero P&L report.',
    });
  }

  const expDiff = Math.abs(platformPnl.expenses - xeroPnl.totalExpenses);
  if (expDiff > 100) {
    discrepancies.push({
      field: 'Total Expenses',
      platformValue: platformPnl.expenses,
      expectedValue: xeroPnl.totalExpenses,
      difference: platformPnl.expenses - xeroPnl.totalExpenses,
      explanation: 'Total expenses do not match Xero P&L report.',
    });
  }

  const netDiff = Math.abs(platformPnl.netProfit - xeroPnl.netProfit);
  if (netDiff > 100) {
    discrepancies.push({
      field: 'Net Profit',
      platformValue: platformPnl.netProfit,
      expectedValue: xeroPnl.netProfit,
      difference: platformPnl.netProfit - xeroPnl.netProfit,
      explanation: 'Net profit does not match Xero P&L report.',
    });
  }

  // Add per-account discrepancies from reconcile()
  for (const item of reconReport.items) {
    if (!item.matched && Math.abs(item.difference) > 100) {
      discrepancies.push({
        field: `${item.accountName} (${item.accountCode})`,
        platformValue: item.normalisedAmount,
        expectedValue: item.xeroAmount,
        difference: item.difference,
        explanation: `Account-level mismatch of ${Math.abs(item.difference).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}.`,
      });
    }
  }

  // Determine severity
  let severity: ReconciliationSeverity = 'pass';
  let score = 100;
  if (discrepancies.length > 0) {
    const totalAbsDiff = Math.abs(platformPnl.revenue - xeroPnl.totalRevenue) +
      Math.abs(platformPnl.netProfit - xeroPnl.netProfit);
    if (totalAbsDiff > 1000) {
      severity = 'critical';
      score = Math.max(0, 100 - Math.min(100, Math.round(totalAbsDiff / 100)));
    } else {
      severity = 'warn';
      score = Math.max(30, 100 - discrepancies.length * 10);
    }
  }

  return {
    name: 'pnl_vs_xero',
    label: 'Platform P&L vs Xero P&L Report',
    severity,
    score,
    message: severity === 'pass'
      ? 'Platform figures match Xero P&L report within tolerance.'
      : `Found ${discrepancies.length} discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} between platform and Xero P&L.`,
    discrepancies,
  };
}

// ---------------------------------------------------------------------------
// Check 2: P&L vs Balance Sheet cross-check
// ---------------------------------------------------------------------------

/**
 * Compare P&L net profit against the movement in equity/retained earnings.
 * If P&L shows profit but equity is declining, something is wrong.
 */
export function checkPnlVsBalanceSheet(
  platformPnl: PnLSummary,
  currentEquity: number | null,
  priorEquity: number | null
): ReconciliationCheck {
  const discrepancies: Discrepancy[] = [];

  // Can't run this check without balance sheet data
  if (currentEquity === null) {
    return {
      name: 'pnl_vs_balance_sheet',
      label: 'P&L vs Balance Sheet Cross-Check',
      severity: 'pass',
      score: 50,
      message: 'No balance sheet data available for cross-check. Sync balance sheet data to enable this check.',
      discrepancies: [],
    };
  }

  // Check 1: Profit shown but net liabilities (equity negative)
  if (platformPnl.netProfit > 0 && currentEquity < 0) {
    discrepancies.push({
      field: 'Net Profit vs Equity',
      platformValue: platformPnl.netProfit,
      expectedValue: currentEquity,
      difference: platformPnl.netProfit - currentEquity,
      explanation: `Platform shows ${platformPnl.netProfit.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })} profit but the business has net liabilities of ${currentEquity.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}. This is possible but unusual — verify the P&L figures are correct.`,
    });
  }

  // Check 2: If we have prior period, check movement direction
  if (priorEquity !== null) {
    const equityMovement = currentEquity - priorEquity;
    const pnlSign = platformPnl.netProfit >= 0 ? 'profit' : 'loss';
    const equityDirection = equityMovement >= 0 ? 'increased' : 'decreased';

    // Contradiction: profit shown but equity decreased significantly
    if (platformPnl.netProfit > 100 && equityMovement < -100) {
      discrepancies.push({
        field: 'Profit Direction vs Equity Movement',
        platformValue: platformPnl.netProfit,
        expectedValue: equityMovement,
        difference: platformPnl.netProfit - equityMovement,
        explanation: `P&L shows ${pnlSign} of ${Math.abs(platformPnl.netProfit).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })} but equity ${equityDirection} by ${Math.abs(equityMovement).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}. These should move in the same direction unless there were capital injections or dividends.`,
      });
    }

    // Contradiction: loss shown but equity increased significantly
    if (platformPnl.netProfit < -100 && equityMovement > 100) {
      // This is less concerning — could be capital injection — so just warn
      discrepancies.push({
        field: 'Loss Direction vs Equity Movement',
        platformValue: platformPnl.netProfit,
        expectedValue: equityMovement,
        difference: platformPnl.netProfit - equityMovement,
        explanation: `P&L shows a loss but equity increased. This could indicate a capital injection or the P&L period doesn't align with balance sheet dates.`,
      });
    }
  }

  let severity: ReconciliationSeverity = 'pass';
  let score = 100;
  if (discrepancies.length > 0) {
    const hasContradiction = discrepancies.some((d) => d.field === 'Profit Direction vs Equity Movement');
    if (hasContradiction) {
      severity = 'critical';
      score = 20;
    } else {
      severity = 'warn';
      score = 50;
    }
  }

  return {
    name: 'pnl_vs_balance_sheet',
    label: 'P&L vs Balance Sheet Cross-Check',
    severity,
    score,
    message: severity === 'pass'
      ? 'P&L and balance sheet movements are consistent.'
      : `Found ${discrepancies.length} inconsistenc${discrepancies.length === 1 ? 'y' : 'ies'} between P&L and balance sheet.`,
    discrepancies,
  };
}

// ---------------------------------------------------------------------------
// Check 3: Ratio sanity vs industry benchmarks
// ---------------------------------------------------------------------------

export function checkRatioSanity(
  platformPnl: PnLSummary,
  benchmarks: IndustryBenchmarks,
  totalAssets: number | null,
  totalLiabilities: number | null
): ReconciliationCheck {
  const discrepancies: Discrepancy[] = [];

  if (platformPnl.revenue === 0) {
    return {
      name: 'ratio_sanity',
      label: 'Financial Ratio Sanity Check',
      severity: 'pass',
      score: 50,
      message: 'No revenue data to check ratios against.',
      discrepancies: [],
    };
  }

  const grossMargin = (platformPnl.grossProfit / platformPnl.revenue) * 100;
  const netMargin = (platformPnl.netProfit / platformPnl.revenue) * 100;

  // Gross margin outside industry range
  if (grossMargin < benchmarks.grossMarginRange[0] - 10) {
    discrepancies.push({
      field: 'Gross Margin (Low)',
      platformValue: grossMargin,
      expectedValue: benchmarks.grossMarginRange[0],
      difference: grossMargin - benchmarks.grossMarginRange[0],
      explanation: `Gross margin of ${grossMargin.toFixed(1)}% is below the industry range of ${benchmarks.grossMarginRange[0]}-${benchmarks.grossMarginRange[1]}%. Cost of sales may be overstated or revenue understated.`,
    });
  } else if (grossMargin > benchmarks.grossMarginRange[1] + 10) {
    discrepancies.push({
      field: 'Gross Margin (High)',
      platformValue: grossMargin,
      expectedValue: benchmarks.grossMarginRange[1],
      difference: grossMargin - benchmarks.grossMarginRange[1],
      explanation: `Gross margin of ${grossMargin.toFixed(1)}% is above the industry range of ${benchmarks.grossMarginRange[0]}-${benchmarks.grossMarginRange[1]}%. Cost of sales may be missing or understated.`,
    });
  }

  // Net margin implausibly high
  if (netMargin > benchmarks.maxPlausibleNetMargin) {
    discrepancies.push({
      field: 'Net Margin (Implausible)',
      platformValue: netMargin,
      expectedValue: benchmarks.maxPlausibleNetMargin,
      difference: netMargin - benchmarks.maxPlausibleNetMargin,
      explanation: `Net margin of ${netMargin.toFixed(1)}% exceeds the plausible maximum of ${benchmarks.maxPlausibleNetMargin}% for this industry. Revenue may be double-counted or expenses missing.`,
    });
  }

  // Profit but net liabilities
  if (totalAssets !== null && totalLiabilities !== null) {
    const netAssets = totalAssets - Math.abs(totalLiabilities);
    if (platformPnl.netProfit > 0 && netAssets < 0) {
      discrepancies.push({
        field: 'Profit with Net Liabilities',
        platformValue: platformPnl.netProfit,
        expectedValue: netAssets,
        difference: platformPnl.netProfit - netAssets,
        explanation: `Platform shows profit but the balance sheet has net liabilities of ${netAssets.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}. This is a strong signal the P&L may be incorrect.`,
      });
    }
  }

  let severity: ReconciliationSeverity = 'pass';
  let score = 100;
  if (discrepancies.length > 0) {
    const hasImplausible = discrepancies.some((d) =>
      d.field.includes('Implausible') || d.field.includes('Net Liabilities')
    );
    if (hasImplausible) {
      severity = 'critical';
      score = 15;
    } else {
      severity = 'warn';
      score = Math.max(30, 100 - discrepancies.length * 20);
    }
  }

  return {
    name: 'ratio_sanity',
    label: 'Financial Ratio Sanity Check',
    severity,
    score,
    message: severity === 'pass'
      ? 'Financial ratios are within expected ranges for this industry.'
      : `Found ${discrepancies.length} ratio${discrepancies.length === 1 ? '' : 's'} outside expected ranges.`,
    discrepancies,
  };
}

// ---------------------------------------------------------------------------
// Check 4: Deferred income detection
// ---------------------------------------------------------------------------

const DEFERRED_INCOME_PATTERNS = [
  'deposit', 'deferred', 'advance', 'prepaid', 'unearned', 'retainer',
  'pre-paid', 'upfront', 'down payment', 'booking fee',
];

/**
 * Check if any revenue-classified accounts look like they should be liabilities
 * (e.g. customer deposits classified as revenue instead of deferred income).
 */
export function checkDeferredIncome(
  normalised: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  period: string
): ReconciliationCheck {
  const discrepancies: Discrepancy[] = [];
  const periodData = normalised.filter((f) => f.period === period);

  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  let totalSuspectAmount = 0;

  for (const fin of periodData) {
    const account = accountMap.get(fin.account_id);
    if (!account) continue;

    // Only check accounts classified as REVENUE
    if (account.class.toUpperCase() !== 'REVENUE') continue;

    const nameLower = account.name.toLowerCase();
    const matchedPattern = DEFERRED_INCOME_PATTERNS.find((p) => nameLower.includes(p));

    if (matchedPattern) {
      const amount = Math.abs(Number(fin.amount));
      totalSuspectAmount += amount;
      discrepancies.push({
        field: `${account.name} (${account.code})`,
        platformValue: amount,
        expectedValue: 0,
        difference: amount,
        explanation: `Account "${account.name}" is classified as REVENUE but contains "${matchedPattern}" in its name. This may be deferred income that should be a LIABILITY. Revenue could be overstated by ${amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}.`,
      });
    }
  }

  const severity: ReconciliationSeverity = discrepancies.length > 0 ? 'warn' : 'pass';
  const score = discrepancies.length === 0 ? 100 : Math.max(40, 100 - discrepancies.length * 15);

  return {
    name: 'deferred_income',
    label: 'Deferred Income Detection',
    severity,
    score,
    message: severity === 'pass'
      ? 'No revenue accounts appear to contain deferred income.'
      : `Found ${discrepancies.length} revenue account${discrepancies.length === 1 ? '' : 's'} that may contain deferred income totalling ${totalSuspectAmount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}. Revenue may be overstated.`,
    discrepancies,
  };
}

// ---------------------------------------------------------------------------
// Check 5: Missing P&L components
// ---------------------------------------------------------------------------

/**
 * Check for expected P&L line items that are missing.
 * Uses industry benchmarks and chart of accounts to detect gaps.
 */
export function checkMissingPnlComponents(
  normalised: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  period: string,
  benchmarks: IndustryBenchmarks
): ReconciliationCheck {
  const discrepancies: Discrepancy[] = [];
  const periodData = normalised.filter((f) => f.period === period);

  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  // Get all account classes/types that have data this period
  const activeClasses = new Set<string>();
  const activeAccountNames = new Set<string>();
  for (const fin of periodData) {
    const acc = accountMap.get(fin.account_id);
    if (acc) {
      activeClasses.add(acc.class.toUpperCase());
      activeAccountNames.add(acc.name.toLowerCase());
    }
  }

  // Check: stock/WIP/inventory accounts exist in CoA but not in P&L DIRECTCOSTS
  if (benchmarks.expectsStockMovements) {
    const stockAccounts = accounts.filter((a) => {
      const name = a.name.toLowerCase();
      return (
        (name.includes('stock') || name.includes('inventory') || name.includes('wip') || name.includes('work in progress')) &&
        a.class.toUpperCase() === 'ASSET'
      );
    });

    if (stockAccounts.length > 0) {
      // Check if any stock movement appears in DIRECTCOSTS
      const hasStockInCOGS = periodData.some((fin) => {
        const acc = accountMap.get(fin.account_id);
        if (!acc) return false;
        const name = acc.name.toLowerCase();
        return (
          acc.class.toUpperCase() === 'DIRECTCOSTS' &&
          (name.includes('stock') || name.includes('opening') || name.includes('closing') || name.includes('inventory'))
        );
      });

      if (!hasStockInCOGS) {
        discrepancies.push({
          field: 'Stock/WIP Movements',
          platformValue: 0,
          expectedValue: 1,
          difference: -1,
          explanation: `Found ${stockAccounts.length} stock/inventory account(s) on the balance sheet (${stockAccounts.map((a) => a.name).join(', ')}) but no stock movements in Cost of Sales. Gross margin may be overstated.`,
        });
      }
    }
  }

  // Check: interest expense missing when debt accounts exist
  if (benchmarks.expectsInterestExpense) {
    const hasDebtAccounts = accounts.some((a) => {
      const name = a.name.toLowerCase();
      return (
        a.class.toUpperCase() === 'LIABILITY' &&
        (name.includes('loan') || name.includes('overdraft') || name.includes('mortgage') || name.includes('borrowing') || name.includes('credit facility'))
      );
    });

    if (hasDebtAccounts) {
      const hasInterestExpense = periodData.some((fin) => {
        const acc = accountMap.get(fin.account_id);
        if (!acc) return false;
        const name = acc.name.toLowerCase();
        return (
          (acc.class.toUpperCase() === 'EXPENSE' || acc.class.toUpperCase() === 'OVERHEADS') &&
          (name.includes('interest') || name.includes('finance cost') || name.includes('bank charge'))
        );
      });

      if (!hasInterestExpense) {
        discrepancies.push({
          field: 'Interest Expense',
          platformValue: 0,
          expectedValue: 1,
          difference: -1,
          explanation: 'Debt/loan accounts exist on the balance sheet but no interest expense appears in the P&L. Net profit may be overstated.',
        });
      }
    }
  }

  // Check: depreciation missing when fixed assets exist
  if (benchmarks.expectsDepreciation) {
    const hasFixedAssets = accounts.some((a) => {
      const name = a.name.toLowerCase();
      return (
        a.class.toUpperCase() === 'ASSET' &&
        (name.includes('fixed asset') || name.includes('property') || name.includes('equipment') ||
         name.includes('furniture') || name.includes('vehicle') || name.includes('machinery'))
      );
    });

    if (hasFixedAssets) {
      const hasDepreciation = periodData.some((fin) => {
        const acc = accountMap.get(fin.account_id);
        if (!acc) return false;
        const name = acc.name.toLowerCase();
        return name.includes('depreciation') || name.includes('amortisation') || name.includes('amortization');
      });

      if (!hasDepreciation) {
        discrepancies.push({
          field: 'Depreciation',
          platformValue: 0,
          expectedValue: 1,
          difference: -1,
          explanation: 'Fixed asset accounts exist but no depreciation/amortisation expense appears in the P&L for this period.',
        });
      }
    }
  }

  // Check: COGS expected but entirely missing
  if (benchmarks.expectsCOGS && !activeClasses.has('DIRECTCOSTS')) {
    discrepancies.push({
      field: 'Cost of Sales',
      platformValue: 0,
      expectedValue: 1,
      difference: -1,
      explanation: 'No cost of sales data at all for this period. For this industry, COGS is expected. Gross margin is likely overstated.',
    });
  }

  const severity: ReconciliationSeverity = discrepancies.length > 0 ? 'warn' : 'pass';
  const score = discrepancies.length === 0 ? 100 : Math.max(30, 100 - discrepancies.length * 20);

  return {
    name: 'missing_pnl_components',
    label: 'Missing P&L Components',
    severity,
    score,
    message: severity === 'pass'
      ? 'All expected P&L components are present.'
      : `Found ${discrepancies.length} expected P&L component${discrepancies.length === 1 ? '' : 's'} that may be missing.`,
    discrepancies,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const CHECK_WEIGHTS: Record<ReconciliationCheckName, number> = {
  pnl_vs_xero: 0.35,
  pnl_vs_balance_sheet: 0.30,
  ratio_sanity: 0.15,
  deferred_income: 0.10,
  missing_pnl_components: 0.10,
};

export function computeOverallScore(checks: ReconciliationCheck[]): {
  score: number;
  status: ReconciliationSeverity;
  hasCritical: boolean;
} {
  let weightedScore = 0;
  let hasCritical = false;

  for (const check of checks) {
    const weight = CHECK_WEIGHTS[check.name] || 0;
    weightedScore += check.score * weight;
    if (check.severity === 'critical') hasCritical = true;
  }

  const score = Math.round(weightedScore);
  let status: ReconciliationSeverity = 'pass';
  if (hasCritical) status = 'critical';
  else if (score < 70) status = 'warn';

  return { score, status, hasCritical };
}

export function generateRecommendations(checks: ReconciliationCheck[]): string[] {
  const recommendations: string[] = [];

  for (const check of checks) {
    if (check.severity === 'pass') continue;

    switch (check.name) {
      case 'pnl_vs_xero':
        recommendations.push(
          'Compare the platform P&L against Xero\'s own Profit & Loss report to identify which accounts are mismatched.'
        );
        break;
      case 'pnl_vs_balance_sheet':
        recommendations.push(
          'Check if the P&L period aligns with the balance sheet date. Look for capital injections or dividends that could explain the movement.'
        );
        break;
      case 'ratio_sanity':
        if (check.discrepancies.some((d) => d.field.includes('Implausible'))) {
          recommendations.push(
            'Net margin is implausibly high. Check for double-counted revenue or missing expense categories.'
          );
        }
        if (check.discrepancies.some((d) => d.field.includes('Net Liabilities'))) {
          recommendations.push(
            'The business shows profit but has net liabilities. Verify the P&L figures match the source accounting system.'
          );
        }
        break;
      case 'deferred_income':
        recommendations.push(
          'Review revenue accounts flagged as potential deferred income. If these are customer deposits, they should be classified as liabilities until the service is delivered.'
        );
        break;
      case 'missing_pnl_components':
        for (const d of check.discrepancies) {
          if (d.field === 'Stock/WIP Movements') {
            recommendations.push(
              'Add opening/closing stock movements to Cost of Sales for a correct gross margin calculation.'
            );
          } else if (d.field === 'Interest Expense') {
            recommendations.push(
              'Verify that interest charges on loans/overdrafts are flowing through to the P&L.'
            );
          } else if (d.field === 'Depreciation') {
            recommendations.push(
              'Check whether depreciation is being posted. Fixed assets exist but no depreciation expense is recorded.'
            );
          }
        }
        break;
    }
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Orchestrator (async — handles all I/O)
// ---------------------------------------------------------------------------

import { createServiceClient } from '@/lib/supabase/server';
import { xeroGet } from '@/lib/xero/api';
import { parseXeroPnLReport } from './xero-pnl-parser';
import { getBenchmarks } from './industry-benchmarks';
import { buildPnL, getAvailablePeriods, sumAmounts } from './aggregate';

/**
 * Run all 5 reconciliation checks for recent periods.
 * Called automatically after every Xero sync (non-blocking).
 */
export async function runPostSyncReconciliation(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<ReconciliationResult[]> {
  const supabase = await createServiceClient();

  // Load chart of accounts
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  if (!accounts || accounts.length === 0) {
    console.warn('[RECONCILIATION] No chart of accounts — skipping');
    return [];
  }

  // Load all normalised financials
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId)
    .eq('source', 'xero');

  if (!financials || financials.length === 0) {
    console.warn('[RECONCILIATION] No normalised financials — skipping');
    return [];
  }

  // Get the 3 most recent periods
  const periods = getAvailablePeriods(financials as NormalisedFinancial[]).slice(0, 3);
  if (periods.length === 0) return [];

  // Look up industry for benchmarks
  const { data: orgProfile } = await supabase
    .from('business_context_profiles' as any)
    .select('industry')
    .eq('org_id', orgId)
    .single();

  const industry = (orgProfile as Record<string, unknown> | null)?.industry as string | null;
  const benchmarks = getBenchmarks(industry ?? null);

  const results: ReconciliationResult[] = [];

  for (const period of periods) {
    try {
      // Fetch Xero P&L for this period
      const [year, month] = period.split('-').map(Number);
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      let xeroPnl: XeroPnLTotals;
      try {
        const pnlData = await xeroGet(
          `Reports/ProfitAndLoss?fromDate=${firstDay}&toDate=${endDate}`,
          accessToken,
          tenantId
        );
        xeroPnl = parseXeroPnLReport(pnlData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[RECONCILIATION] Xero P&L fetch failed for ${period}: ${msg}`);
        if (msg.includes('429')) break; // Rate limited — stop
        continue; // Skip this period
      }

      // Build platform P&L
      const platformPnl = buildPnL(
        financials as NormalisedFinancial[],
        accounts as ChartOfAccount[],
        period
      );

      // Get balance sheet totals for cross-checks
      const bsAccounts = financials.filter((f) => {
        const acc = accounts.find((a) => a.id === f.account_id);
        return acc && f.period === period && ['ASSET', 'LIABILITY', 'EQUITY'].includes(acc.class.toUpperCase());
      });

      const totalAssets = sumAmounts(
        bsAccounts
          .filter((f) => accounts.find((a) => a.id === f.account_id)?.class.toUpperCase() === 'ASSET')
          .map((f) => Number(f.amount))
      );

      const totalLiabilities = sumAmounts(
        bsAccounts
          .filter((f) => accounts.find((a) => a.id === f.account_id)?.class.toUpperCase() === 'LIABILITY')
          .map((f) => Number(f.amount))
      );

      const totalEquity = sumAmounts(
        bsAccounts
          .filter((f) => accounts.find((a) => a.id === f.account_id)?.class.toUpperCase() === 'EQUITY')
          .map((f) => Number(f.amount))
      );

      // Get prior period equity for movement check
      const priorPeriodIndex = periods.indexOf(period) + 1;
      let priorEquity: number | null = null;
      if (priorPeriodIndex < periods.length) {
        const priorPeriod = periods[priorPeriodIndex];
        const priorBs = financials.filter((f) => {
          const acc = accounts.find((a) => a.id === f.account_id);
          return acc && f.period === priorPeriod && acc.class.toUpperCase() === 'EQUITY';
        });
        if (priorBs.length > 0) {
          priorEquity = sumAmounts(priorBs.map((f) => Number(f.amount)));
        }
      }

      // Run all 5 checks
      const checks: ReconciliationCheck[] = [
        checkPnlVsXero(
          financials as NormalisedFinancial[],
          accounts as ChartOfAccount[],
          xeroPnl,
          platformPnl,
          period
        ),
        checkPnlVsBalanceSheet(
          platformPnl,
          bsAccounts.length > 0 ? totalEquity : null,
          priorEquity
        ),
        checkRatioSanity(
          platformPnl,
          benchmarks,
          bsAccounts.length > 0 ? totalAssets : null,
          bsAccounts.length > 0 ? totalLiabilities : null
        ),
        checkDeferredIncome(
          financials as NormalisedFinancial[],
          accounts as ChartOfAccount[],
          period
        ),
        checkMissingPnlComponents(
          financials as NormalisedFinancial[],
          accounts as ChartOfAccount[],
          period,
          benchmarks
        ),
      ];

      const { score, status, hasCritical } = computeOverallScore(checks);
      const recommendations = generateRecommendations(checks);

      const result: ReconciliationResult = {
        orgId,
        period,
        checks,
        overallStatus: status,
        overallScore: score,
        hasCritical,
        recommendations,
        createdAt: new Date().toISOString(),
      };

      // Upsert to DB
      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet (migration 027)
        .from('reconciliation_reports' as any)
        .upsert(
          {
            org_id: orgId,
            period,
            checks: JSON.parse(JSON.stringify(checks)),
            overall_status: status,
            overall_score: score,
            has_critical: hasCritical,
            recommendations,
          },
          { onConflict: 'org_id,period' }
        );

      results.push(result);

      console.log(
        `[RECONCILIATION] ${period}: score=${score}, status=${status}, critical=${hasCritical}, checks=${checks.map((c) => `${c.name}=${c.severity}`).join(', ')}`
      );
    } catch (err) {
      console.warn(`[RECONCILIATION] Failed for ${period}:`, err instanceof Error ? err.message : String(err));
    }
  }

  return results;
}
