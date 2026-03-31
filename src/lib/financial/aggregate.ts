import type { NormalisedFinancial, ChartOfAccount } from '@/types';

// P&L account class hierarchy
const PNL_SECTIONS = ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'] as const;

export interface PnLRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountClass: string;
  amount: number;
  transactionCount: number;
}

export interface PnLSection {
  label: string;
  class: string;
  rows: PnLRow[];
  total: number;
}

export interface PnLSummary {
  sections: PnLSection[];
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  period: string;
}

/**
 * Build a P&L summary for a given period.
 * DETERMINISTIC — pure function, no side effects.
 */
export function buildPnL(
  financials: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  period: string
): PnLSummary {
  // Filter to requested period
  const periodData = financials.filter((f) => f.period === period);

  // Build account lookup
  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  // Group by account class
  const sectionMap = new Map<string, PnLRow[]>();
  for (const section of PNL_SECTIONS) {
    sectionMap.set(section, []);
  }

  for (const fin of periodData) {
    const account = accountMap.get(fin.account_id);
    if (!account) continue;

    const classKey = account.class.toUpperCase();
    const rows = sectionMap.get(classKey);
    if (!rows) continue; // Skip non-P&L accounts (assets, liabilities, equity)

    rows.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      accountClass: account.class,
      amount: Number(fin.amount),
      transactionCount: fin.transaction_count,
    });
  }

  // Build sections
  const sectionLabels: Record<string, string> = {
    REVENUE: 'Revenue',
    DIRECTCOSTS: 'Cost of Sales',
    EXPENSE: 'Operating Expenses',
    OVERHEADS: 'Overheads',
  };

  const sections: PnLSection[] = PNL_SECTIONS.map((cls) => {
    const rows = sectionMap.get(cls) || [];
    return {
      label: sectionLabels[cls] || cls,
      class: cls,
      rows: rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      total: sumAmounts(rows.map((r) => r.amount)),
    };
  });

  // Xero stores costs/expenses as NEGATIVE amounts (debit convention).
  // Normalise to positive values for intuitive P&L summary fields.
  // Revenue is already positive. CostOfSales/Expenses/Overheads stored
  // as negative by Xero — take absolute values so downstream consumers
  // can use simple subtraction: grossProfit = revenue - costOfSales.
  const revenue = sections.find((s) => s.class === 'REVENUE')?.total || 0;
  const costOfSales = Math.abs(
    sections.find((s) => s.class === 'DIRECTCOSTS')?.total || 0
  );
  const expenses = Math.abs(
    sections.find((s) => s.class === 'EXPENSE')?.total || 0
  );
  const overheads = Math.abs(
    sections.find((s) => s.class === 'OVERHEADS')?.total || 0
  );

  return {
    sections,
    revenue,
    costOfSales,
    grossProfit: revenue - costOfSales,
    expenses: expenses + overheads,
    netProfit: revenue - costOfSales - expenses - overheads,
    period,
  };
}

/**
 * Get unique periods from normalised financials, sorted descending.
 */
export function getAvailablePeriods(financials: NormalisedFinancial[]): string[] {
  const periods = new Set(financials.map((f) => f.period));
  return Array.from(periods).sort().reverse();
}

/**
 * Sum an array of amounts with currency-safe rounding.
 */
export function sumAmounts(amounts: number[]): number {
  const sum = amounts.reduce((acc, val) => acc + val, 0);
  return Math.round((sum + Number.EPSILON) * 100) / 100;
}
