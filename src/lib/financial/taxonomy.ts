/**
 * Universal Financial Taxonomy
 *
 * Single source of truth for all account category definitions.
 * Every account in the system maps to exactly one StandardCategory.
 *
 * Used by:
 *  - Auto-mapper (Claude AI suggestions)
 *  - Manual mapping confirmation UI
 *  - P&L aggregation (sub-category breakdown)
 *  - KPI engine (metric extraction)
 *  - Data health checks (categorisation quality)
 *  - Claude API prompts (Company Skill context)
 */

// ─── Standard Categories ────────────────────────────────────────────

export const STANDARD_CATEGORIES = [
  // P&L: Revenue
  'revenue',
  'other_income',
  // P&L: Direct Costs
  'cost_of_sales',
  // P&L: Operating Expenses
  'employee_costs',
  'rent_and_occupancy',
  'marketing_and_advertising',
  'technology_and_software',
  'professional_fees',
  'travel_and_entertainment',
  'depreciation_and_amortisation',
  'interest_and_finance',
  'insurance',
  'utilities',
  'office_and_admin',
  'other_expense',
  // P&L: Tax
  'tax',
  // Balance Sheet: Assets
  'bank_and_cash',
  'accounts_receivable',
  'fixed_assets',
  'other_current_asset',
  'other_non_current_asset',
  // Balance Sheet: Liabilities
  'accounts_payable',
  'other_current_liability',
  'other_non_current_liability',
  // Balance Sheet: Equity
  'equity',
] as const;

export type StandardCategory = (typeof STANDARD_CATEGORIES)[number];

// ─── Category Metadata ──────────────────────────────────────────────

export type PnLSection = 'revenue' | 'cost_of_sales' | 'operating_expenses' | 'finance_costs' | 'other_income' | 'tax' | 'balance_sheet';

export interface CategoryMeta {
  /** Human-readable label */
  label: string;
  /** Which P&L section this falls into */
  pnlSection: PnLSection;
  /** Which Xero account classes typically map here */
  xeroClasses: string[];
  /** Does this affect gross margin? (revenue + COGS only) */
  affectsGrossMargin: boolean;
  /** Is this a staff/people cost? */
  isStaffRelated: boolean;
  /** Is this a discretionary (cuttable) cost? */
  isDiscretionary: boolean;
  /** Short description for UI tooltips and AI prompts */
  description: string;
}

