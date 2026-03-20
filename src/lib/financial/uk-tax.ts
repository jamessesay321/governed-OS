/**
 * UK Tax Engine — deterministic calculations for UK-specific tax obligations.
 * All financial math is pure TypeScript, no AI involved.
 *
 * From competitive audit: Kevin Steel / Inflectiv Intelligence pattern.
 * Corporation Tax, VAT, PAYE, Employer NI, Employer Pension.
 */

import type { TaxSettings } from '@/types';

/**
 * Calculate Corporation Tax for a given Profit Before Tax.
 * DETERMINISTIC — pure function.
 */
export function calculateCorporationTax(
  profitBeforeTax: number,
  taxRate: number = 0.25
): number {
  if (profitBeforeTax <= 0) return 0;
  return roundCurrency(profitBeforeTax * taxRate);
}

/**
 * Calculate Profit After Tax.
 * DETERMINISTIC — pure function.
 */
export function calculatePAT(
  profitBeforeTax: number,
  taxRate: number = 0.25
): number {
  const tax = calculateCorporationTax(profitBeforeTax, taxRate);
  return roundCurrency(profitBeforeTax - tax);
}

/**
 * Calculate Employer NI for a given annual gross salary.
 * DETERMINISTIC — pure function.
 *
 * Employer NI = (grossSalary - niThreshold) * employerNIRate
 * Only applies to salary above the threshold.
 */
export function calculateEmployerNI(
  annualGrossSalary: number,
  settings: Pick<TaxSettings, 'employer_ni_rate' | 'employer_ni_threshold'>
): number {
  const { employer_ni_rate, employer_ni_threshold } = settings;
  const taxableAmount = Math.max(0, annualGrossSalary - employer_ni_threshold);
  return roundCurrency(taxableAmount * employer_ni_rate);
}

/**
 * Calculate Employer Pension contribution for a given annual gross salary.
 * DETERMINISTIC — pure function.
 */
export function calculateEmployerPension(
  annualGrossSalary: number,
  pensionRate: number = 0.03
): number {
  return roundCurrency(annualGrossSalary * pensionRate);
}

/**
 * Calculate fully loaded staff cost (salary + employer NI + employer pension).
 * DETERMINISTIC — pure function.
 */
export function calculateFullyLoadedCost(
  annualGrossSalary: number,
  settings: Pick<TaxSettings, 'employer_ni_rate' | 'employer_ni_threshold' | 'employer_pension_rate'>
): {
  salary: number;
  employerNI: number;
  employerPension: number;
  totalCost: number;
  monthlyTotal: number;
} {
  const employerNI = calculateEmployerNI(annualGrossSalary, settings);
  const employerPension = calculateEmployerPension(annualGrossSalary, settings.employer_pension_rate);
  const totalCost = roundCurrency(annualGrossSalary + employerNI + employerPension);

  return {
    salary: annualGrossSalary,
    employerNI,
    employerPension,
    totalCost,
    monthlyTotal: roundCurrency(totalCost / 12),
  };
}

/**
 * Calculate VAT liability for a period.
 * DETERMINISTIC — pure function.
 *
 * Standard scheme: Output VAT - Input VAT
 * Flat rate scheme: Revenue * flatRate
 */
export function calculateVATLiability(
  revenue: number,
  inputVAT: number,
  settings: Pick<TaxSettings, 'vat_scheme' | 'vat_rate' | 'vat_flat_rate'>
): number {
  if (settings.vat_scheme === 'flat_rate' && settings.vat_flat_rate) {
    return roundCurrency(revenue * settings.vat_flat_rate);
  }
  // Standard scheme: Output VAT - Input VAT
  const outputVAT = roundCurrency(revenue * settings.vat_rate);
  return roundCurrency(outputVAT - inputVAT);
}

/**
 * Calculate HMRC payment plan remaining balance after a monthly payment.
 * DETERMINISTIC — pure function.
 */
export function calculatePaymentPlanBalance(
  currentBalance: number,
  monthlyPayment: number
): number {
  return Math.max(0, roundCurrency(currentBalance - monthlyPayment));
}

/**
 * Get the VAT settlement months for a given quarter start month.
 * Returns the 4 months in the year when VAT is due.
 */
export function getVATSettlementMonths(quarterStartMonth: number): number[] {
  const months: number[] = [];
  for (let i = 0; i < 4; i++) {
    // VAT is due 1 month + 7 days after quarter end
    // Quarter ends 3 months after start
    const quarterEnd = ((quarterStartMonth - 1 + (i + 1) * 3) % 12) + 1;
    months.push(quarterEnd);
  }
  return months;
}

/**
 * Get default UK tax settings.
 */
export function getDefaultTaxSettings(): Omit<TaxSettings, 'id' | 'org_id' | 'created_at' | 'updated_at'> {
  return {
    corporation_tax_rate: 0.25,
    vat_registered: false,
    vat_rate: 0.20,
    vat_flat_rate: null,
    vat_quarter_start_month: 1,
    vat_scheme: 'standard',
    paye_rate: 0.20,
    employee_ni_rate: 0.08,
    employer_ni_rate: 0.138,
    employer_ni_threshold: 9100,
    employer_pension_rate: 0.03,
    has_vat_payment_plan: false,
    vat_payment_plan_balance: 0,
    vat_payment_plan_monthly: 0,
    has_corp_tax_payment_plan: false,
    corp_tax_payment_plan_balance: 0,
    corp_tax_payment_plan_monthly: 0,
    has_paye_payment_plan: false,
    paye_payment_plan_balance: 0,
    paye_payment_plan_monthly: 0,
  };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
