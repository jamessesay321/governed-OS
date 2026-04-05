/**
 * UK Company Classification Engine
 *
 * Based on Companies Act 2006 (as amended by SI 2024/686, effective for
 * financial years starting on or after 1 October 2024).
 *
 * Standards: FRS 102, FRS 105 (issued by Financial Reporting Council)
 * Professional bodies: ICAEW (ACA), ACCA — regulate practitioners
 * Regulatory framework: Companies Act 2006, HMRC requirements
 */

// ---- Thresholds (Companies Act 2006, amended Oct 2024) ----

export const UK_THRESHOLDS = {
  // Pre-Oct 2024 thresholds (for FY starting before 1 Oct 2024)
  legacy: {
    micro: { turnover: 632_000, balanceSheet: 316_000, employees: 10 },
    small: { turnover: 10_200_000, balanceSheet: 5_100_000, employees: 50 },
    medium: { turnover: 36_000_000, balanceSheet: 18_000_000, employees: 250 },
  },
  // Post-Oct 2024 thresholds (for FY starting on/after 1 Oct 2024)
  current: {
    micro: { turnover: 1_000_000, balanceSheet: 500_000, employees: 10 },
    small: { turnover: 15_000_000, balanceSheet: 7_500_000, employees: 50 },
    medium: { turnover: 54_000_000, balanceSheet: 27_000_000, employees: 250 },
  },
} as const;

export const UK_VAT_THRESHOLD = 90_000; // From 1 April 2024
export const UK_VAT_DEREGISTRATION_THRESHOLD = 88_000;

export const UK_CORPORATION_TAX = {
  smallProfitsRate: 0.19,
  mainRate: 0.25,
  smallProfitsLimit: 50_000,
  upperLimit: 250_000,
  marginalReliefFraction: 3 / 200,
} as const;

export type CompanySize = 'micro' | 'small' | 'medium' | 'large';

export type AccountingStandard = 'FRS 105' | 'FRS 102 Section 1A' | 'FRS 102' | 'EU-adopted IFRS';

export interface CompanyClassification {
  size: CompanySize;
  applicableStandards: AccountingStandard[];
  recommendedStandard: AccountingStandard;
  auditRequired: boolean;
  auditExemptionReason: string | null;
  filingRequirements: FilingRequirements;
  thresholdsUsed: 'legacy' | 'current';
}

export interface FilingRequirements {
  accountsDeadlineMonths: number; // Months after year-end
  confirmationStatementFrequencyMonths: number;
  corporationTaxReturnDeadlineMonths: number;
  corporationTaxPaymentDeadlineDescription: string;
  vatReturnFrequency: string | null;
  canFileAbridgedAccounts: boolean;
  canFileMicroEntityAccounts: boolean;
  mustFileFullAccounts: boolean;
  mustIncludeProfitAndLoss: boolean;
  mustIncludeDirectorsReport: boolean;
  mustIncludeStrategicReport: boolean;
  mustIncludeAuditReport: boolean;
}

/**
 * Classify a UK company by size based on Companies Act 2006 thresholds.
 * A company meets a size category if it satisfies at least 2 of 3 criteria.
 */
export function classifyCompany(params: {
  turnover: number; // Annual turnover in GBP
  balanceSheetTotal: number; // Total assets (gross)
  averageEmployees: number;
  financialYearStart: Date; // To determine which thresholds apply
  isPublicCompany?: boolean;
  isPartOfIneligibleGroup?: boolean;
  isRegulatedByFCA?: boolean;
}): CompanyClassification {
  const {
    turnover,
    balanceSheetTotal,
    averageEmployees,
    financialYearStart,
    isPublicCompany = false,
    isPartOfIneligibleGroup = false,
    isRegulatedByFCA = false,
  } = params;

  // Determine which thresholds to use
  const thresholdDate = new Date('2024-10-01');
  const thresholdsUsed = financialYearStart >= thresholdDate ? 'current' : 'legacy';
  const t = UK_THRESHOLDS[thresholdsUsed];

  // Count how many criteria are met for each size category
  // Must meet at least 2 of 3
  const meetsMicro = countMet(turnover, balanceSheetTotal, averageEmployees, t.micro) >= 2;
  const meetsSmall = countMet(turnover, balanceSheetTotal, averageEmployees, t.small) >= 2;
  const meetsMedium = countMet(turnover, balanceSheetTotal, averageEmployees, t.medium) >= 2;

  let size: CompanySize;
  if (meetsMicro) {
    size = 'micro';
  } else if (meetsSmall) {
    size = 'small';
  } else if (meetsMedium) {
    size = 'medium';
  } else {
    size = 'large';
  }

  // Determine applicable accounting standards
  const applicableStandards = getApplicableStandards(size);
  const recommendedStandard = getRecommendedStandard(size);

  // Determine audit requirements
  const { auditRequired, auditExemptionReason } = determineAuditRequirement({
    size,
    isPublicCompany,
    isPartOfIneligibleGroup,
    isRegulatedByFCA,
  });

  // Determine filing requirements
  const filingRequirements = getFilingRequirements(size, isPublicCompany);

  return {
    size,
    applicableStandards,
    recommendedStandard,
    auditRequired,
    auditExemptionReason,
    filingRequirements,
    thresholdsUsed,
  };
}

