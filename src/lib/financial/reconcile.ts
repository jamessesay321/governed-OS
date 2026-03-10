import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { sumAmounts } from './aggregate';

export interface ReconciliationItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  normalisedAmount: number;
  xeroAmount: number;
  difference: number;
  matched: boolean;
}

export interface ReconciliationReport {
  period: string;
  items: ReconciliationItem[];
  totalNormalised: number;
  totalXero: number;
  totalDifference: number;
  fullyReconciled: boolean;
  matchedCount: number;
  discrepancyCount: number;
}

/**
 * Compare normalised financial totals against Xero report totals.
 * DETERMINISTIC — pure function, no side effects.
 *
 * @param normalised - Our normalised financials for the period
 * @param xeroTotals - Account-level totals from Xero's reports API (keyed by account code)
 * @param accounts - Chart of accounts for name/code lookup
 * @param period - The period being reconciled (YYYY-MM-01)
 * @param tolerance - Maximum acceptable difference (default: 0.01 for rounding)
 */
export function reconcile(
  normalised: NormalisedFinancial[],
  xeroTotals: Map<string, number>,
  accounts: ChartOfAccount[],
  period: string,
  tolerance = 0.01
): ReconciliationReport {
  const periodData = normalised.filter((f) => f.period === period);

  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  // Build normalised totals by account code
  const normalisedByCode = new Map<string, number>();
  for (const fin of periodData) {
    const account = accountMap.get(fin.account_id);
    if (!account) continue;
    const existing = normalisedByCode.get(account.code) || 0;
    normalisedByCode.set(account.code, existing + Number(fin.amount));
  }

  // Collect all account codes from both sources
  const allCodes = new Set([
    ...normalisedByCode.keys(),
    ...xeroTotals.keys(),
  ]);

  const items: ReconciliationItem[] = [];

  for (const code of allCodes) {
    const normAmount = normalisedByCode.get(code) || 0;
    const xeroAmount = xeroTotals.get(code) || 0;
    const difference = Math.round((normAmount - xeroAmount + Number.EPSILON) * 100) / 100;
    const matched = Math.abs(difference) <= tolerance;

    // Find account details
    const account = accounts.find((a) => a.code === code);

    items.push({
      accountId: account?.id || '',
      accountCode: code,
      accountName: account?.name || `Unknown (${code})`,
      normalisedAmount: normAmount,
      xeroAmount,
      difference,
      matched,
    });
  }

  // Sort by account code
  items.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalNormalised = sumAmounts(items.map((i) => i.normalisedAmount));
  const totalXero = sumAmounts(items.map((i) => i.xeroAmount));
  const totalDifference = Math.round((totalNormalised - totalXero + Number.EPSILON) * 100) / 100;
  const matchedCount = items.filter((i) => i.matched).length;
  const discrepancyCount = items.length - matchedCount;

  return {
    period,
    items,
    totalNormalised,
    totalXero,
    totalDifference,
    fullyReconciled: discrepancyCount === 0,
    matchedCount,
    discrepancyCount,
  };
}
