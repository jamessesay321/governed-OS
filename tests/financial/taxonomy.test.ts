import { describe, it, expect } from 'vitest';
import {
  STANDARD_CATEGORIES,
  CATEGORY_META,
  getCategoryLabel,
  getPnLCategories,
  getBalanceSheetCategories,
  getCategoriesBySection,
  getDiscretionaryCosts,
  getStaffCosts,
  classToDefaultCategory,
  classAndTypeToDefaultCategory,
  getTaxonomyPromptContext,
  type StandardCategory,
  type PnLSection,
} from '@/lib/financial/taxonomy';

// ---------------------------------------------------------------------------
// STANDARD_CATEGORIES
// ---------------------------------------------------------------------------

describe('STANDARD_CATEGORIES', () => {
  it('contains 25 categories', () => {
    expect(STANDARD_CATEGORIES).toHaveLength(25);
  });

  it('has no duplicate entries', () => {
    const unique = new Set(STANDARD_CATEGORIES);
    expect(unique.size).toBe(STANDARD_CATEGORIES.length);
  });

  it('includes core P&L categories', () => {
    expect(STANDARD_CATEGORIES).toContain('revenue');
    expect(STANDARD_CATEGORIES).toContain('cost_of_sales');
    expect(STANDARD_CATEGORIES).toContain('employee_costs');
    expect(STANDARD_CATEGORIES).toContain('other_expense');
  });

  it('includes balance sheet categories', () => {
    expect(STANDARD_CATEGORIES).toContain('bank_and_cash');
    expect(STANDARD_CATEGORIES).toContain('accounts_receivable');
    expect(STANDARD_CATEGORIES).toContain('accounts_payable');
    expect(STANDARD_CATEGORIES).toContain('fixed_assets');
    expect(STANDARD_CATEGORIES).toContain('equity');
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_META
// ---------------------------------------------------------------------------

describe('CATEGORY_META', () => {
  it('has metadata for every standard category', () => {
    for (const cat of STANDARD_CATEGORIES) {
      const meta = CATEGORY_META[cat];
      expect(meta, `Missing meta for ${cat}`).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.pnlSection).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(typeof meta.affectsGrossMargin).toBe('boolean');
      expect(typeof meta.isStaffRelated).toBe('boolean');
      expect(typeof meta.isDiscretionary).toBe('boolean');
    }
  });

  it('revenue category has correct metadata', () => {
    const meta = CATEGORY_META['revenue'];
    expect(meta.label).toBe('Revenue');
    expect(meta.pnlSection).toBe('revenue');
    expect(meta.affectsGrossMargin).toBe(true);
    expect(meta.isStaffRelated).toBe(false);
    expect(meta.isDiscretionary).toBe(false);
    expect(meta.xeroClasses).toContain('REVENUE');
  });

  it('employee_costs is staff-related', () => {
    expect(CATEGORY_META['employee_costs'].isStaffRelated).toBe(true);
  });

  it('marketing_and_advertising is discretionary', () => {
    expect(CATEGORY_META['marketing_and_advertising'].isDiscretionary).toBe(true);
  });

  it('cost_of_sales affects gross margin', () => {
    expect(CATEGORY_META['cost_of_sales'].affectsGrossMargin).toBe(true);
  });

  it('balance sheet categories have correct section', () => {
    expect(CATEGORY_META['bank_and_cash'].pnlSection).toBe('balance_sheet');
    expect(CATEGORY_META['accounts_receivable'].pnlSection).toBe('balance_sheet');
    expect(CATEGORY_META['equity'].pnlSection).toBe('balance_sheet');
  });
});

// ---------------------------------------------------------------------------
// getCategoryLabel
// ---------------------------------------------------------------------------

describe('getCategoryLabel', () => {
  it('returns label for valid categories', () => {
    expect(getCategoryLabel('revenue')).toBe('Revenue');
    expect(getCategoryLabel('employee_costs')).toBe('Employee Costs');
    expect(getCategoryLabel('technology_and_software')).toBe('Technology & Software');
  });

  it('returns the key itself for unknown categories', () => {
    expect(getCategoryLabel('nonexistent_category')).toBe('nonexistent_category');
  });
});

// ---------------------------------------------------------------------------
// Section filters
// ---------------------------------------------------------------------------

describe('getPnLCategories', () => {
  it('returns only P&L categories (excludes balance sheet)', () => {
    const pnlCats = getPnLCategories();
    for (const cat of pnlCats) {
      expect(CATEGORY_META[cat].pnlSection).not.toBe('balance_sheet');
    }
  });

  it('includes revenue, cost_of_sales, employee_costs', () => {
    const pnlCats = getPnLCategories();
    expect(pnlCats).toContain('revenue');
    expect(pnlCats).toContain('cost_of_sales');
    expect(pnlCats).toContain('employee_costs');
  });

  it('excludes bank_and_cash and equity', () => {
    const pnlCats = getPnLCategories();
    expect(pnlCats).not.toContain('bank_and_cash');
    expect(pnlCats).not.toContain('equity');
  });
});

describe('getBalanceSheetCategories', () => {
  it('returns only balance sheet categories', () => {
    const bsCats = getBalanceSheetCategories();
    for (const cat of bsCats) {
      expect(CATEGORY_META[cat].pnlSection).toBe('balance_sheet');
    }
  });

  it('includes bank_and_cash, accounts_receivable, equity', () => {
    const bsCats = getBalanceSheetCategories();
    expect(bsCats).toContain('bank_and_cash');
    expect(bsCats).toContain('accounts_receivable');
    expect(bsCats).toContain('equity');
  });
});

describe('getCategoriesBySection', () => {
  it('returns revenue categories', () => {
    const cats = getCategoriesBySection('revenue');
    expect(cats).toContain('revenue');
    for (const cat of cats) {
      expect(CATEGORY_META[cat].pnlSection).toBe('revenue');
    }
  });

  it('returns operating_expenses categories', () => {
    const cats = getCategoriesBySection('operating_expenses');
    expect(cats.length).toBeGreaterThan(5);
    expect(cats).toContain('employee_costs');
    expect(cats).toContain('rent_and_occupancy');
    expect(cats).toContain('marketing_and_advertising');
    for (const cat of cats) {
      expect(CATEGORY_META[cat].pnlSection).toBe('operating_expenses');
    }
  });

  it('returns empty for invalid section', () => {
    const cats = getCategoriesBySection('nonexistent' as PnLSection);
    expect(cats).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cost filters
// ---------------------------------------------------------------------------

describe('getDiscretionaryCosts', () => {
  it('returns only discretionary categories', () => {
    const cats = getDiscretionaryCosts();
    for (const cat of cats) {
      expect(CATEGORY_META[cat].isDiscretionary).toBe(true);
    }
  });

  it('includes marketing and travel', () => {
    const cats = getDiscretionaryCosts();
    expect(cats).toContain('marketing_and_advertising');
    expect(cats).toContain('travel_and_entertainment');
  });

  it('excludes employee_costs (not discretionary)', () => {
    const cats = getDiscretionaryCosts();
    expect(cats).not.toContain('employee_costs');
  });
});

describe('getStaffCosts', () => {
  it('returns only staff-related categories', () => {
    const cats = getStaffCosts();
    for (const cat of cats) {
      expect(CATEGORY_META[cat].isStaffRelated).toBe(true);
    }
  });

  it('includes employee_costs', () => {
    expect(getStaffCosts()).toContain('employee_costs');
  });
});

// ---------------------------------------------------------------------------
// classToDefaultCategory
// ---------------------------------------------------------------------------

describe('classToDefaultCategory', () => {
  it('maps REVENUE to revenue', () => {
    expect(classToDefaultCategory('REVENUE')).toBe('revenue');
  });

  it('maps DIRECTCOSTS to cost_of_sales', () => {
    expect(classToDefaultCategory('DIRECTCOSTS')).toBe('cost_of_sales');
  });

  it('maps EXPENSE to other_expense', () => {
    expect(classToDefaultCategory('EXPENSE')).toBe('other_expense');
  });

  it('maps OVERHEADS to other_expense', () => {
    expect(classToDefaultCategory('OVERHEADS')).toBe('other_expense');
  });

  it('maps ASSET to other_current_asset', () => {
    expect(classToDefaultCategory('ASSET')).toBe('other_current_asset');
  });

  it('maps LIABILITY to other_current_liability', () => {
    expect(classToDefaultCategory('LIABILITY')).toBe('other_current_liability');
  });

  it('maps EQUITY to equity', () => {
    expect(classToDefaultCategory('EQUITY')).toBe('equity');
  });

  it('is case-insensitive', () => {
    expect(classToDefaultCategory('revenue')).toBe('revenue');
    expect(classToDefaultCategory('Revenue')).toBe('revenue');
    expect(classToDefaultCategory('directcosts')).toBe('cost_of_sales');
  });

  it('returns other_expense for unknown classes', () => {
    expect(classToDefaultCategory('UNKNOWN')).toBe('other_expense');
    expect(classToDefaultCategory('')).toBe('other_expense');
  });
});

// ---------------------------------------------------------------------------
// classAndTypeToDefaultCategory
// ---------------------------------------------------------------------------

describe('classAndTypeToDefaultCategory', () => {
  it('routes EXPENSE-class + DIRECTCOSTS-type to cost_of_sales', () => {
    expect(classAndTypeToDefaultCategory('EXPENSE', 'DIRECTCOSTS')).toBe('cost_of_sales');
  });

  it('routes DIRECTCOSTS-class + DIRECTCOSTS-type to cost_of_sales', () => {
    expect(classAndTypeToDefaultCategory('DIRECTCOSTS', 'DIRECTCOSTS')).toBe('cost_of_sales');
  });

  it('routes REVENUE-class + OTHERINCOME-type to other_income', () => {
    expect(classAndTypeToDefaultCategory('REVENUE', 'OTHERINCOME')).toBe('other_income');
  });

  it('falls back to class-based mapping when type is generic EXPENSE', () => {
    expect(classAndTypeToDefaultCategory('EXPENSE', 'EXPENSE')).toBe('other_expense');
  });

  it('falls back to class-based mapping for REVENUE/REVENUE', () => {
    expect(classAndTypeToDefaultCategory('REVENUE', 'REVENUE')).toBe('revenue');
  });

  it('is case-insensitive', () => {
    expect(classAndTypeToDefaultCategory('expense', 'directcosts')).toBe('cost_of_sales');
    expect(classAndTypeToDefaultCategory('Expense', 'DirectCosts')).toBe('cost_of_sales');
  });
});

// ---------------------------------------------------------------------------
// getTaxonomyPromptContext
// ---------------------------------------------------------------------------

describe('getTaxonomyPromptContext', () => {
  it('returns a non-empty string', () => {
    const ctx = getTaxonomyPromptContext();
    expect(ctx.length).toBeGreaterThan(100);
  });

  it('includes category keys and labels', () => {
    const ctx = getTaxonomyPromptContext();
    expect(ctx).toContain('revenue');
    expect(ctx).toContain('Revenue');
    expect(ctx).toContain('employee_costs');
    // The prompt uses human-readable section headers, not raw keys
  });

  it('includes P&L section headers', () => {
    const ctx = getTaxonomyPromptContext();
    expect(ctx).toContain('Operating Expenses');
    expect(ctx).toContain('Balance Sheet');
    expect(ctx).toContain('Cost of Sales');
  });
});
