/**
 * Shared Finance Costs utility.
 *
 * Interest expenses appear only on bank transactions in Xero, which are
 * excluded from normalised_financials to prevent double-counting (Lesson 10).
 * Instead, we derive monthly interest from `debt_facilities.annual_interest_amount`.
 *
 * This module is the SINGLE SOURCE OF TRUTH for finance cost injection across
 * every page that shows net profit or P&L figures. If you need finance costs
 * on a page, call `fetchFinanceCosts(orgId)` — do NOT duplicate the query.
 *
 * Skill references:
 *  - account-completeness-audit.md: Finance Costs > 0 when debt_facilities > 0
 *  - cross-page-consistency.md: Net Profit = Revenue - COGS - OpEx - Finance Costs
 *  - business-model-validation.md: P&L without finance costs is WRONG for indebted businesses
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';

export interface DebtFacility {
  name: string;
  annual_interest_amount: number | null;
  monthly_repayment: number | null;
  outstanding_balance: number | null;
  status: string;
}

export interface FinanceCostsResult {
  /** Total monthly interest across all active facilities */
  totalMonthlyInterest: number;
  /** Total annual interest */
  totalAnnualInterest: number;
  /** Individual active debt facilities */
  facilities: DebtFacility[];
  /** Whether this business has any active debt */
  hasDebt: boolean;
}

/**
 * Fetch finance costs from debt_facilities for an organisation.
 * Call this in EVERY server component that computes or passes net profit.
 */
export async function fetchFinanceCosts(orgId: string): Promise<FinanceCostsResult> {
  const svc = await createUntypedServiceClient();

  const { data } = await svc
    .from('debt_facilities')
    .select('name, annual_interest_amount, monthly_repayment, outstanding_balance, status')
    .eq('org_id', orgId)
    .eq('status', 'active');

  const facilities = (data ?? []) as DebtFacility[];

  const totalAnnualInterest = facilities.reduce((sum, d) => {
    return sum + (d.annual_interest_amount ?? 0);
  }, 0);

  const totalMonthlyInterest = totalAnnualInterest / 12;

  return {
    totalMonthlyInterest,
    totalAnnualInterest,
    facilities,
    hasDebt: facilities.length > 0,
  };
}

/**
 * Adjust a P&L summary's net profit to include finance costs.
 * Use this after buildPnL/buildSemanticPnL to get correct net profit.
 *
 * @returns The adjusted net profit (original minus monthly interest)
 */
export function adjustNetProfitForFinanceCosts(
  netProfitBeforeFinanceCosts: number,
  financeCosts: FinanceCostsResult
): number {
  if (financeCosts.totalMonthlyInterest <= 0) return netProfitBeforeFinanceCosts;
  return netProfitBeforeFinanceCosts - financeCosts.totalMonthlyInterest;
}

/**
 * Build a Finance Costs section for injection into P&L period data.
 * Returns null if no finance costs exist.
 */
export function buildFinanceCostsSection(financeCosts: FinanceCostsResult) {
  if (financeCosts.totalMonthlyInterest <= 0) return null;

  return {
    label: 'Finance Costs',
    class: 'FINANCE_COSTS',
    total: financeCosts.totalMonthlyInterest,
    rows: financeCosts.facilities
      .filter((d) => d.annual_interest_amount && d.annual_interest_amount > 0)
      .map((d) => ({
        id: undefined as string | undefined,
        name: `${d.name} - Interest`,
        code: 'DEBT',
        amount: (d.annual_interest_amount ?? 0) / 12,
      })),
  };
}