function countMet(
  turnover: number,
  balanceSheet: number,
  employees: number,
  threshold: { turnover: number; balanceSheet: number; employees: number }
): number {
  let count = 0;
  if (turnover <= threshold.turnover) count++;
  if (balanceSheet <= threshold.balanceSheet) count++;
  if (employees <= threshold.employees) count++;
  return count;
}

function getApplicableStandards(size: CompanySize): AccountingStandard[] {
  switch (size) {
    case 'micro':
      return ['FRS 105', 'FRS 102 Section 1A', 'FRS 102', 'EU-adopted IFRS'];
    case 'small':
      return ['FRS 102 Section 1A', 'FRS 102', 'EU-adopted IFRS'];
    case 'medium':
    case 'large':
      return ['FRS 102', 'EU-adopted IFRS'];
  }
}

function getRecommendedStandard(size: CompanySize): AccountingStandard {
  switch (size) {
    case 'micro':
      return 'FRS 105';
    case 'small':
      return 'FRS 102 Section 1A';
    case 'medium':
    case 'large':
      return 'FRS 102';
  }
}

function determineAuditRequirement(params: {
  size: CompanySize;
  isPublicCompany: boolean;
  isPartOfIneligibleGroup: boolean;
  isRegulatedByFCA: boolean;
}): { auditRequired: boolean; auditExemptionReason: string | null } {
  // Public companies always require audit
  if (params.isPublicCompany) {
    return { auditRequired: true, auditExemptionReason: null };
  }

  // FCA-regulated companies always require audit
  if (params.isRegulatedByFCA) {
    return { auditRequired: true, auditExemptionReason: null };
  }

  // Companies in ineligible groups require audit
  if (params.isPartOfIneligibleGroup) {
    return { auditRequired: true, auditExemptionReason: null };
  }

  // Small companies (and micro) are exempt under s477 Companies Act 2006
  if (params.size === 'micro' || params.size === 'small') {
    return {
      auditRequired: false,
      auditExemptionReason: `Qualifies as ${params.size} company under Companies Act 2006 s477-479. Exempt from statutory audit unless 10%+ shareholders request one.`,
    };
  }

  // Medium and large require audit
  return { auditRequired: true, auditExemptionReason: null };
}

function getFilingRequirements(size: CompanySize, isPublicCompany: boolean): FilingRequirements {
  const baseDeadline = isPublicCompany ? 6 : 9;

  switch (size) {
    case 'micro':
      return {
        accountsDeadlineMonths: baseDeadline,
        confirmationStatementFrequencyMonths: 12,
        corporationTaxReturnDeadlineMonths: 12,
        corporationTaxPaymentDeadlineDescription: '9 months and 1 day after end of accounting period',
        vatReturnFrequency: null, // Depends on VAT registration
        canFileAbridgedAccounts: true,
        canFileMicroEntityAccounts: true,
        mustFileFullAccounts: false,
        mustIncludeProfitAndLoss: false, // Micro-entities exempt from filing P&L
        mustIncludeDirectorsReport: false,
        mustIncludeStrategicReport: false,
        mustIncludeAuditReport: false,
      };
    case 'small':
      return {
        accountsDeadlineMonths: baseDeadline,
        confirmationStatementFrequencyMonths: 12,
        corporationTaxReturnDeadlineMonths: 12,
        corporationTaxPaymentDeadlineDescription: '9 months and 1 day after end of accounting period',
        vatReturnFrequency: null,
        canFileAbridgedAccounts: true,
        canFileMicroEntityAccounts: false,
        mustFileFullAccounts: false,
        mustIncludeProfitAndLoss: false, // Small companies can exclude from filed accounts
        mustIncludeDirectorsReport: false, // Exempt if small
        mustIncludeStrategicReport: false,
        mustIncludeAuditReport: false,
      };
    case 'medium':
      return {
        accountsDeadlineMonths: baseDeadline,
        confirmationStatementFrequencyMonths: 12,
        corporationTaxReturnDeadlineMonths: 12,
        corporationTaxPaymentDeadlineDescription: '9 months and 1 day after end of accounting period',
        vatReturnFrequency: null,
        canFileAbridgedAccounts: false,
        canFileMicroEntityAccounts: false,
        mustFileFullAccounts: true,
        mustIncludeProfitAndLoss: true,
        mustIncludeDirectorsReport: true,
        mustIncludeStrategicReport: true,
        mustIncludeAuditReport: true,
      };
    case 'large':
      return {
        accountsDeadlineMonths: baseDeadline,
        confirmationStatementFrequencyMonths: 12,
        corporationTaxReturnDeadlineMonths: 12,
        corporationTaxPaymentDeadlineDescription: 'Large companies pay in quarterly instalments (profits > 1.5m)',
        vatReturnFrequency: null,
        canFileAbridgedAccounts: false,
        canFileMicroEntityAccounts: false,
        mustFileFullAccounts: true,
        mustIncludeProfitAndLoss: true,
        mustIncludeDirectorsReport: true,
        mustIncludeStrategicReport: true,
        mustIncludeAuditReport: true,
      };
  }
}