export const CATEGORY_META: Record<StandardCategory, CategoryMeta> = {
  // Revenue
  revenue: {
    label: 'Revenue',
    pnlSection: 'revenue',
    xeroClasses: ['REVENUE'],
    affectsGrossMargin: true,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Core trading income from products or services',
  },
  other_income: {
    label: 'Other Income',
    pnlSection: 'other_income',
    xeroClasses: ['REVENUE', 'OTHERINCOME'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Non-trading income: interest, grants, asset disposals',
  },

  // Direct Costs
  cost_of_sales: {
    label: 'Cost of Sales',
    pnlSection: 'cost_of_sales',
    xeroClasses: ['DIRECTCOSTS'],
    affectsGrossMargin: true,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Direct costs of delivering products or services (materials, subcontractors, direct labour)',
  },

  // Operating Expenses
  employee_costs: {
    label: 'Employee Costs',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: true,
    isDiscretionary: false,
    description: 'Salaries, wages, pensions, employer NI, benefits',
  },
  rent_and_occupancy: {
    label: 'Rent & Occupancy',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Rent, rates, utilities directly tied to premises',
  },
  marketing_and_advertising: {
    label: 'Marketing & Advertising',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: true,
    description: 'Advertising, PR, content, events, sponsorship',
  },
  technology_and_software: {
    label: 'Technology & Software',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: true,
    description: 'SaaS subscriptions, hosting, IT support, hardware',
  },
  professional_fees: {
    label: 'Professional Fees',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: true,
    description: 'Legal, accounting, consulting, advisory fees',
  },
  travel_and_entertainment: {
    label: 'Travel & Entertainment',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: true,
    description: 'Business travel, accommodation, meals, client entertainment',
  },
  depreciation_and_amortisation: {
    label: 'Depreciation & Amortisation',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Non-cash charges for asset value reduction',
  },
  interest_and_finance: {
    label: 'Interest & Finance Costs',
    pnlSection: 'finance_costs',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Loan interest, bank charges, finance costs — shown below operating profit per UK management accounts convention',
  },
  insurance: {
    label: 'Insurance',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Business, professional indemnity, property insurance',
  },
  utilities: {
    label: 'Utilities',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Electricity, gas, water, telecoms',
  },
  office_and_admin: {
    label: 'Office & Admin',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: true,
    description: 'Stationery, postage, printing, general admin',
  },
  other_expense: {
    label: 'Other Expenses',
    pnlSection: 'operating_expenses',
    xeroClasses: ['EXPENSE', 'OVERHEADS'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Expenses that don\'t fit other categories',
  },

  // Tax
  tax: {
    label: 'Tax',
    pnlSection: 'tax',
    xeroClasses: ['EXPENSE'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Corporation tax, income tax provisions',
  },

  // Balance Sheet
  bank_and_cash: {
    label: 'Bank & Cash',
    pnlSection: 'balance_sheet',
    xeroClasses: ['ASSET'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Bank accounts, petty cash, cash equivalents',
  },
  accounts_receivable: {
    label: 'Accounts Receivable',
    pnlSection: 'balance_sheet',
    xeroClasses: ['ASSET'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Trade debtors, money owed to the business',
  },
  fixed_assets: {
    label: 'Fixed Assets',
    pnlSection: 'balance_sheet',
    xeroClasses: ['ASSET'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Property, plant, equipment, vehicles',
  },
  other_current_asset: {
    label: 'Other Current Assets',
    pnlSection: 'balance_sheet',
    xeroClasses: ['ASSET'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Prepayments, deposits, stock, VAT receivable',
  },
  other_non_current_asset: {
    label: 'Other Non-Current Assets',
    pnlSection: 'balance_sheet',
    xeroClasses: ['ASSET'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Long-term investments, intangible assets, goodwill',
  },
  accounts_payable: {
    label: 'Accounts Payable',
    pnlSection: 'balance_sheet',
    xeroClasses: ['LIABILITY'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Trade creditors, money the business owes',
  },
  other_current_liability: {
    label: 'Other Current Liabilities',
    pnlSection: 'balance_sheet',
    xeroClasses: ['LIABILITY'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'VAT payable, PAYE, short-term loans, accruals',
  },
  other_non_current_liability: {
    label: 'Other Non-Current Liabilities',
    pnlSection: 'balance_sheet',
    xeroClasses: ['LIABILITY'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Long-term loans, deferred tax, lease liabilities',
  },
  equity: {
    label: 'Equity',
    pnlSection: 'balance_sheet',
    xeroClasses: ['EQUITY'],
    affectsGrossMargin: false,
    isStaffRelated: false,
    isDiscretionary: false,
    description: 'Share capital, retained earnings, reserves',
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Get the human-readable label for a category */
export function getCategoryLabel(cat: string): string {
  return CATEGORY_META[cat as StandardCategory]?.label ?? cat;
}

/** Get all P&L categories (excluding balance sheet) */
export function getPnLCategories(): StandardCategory[] {
  return STANDARD_CATEGORIES.filter(
    (c) => CATEGORY_META[c].pnlSection !== 'balance_sheet'
  );
}

/** Get all balance sheet categories */
export function getBalanceSheetCategories(): StandardCategory[] {
  return STANDARD_CATEGORIES.filter(
    (c) => CATEGORY_META[c].pnlSection === 'balance_sheet'
  );
}

/** Get categories for a specific P&L section */
export function getCategoriesBySection(section: PnLSection): StandardCategory[] {
  return STANDARD_CATEGORIES.filter(
    (c) => CATEGORY_META[c].pnlSection === section
  );
}

/** Get all discretionary cost categories */
export function getDiscretionaryCosts(): StandardCategory[] {
  return STANDARD_CATEGORIES.filter(
    (c) => CATEGORY_META[c].isDiscretionary
  );
}

/** Get all staff-related cost categories */
export function getStaffCosts(): StandardCategory[] {
  return STANDARD_CATEGORIES.filter(
    (c) => CATEGORY_META[c].isStaffRelated
  );
}

/**
 * Heuristic: map a Xero account class to the best default standard category.
 * Used as a fallback when AI mapping fails or for quick initial classification.
 *
 * NOTE: Prefer `classAndTypeToDefaultCategory` when the account `type` field is
 * available, as Xero may set class=EXPENSE for DIRECTCOSTS-type accounts.
 */
export function classToDefaultCategory(xeroClass: string): StandardCategory {
  switch (xeroClass.toUpperCase()) {
    case 'REVENUE':
      return 'revenue';
    case 'DIRECTCOSTS':
      return 'cost_of_sales';
    case 'EXPENSE':
    case 'OVERHEADS':
      return 'other_expense';
    case 'ASSET':
      return 'other_current_asset';
    case 'LIABILITY':
      return 'other_current_liability';
    case 'EQUITY':
      return 'equity';
    default:
      return 'other_expense';
  }
}

/**
 * Heuristic: map a Xero account using both class AND type fields.
 * In Xero, class is a broad grouping (ASSET, EQUITY, EXPENSE, LIABILITY, REVENUE)
 * while type is more granular (DIRECTCOSTS, OVERHEADS, EXPENSE, BANK, etc.).
 * Accounts with type=DIRECTCOSTS may have class=EXPENSE, so the type field
 * is checked first to correctly classify Cost of Sales accounts.
 */
export function classAndTypeToDefaultCategory(xeroClass: string, xeroType: string): StandardCategory {
  // Type takes precedence for DIRECTCOSTS detection
  if (xeroType.toUpperCase() === 'DIRECTCOSTS') {
    return 'cost_of_sales';
  }
  if (xeroType.toUpperCase() === 'OTHERINCOME') {
    return 'other_income';
  }
  return classToDefaultCategory(xeroClass);
}

/**
 * Generate a taxonomy summary string for Claude API prompts.
 * Includes category names, sections, and properties.
 */
export function getTaxonomyPromptContext(): string {
  const lines: string[] = ['Standard Financial Categories:'];

  const sections: PnLSection[] = ['revenue', 'cost_of_sales', 'operating_expenses', 'finance_costs', 'other_income', 'tax', 'balance_sheet'];
  const sectionLabels: Record<PnLSection, string> = {
    revenue: 'Revenue',
    cost_of_sales: 'Cost of Sales',
    operating_expenses: 'Operating Expenses',
    finance_costs: 'Interest Payable',
    other_income: 'Other Income',
    tax: 'Tax',
    balance_sheet: 'Balance Sheet',
  };

  for (const section of sections) {
    const cats = getCategoriesBySection(section);
    if (cats.length === 0) continue;
    lines.push(`\n${sectionLabels[section]}:`);
    for (const cat of cats) {
      const meta = CATEGORY_META[cat];
      const tags: string[] = [];
      if (meta.isStaffRelated) tags.push('staff');
      if (meta.isDiscretionary) tags.push('discretionary');
      if (meta.affectsGrossMargin) tags.push('gross margin');
      const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
      lines.push(`  - ${cat}: ${meta.description}${tagStr}`);
    }
  }

  return lines.join('\n');
}
