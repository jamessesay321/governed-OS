import type { NormalisedFinancial, ChartOfAccount, AccountMapping } from '@/types';
import {
  CATEGORY_META,
  type StandardCategory,
  type PnLSection as TaxonomyPnLSection,
} from '@/lib/financial/taxonomy';

// P&L account class hierarchy (legacy class-based grouping)
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

    // Xero's `class` groups into broad categories (ASSET, EQUITY, EXPENSE,
    // LIABILITY, REVENUE).  The `type` field is more granular and, critically,
    // accounts whose type is DIRECTCOSTS may have class=EXPENSE.  We must use
    // the type to correctly route direct-cost accounts into the Cost of Sales
    // section instead of Operating Expenses.
    const typeUpper = account.type.toUpperCase();
    const classKey = typeUpper === 'DIRECTCOSTS'
      ? 'DIRECTCOSTS'
      : account.class.toUpperCase();
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
  const revenue = (sections.find((s) => s.class === 'REVENUE')?.total || 0) +
    (sections.find((s) => s.class === 'OTHERINCOME')?.total || 0);
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

// ---------------------------------------------------------------------------
// Semantic-mapping-aware P&L (Phase B)
// ---------------------------------------------------------------------------

export interface SemanticPnLRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  standardCategory: StandardCategory;
  categoryLabel: string;
  amount: number;
  transactionCount: number;
}

export interface SemanticPnLSection {
  /** Taxonomy section key (revenue, cost_of_sales, operating_expenses, etc.) */
  section: TaxonomyPnLSection;
  label: string;
  rows: SemanticPnLRow[];
  total: number;
}

export interface SemanticPnLSummary {
  sections: SemanticPnLSection[];
  revenue: number;
  otherIncome: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  tax: number;
  netProfit: number;
  period: string;
  /** % of accounts with semantic mappings (0-1) */
  mappingCoverage: number;
}

const SECTION_LABELS: Record<TaxonomyPnLSection, string> = {
  revenue: 'Revenue',
  cost_of_sales: 'Cost of Sales',
  operating_expenses: 'Operating Expenses',
  other_income: 'Other Income',
  tax: 'Tax',
  balance_sheet: 'Balance Sheet',
};

/**
 * Build a semantic P&L using account_mappings for sub-category grouping.
 * Falls back to class-based heuristic for unmapped accounts.
 * DETERMINISTIC - pure function, no side effects.
 */
export function buildSemanticPnL(
  financials: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  mappings: AccountMapping[],
  period: string
): SemanticPnLSummary {
  const periodData = financials.filter((f) => f.period === period);

  // Build lookups
  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  const mappingByAccountId = new Map<string, AccountMapping>();
  for (const m of mappings) {
    mappingByAccountId.set(m.account_id, m);
  }

  // Group rows by taxonomy section
  const sectionRows = new Map<TaxonomyPnLSection, SemanticPnLRow[]>();
  const pnlSections: TaxonomyPnLSection[] = ['revenue', 'other_income', 'cost_of_sales', 'operating_expenses', 'tax'];
  for (const section of pnlSections) {
    sectionRows.set(section, []);
  }

  let mappedCount = 0;
  let totalPnLAccounts = 0;

  for (const fin of periodData) {
    const account = accountMap.get(fin.account_id);
    if (!account) continue;

    // Skip balance sheet accounts from P&L
    const classUpper = account.class.toUpperCase();
    if (['ASSET', 'LIABILITY', 'EQUITY'].includes(classUpper)) continue;

    totalPnLAccounts++;

    const mapping = mappingByAccountId.get(fin.account_id);
    let category: StandardCategory;

    if (mapping) {
      category = mapping.standard_category as StandardCategory;
      mappedCount++;
    } else {
      // Fallback: derive from Xero class/type.
      // The Xero type field is more granular than class and must take
      // precedence for DIRECTCOSTS (may have class=EXPENSE) and
      // OTHERINCOME (has class=REVENUE but is non-trading income).
      const typeUpper = account.type.toUpperCase();
      if (typeUpper === 'DIRECTCOSTS') {
        category = 'cost_of_sales';
      } else if (typeUpper === 'OTHERINCOME') {
        category = 'other_income';
      } else {
        switch (classUpper) {
          case 'REVENUE':
            category = 'revenue';
            break;
          case 'DIRECTCOSTS':
            category = 'cost_of_sales';
            break;
          default:
            category = 'other_expense';
        }
      }
    }

    const meta = CATEGORY_META[category];
    if (!meta) continue;

    // Skip balance sheet categories even if mapped there
    if (meta.pnlSection === 'balance_sheet') continue;

    const rows = sectionRows.get(meta.pnlSection);
    if (!rows) continue;

    rows.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      standardCategory: category,
      categoryLabel: meta.label,
      amount: Number(fin.amount),
      transactionCount: fin.transaction_count,
    });
  }

  // Build sections
  const sections: SemanticPnLSection[] = pnlSections.map((section) => {
    const rows = sectionRows.get(section) ?? [];
    return {
      section,
      label: SECTION_LABELS[section],
      rows: rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      total: sumAmounts(rows.map((r) => r.amount)),
    };
  });

  const revenue = sections.find((s) => s.section === 'revenue')?.total ?? 0;
  const otherIncome = sections.find((s) => s.section === 'other_income')?.total ?? 0;
  const costOfSales = Math.abs(sections.find((s) => s.section === 'cost_of_sales')?.total ?? 0);
  const operatingExpenses = Math.abs(sections.find((s) => s.section === 'operating_expenses')?.total ?? 0);
  const tax = Math.abs(sections.find((s) => s.section === 'tax')?.total ?? 0);

  const grossProfit = revenue - costOfSales;
  const operatingProfit = grossProfit + otherIncome - operatingExpenses;
  const netProfit = operatingProfit - tax;

  return {
    sections,
    revenue,
    otherIncome,
    costOfSales,
    grossProfit,
    operatingExpenses,
    operatingProfit,
    tax,
    netProfit,
    period,
    mappingCoverage: totalPnLAccounts > 0 ? mappedCount / totalPnLAccounts : 0,
  };
}