// ---- Filing Deadline Calculator ----

export interface FilingDeadlines {
  accountsDeadline: Date;
  confirmationStatementDeadline: Date;
  corporationTaxReturnDeadline: Date;
  corporationTaxPaymentDeadline: Date;
  isOverdue: {
    accounts: boolean;
    confirmationStatement: boolean;
    corporationTaxReturn: boolean;
    corporationTaxPayment: boolean;
  };
  daysUntil: {
    accounts: number;
    confirmationStatement: number;
    corporationTaxReturn: number;
    corporationTaxPayment: number;
  };
}

export function calculateFilingDeadlines(params: {
  yearEndDate: Date; // The accounting reference date for the period
  lastConfirmationStatementDate: Date;
  isFirstAccounts?: boolean;
  isPublicCompany?: boolean;
}): FilingDeadlines {
  const { yearEndDate, lastConfirmationStatementDate, isFirstAccounts = false, isPublicCompany = false } = params;
  const now = new Date();

  // Accounts deadline
  let accountsDeadlineMonths: number;
  if (isFirstAccounts) {
    accountsDeadlineMonths = isPublicCompany ? 18 : 21;
  } else {
    accountsDeadlineMonths = isPublicCompany ? 6 : 9;
  }
  const accountsDeadline = addMonths(yearEndDate, accountsDeadlineMonths);

  // Confirmation statement: 12 months from last filing, then 14 days to file
  const confirmationReviewEnd = addMonths(lastConfirmationStatementDate, 12);
  const confirmationStatementDeadline = addDays(confirmationReviewEnd, 14);

  // CT return: 12 months after end of accounting period
  const corporationTaxReturnDeadline = addMonths(yearEndDate, 12);

  // CT payment: 9 months and 1 day after end of accounting period
  const corporationTaxPaymentDeadline = addDays(addMonths(yearEndDate, 9), 1);

  return {
    accountsDeadline,
    confirmationStatementDeadline,
    corporationTaxReturnDeadline,
    corporationTaxPaymentDeadline,
    isOverdue: {
      accounts: now > accountsDeadline,
      confirmationStatement: now > confirmationStatementDeadline,
      corporationTaxReturn: now > corporationTaxReturnDeadline,
      corporationTaxPayment: now > corporationTaxPaymentDeadline,
    },
    daysUntil: {
      accounts: daysBetween(now, accountsDeadline),
      confirmationStatement: daysBetween(now, confirmationStatementDeadline),
      corporationTaxReturn: daysBetween(now, corporationTaxReturnDeadline),
      corporationTaxPayment: daysBetween(now, corporationTaxPaymentDeadline),
    },
  };
}

// ---- Going Concern Indicators (ISA 570) ----

export interface GoingConcernAssessment {
  score: number; // 0-100, higher = more concern
  level: 'healthy' | 'watch' | 'warning' | 'critical';
  indicators: GoingConcernIndicator[];
}

export interface GoingConcernIndicator {
  name: string;
  triggered: boolean;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  reference: string; // ISA/FRS reference
}

export function assessGoingConcern(params: {
  currentAssets: number;
  currentLiabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  operatingProfit: number; // Can be negative (loss)
  interestExpense: number;
  hasOverdueTaxLiabilities: boolean;
  hasBreachedLoanCovenants: boolean;
  consecutiveLossYears: number;
}): GoingConcernAssessment {
  const indicators: GoingConcernIndicator[] = [];
  let score = 0;

  const {
    currentAssets,
    currentLiabilities,
    totalAssets,
    totalLiabilities,
    operatingProfit,
    interestExpense,
    hasOverdueTaxLiabilities,
    hasBreachedLoanCovenants,
    consecutiveLossYears,
  } = params;

  // 1. Net current liabilities
  if (currentLiabilities > currentAssets) {
    indicators.push({
      name: 'Net current liabilities',
      triggered: true,
      severity: 'warning',
      description: `Current liabilities (${formatGBP(currentLiabilities)}) exceed current assets (${formatGBP(currentAssets)}). The company may struggle to meet short-term obligations.`,
      reference: 'ISA 570.A3, Companies Act 2006 s172',
    });
    score += 25;
  } else {
    const currentRatio = currentAssets / (currentLiabilities || 1);
    indicators.push({
      name: 'Current ratio',
      triggered: currentRatio < 1.2,
      severity: currentRatio < 1.0 ? 'critical' : currentRatio < 1.2 ? 'warning' : 'info',
      description: `Current ratio: ${currentRatio.toFixed(2)}. ${currentRatio < 1.0 ? 'Below 1.0 - liquidity risk.' : currentRatio < 1.5 ? 'Below 1.5 - monitor closely.' : 'Healthy.'}`,
      reference: 'ISA 570.A3',
    });
    if (currentRatio < 1.2) score += 15;
  }

  // 2. Net liabilities (negative net worth)
  const netWorth = totalAssets - totalLiabilities;
  if (netWorth < 0) {
    indicators.push({
      name: 'Net liabilities (negative net worth)',
      triggered: true,
      severity: 'critical',
      description: `Total liabilities (${formatGBP(totalLiabilities)}) exceed total assets (${formatGBP(totalAssets)}). Net worth: ${formatGBP(netWorth)}.`,
      reference: 'ISA 570.A3, FRS 102 Section 4',
    });
    score += 30;
  }

  // 3. Operating losses
  if (operatingProfit < 0) {
    indicators.push({
      name: 'Operating loss',
      triggered: true,
      severity: consecutiveLossYears >= 2 ? 'critical' : 'warning',
      description: `Operating loss of ${formatGBP(Math.abs(operatingProfit))}. ${consecutiveLossYears >= 2 ? `${consecutiveLossYears} consecutive years of losses.` : ''}`,
      reference: 'ISA 570.A3',
    });
    score += consecutiveLossYears >= 2 ? 25 : 15;
  }

  // 4. Interest cover
  if (interestExpense > 0 && operatingProfit > 0) {
    const interestCover = operatingProfit / interestExpense;
    indicators.push({
      name: 'Interest cover',
      triggered: interestCover < 1.5,
      severity: interestCover < 1.0 ? 'critical' : interestCover < 1.5 ? 'warning' : 'info',
      description: `Interest cover: ${interestCover.toFixed(1)}x. ${interestCover < 1.0 ? 'Cannot cover interest from operating profits.' : interestCover < 1.5 ? 'Below safe threshold.' : interestCover < 3.0 ? 'Adequate but monitor.' : 'Comfortable.'}`,
      reference: 'ISA 570.A3, FRS 102 Section 11',
    });
    if (interestCover < 1.5) score += 20;
  }

  // 5. Overdue tax liabilities
  if (hasOverdueTaxLiabilities) {
    indicators.push({
      name: 'Overdue tax liabilities',
      triggered: true,
      severity: 'critical',
      description: 'Overdue HMRC liabilities detected. This is a significant going concern indicator and damages credit rating.',
      reference: 'ISA 570.A3, Insolvency Act 1986 s123',
    });
    score += 25;
  }

  // 6. Loan covenant breach
  if (hasBreachedLoanCovenants) {
    indicators.push({
      name: 'Loan covenant breach',
      triggered: true,
      severity: 'critical',
      description: 'Loan covenants breached. Lender may recall the facility.',
      reference: 'ISA 570.A3, FRS 102 Section 11.19',
    });
    score += 20;
  }

  // 7. Gearing ratio
  const gearing = totalLiabilities > 0 && netWorth > 0 ? (totalLiabilities / netWorth) * 100 : 0;
  if (netWorth > 0) {
    indicators.push({
      name: 'Gearing ratio',
      triggered: gearing > 100,
      severity: gearing > 200 ? 'critical' : gearing > 100 ? 'warning' : 'info',
      description: `Gearing: ${gearing.toFixed(0)}%. ${gearing > 200 ? 'Very highly geared.' : gearing > 100 ? 'Highly geared.' : gearing > 50 ? 'Moderately geared.' : 'Low gearing.'}`,
      reference: 'FRS 102 Section 11, ICAEW Technical Guidance',
    });
    if (gearing > 100) score += 15;
  }

  // Cap score at 100
  score = Math.min(score, 100);

  let level: GoingConcernAssessment['level'];
  if (score >= 60) level = 'critical';
  else if (score >= 35) level = 'warning';
  else if (score >= 15) level = 'watch';
  else level = 'healthy';

  return { score, level, indicators };
}

// ---- VAT Registration Check ----

export function checkVATRegistration(annualTurnover: number): {
  mustRegister: boolean;
  shouldConsiderDeregistration: boolean;
  message: string;
} {
  if (annualTurnover > UK_VAT_THRESHOLD) {
    return {
      mustRegister: true,
      shouldConsiderDeregistration: false,
      message: `Turnover of ${formatGBP(annualTurnover)} exceeds the VAT registration threshold of ${formatGBP(UK_VAT_THRESHOLD)}. VAT registration is mandatory.`,
    };
  }

  if (annualTurnover < UK_VAT_DEREGISTRATION_THRESHOLD) {
    return {
      mustRegister: false,
      shouldConsiderDeregistration: true,
      message: `Turnover of ${formatGBP(annualTurnover)} is below the VAT deregistration threshold of ${formatGBP(UK_VAT_DEREGISTRATION_THRESHOLD)}. Consider whether voluntary registration is beneficial.`,
    };
  }

  return {
    mustRegister: false,
    shouldConsiderDeregistration: false,
    message: `Turnover of ${formatGBP(annualTurnover)} is between deregistration (${formatGBP(UK_VAT_DEREGISTRATION_THRESHOLD)}) and registration (${formatGBP(UK_VAT_THRESHOLD)}) thresholds. Monitor closely.`,
  };
}

// ---- Corporation Tax Calculator (with marginal relief) ----

export function calculateCorporationTax(taxableProfit: number, associatedCompanies: number = 0): {
  taxDue: number;
  effectiveRate: number;
  band: 'small_profits' | 'marginal_relief' | 'main_rate';
  breakdown: string;
} {
  if (taxableProfit <= 0) {
    return { taxDue: 0, effectiveRate: 0, band: 'small_profits', breakdown: 'No taxable profit - no corporation tax due.' };
  }

  const divisor = 1 + associatedCompanies;
  const adjustedSmallLimit = UK_CORPORATION_TAX.smallProfitsLimit / divisor;
  const adjustedUpperLimit = UK_CORPORATION_TAX.upperLimit / divisor;

  if (taxableProfit <= adjustedSmallLimit) {
    const tax = taxableProfit * UK_CORPORATION_TAX.smallProfitsRate;
    return {
      taxDue: Math.round(tax * 100) / 100,
      effectiveRate: UK_CORPORATION_TAX.smallProfitsRate,
      band: 'small_profits',
      breakdown: `Small profits rate: ${formatGBP(taxableProfit)} x 19% = ${formatGBP(tax)}`,
    };
  }

  if (taxableProfit >= adjustedUpperLimit) {
    const tax = taxableProfit * UK_CORPORATION_TAX.mainRate;
    return {
      taxDue: Math.round(tax * 100) / 100,
      effectiveRate: UK_CORPORATION_TAX.mainRate,
      band: 'main_rate',
      breakdown: `Main rate: ${formatGBP(taxableProfit)} x 25% = ${formatGBP(tax)}`,
    };
  }

  // Marginal relief band
  const mainTax = taxableProfit * UK_CORPORATION_TAX.mainRate;
  const marginalRelief = UK_CORPORATION_TAX.marginalReliefFraction * (adjustedUpperLimit - taxableProfit);
  const tax = mainTax - marginalRelief;
  const effectiveRate = tax / taxableProfit;

  return {
    taxDue: Math.round(tax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    band: 'marginal_relief',
    breakdown: `Main rate tax: ${formatGBP(mainTax)} minus marginal relief: ${formatGBP(marginalRelief)} = ${formatGBP(tax)} (effective rate: ${(effectiveRate * 100).toFixed(1)}%)`,
  };
}

// ---- Helpers ----

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}
