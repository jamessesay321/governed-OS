import { describe, it, expect } from 'vitest';
import { buildSemanticPnL, sumAmounts } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount, AccountMapping } from '@/types';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockAccounts: ChartOfAccount[] = [
  {
    id: 'acc-sales',
    org_id: 'org-1',
    xero_account_id: 'x1',
    code: '200',
    name: 'Sales Revenue',
    type: 'REVENUE',
    class: 'REVENUE',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-other-rev',
    org_id: 'org-1',
    xero_account_id: 'x2',
    code: '210',
    name: 'Interest Income',
    type: 'REVENUE',
    class: 'REVENUE',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-cogs',
    org_id: 'org-1',
    xero_account_id: 'x3',
    code: '300',
    name: 'Cost of Goods Sold',
    type: 'DIRECTCOSTS',
    class: 'DIRECTCOSTS',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-salaries',
    org_id: 'org-1',
    xero_account_id: 'x4',
    code: '400',
    name: 'Salaries & Wages',
    type: 'EXPENSE',
    class: 'EXPENSE',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-marketing',
    org_id: 'org-1',
    xero_account_id: 'x5',
    code: '500',
    name: 'Advertising Spend',
    type: 'EXPENSE',
    class: 'EXPENSE',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-rent',
    org_id: 'org-1',
    xero_account_id: 'x6',
    code: '600',
    name: 'Office Rent',
    type: 'OVERHEADS',
    class: 'OVERHEADS',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-bank',
    org_id: 'org-1',
    xero_account_id: 'x7',
    code: '090',
    name: 'Current Account',
    type: 'ASSET',
    class: 'ASSET',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
];

const PERIOD = '2024-06-01';

const mockFinancials: NormalisedFinancial[] = [
  { id: 'f1', org_id: 'org-1', period: PERIOD, account_id: 'acc-sales', amount: 100000, transaction_count: 25, source: 'xero', created_at: '', updated_at: '' },
  { id: 'f2', org_id: 'org-1', period: PERIOD, account_id: 'acc-other-rev', amount: 500, transaction_count: 1, source: 'xero', created_at: '', updated_at: '' },
  { id: 'f3', org_id: 'org-1', period: PERIOD, account_id: 'acc-cogs', amount: -40000, transaction_count: 15, source: 'xero', created_at: '', updated_at: '' },
  { id: 'f4', org_id: 'org-1', period: PERIOD, account_id: 'acc-salaries', amount: -25000, transaction_count: 2, source: 'xero', created_at: '', updated_at: '' },
  { id: 'f5', org_id: 'org-1', period: PERIOD, account_id: 'acc-marketing', amount: -8000, transaction_count: 7, source: 'xero', created_at: '', updated_at: '' },
  { id: 'f6', org_id: 'org-1', period: PERIOD, account_id: 'acc-rent', amount: -3000, transaction_count: 1, source: 'xero', created_at: '', updated_at: '' },
  { id: 'f7', org_id: 'org-1', period: PERIOD, account_id: 'acc-bank', amount: 50000, transaction_count: 0, source: 'xero', created_at: '', updated_at: '' },
];

// Full mappings — every P&L account is mapped
const fullMappings: AccountMapping[] = [
  { id: 'm1', org_id: 'org-1', account_id: 'acc-sales', standard_category: 'revenue', ai_confidence: 0.95, ai_suggested: true, user_confirmed: true, user_overridden: false, created_at: '', updated_at: '' },
  { id: 'm2', org_id: 'org-1', account_id: 'acc-other-rev', standard_category: 'other_income', ai_confidence: 0.85, ai_suggested: true, user_confirmed: true, user_overridden: false, created_at: '', updated_at: '' },
  { id: 'm3', org_id: 'org-1', account_id: 'acc-cogs', standard_category: 'cost_of_sales', ai_confidence: 0.98, ai_suggested: true, user_confirmed: true, user_overridden: false, created_at: '', updated_at: '' },
  { id: 'm4', org_id: 'org-1', account_id: 'acc-salaries', standard_category: 'employee_costs', ai_confidence: 0.92, ai_suggested: true, user_confirmed: true, user_overridden: false, created_at: '', updated_at: '' },
  { id: 'm5', org_id: 'org-1', account_id: 'acc-marketing', standard_category: 'marketing_and_advertising', ai_confidence: 0.88, ai_suggested: true, user_confirmed: false, user_overridden: false, created_at: '', updated_at: '' },
  { id: 'm6', org_id: 'org-1', account_id: 'acc-rent', standard_category: 'rent_and_occupancy', ai_confidence: 0.90, ai_suggested: true, user_confirmed: true, user_overridden: false, created_at: '', updated_at: '' },
];

// Partial mappings — only some accounts mapped
const partialMappings: AccountMapping[] = [
  { id: 'm1', org_id: 'org-1', account_id: 'acc-sales', standard_category: 'revenue', ai_confidence: 0.95, ai_suggested: true, user_confirmed: true, user_overridden: false, created_at: '', updated_at: '' },
  { id: 'm3', org_id: 'org-1', account_id: 'acc-cogs', standard_category: 'cost_of_sales', ai_confidence: 0.98, ai_suggested: true, user_confirmed: true, user_overridden: false, created_at: '', updated_at: '' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildSemanticPnL', () => {
  describe('with full mappings', () => {
    it('calculates correct revenue', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      expect(pnl.revenue).toBe(100000);
    });

    it('calculates correct other income', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      expect(pnl.otherIncome).toBe(500);
    });

    it('calculates correct cost of sales (absolute value)', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      expect(pnl.costOfSales).toBe(40000);
    });

    it('calculates correct gross profit', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      expect(pnl.grossProfit).toBe(60000); // 100000 - 40000
    });

    it('calculates correct operating expenses (absolute value)', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      expect(pnl.operatingExpenses).toBe(36000); // |(-25000) + (-8000) + (-3000)|
    });

    it('calculates correct operating profit', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      // grossProfit(60000) + otherIncome(500) - operatingExpenses(36000) = 24500
      expect(pnl.operatingProfit).toBe(24500);
    });

    it('calculates correct net profit', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      // operatingProfit(24500) - tax(0) = 24500
      expect(pnl.netProfit).toBe(24500);
    });

    it('has 100% mapping coverage', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      expect(pnl.mappingCoverage).toBe(1);
    });

    it('excludes balance sheet accounts', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      const allRows = pnl.sections.flatMap((s) => s.rows);
      const bankRow = allRows.find((r) => r.accountId === 'acc-bank');
      expect(bankRow).toBeUndefined();
    });

    it('assigns correct category labels to rows', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      const opexSection = pnl.sections.find((s) => s.section === 'operating_expenses');
      expect(opexSection).toBeDefined();

      const salaryRow = opexSection!.rows.find((r) => r.accountId === 'acc-salaries');
      expect(salaryRow?.categoryLabel).toBe('Employee Costs');
      expect(salaryRow?.standardCategory).toBe('employee_costs');

      const marketingRow = opexSection!.rows.find((r) => r.accountId === 'acc-marketing');
      expect(marketingRow?.categoryLabel).toBe('Marketing & Advertising');
      expect(marketingRow?.standardCategory).toBe('marketing_and_advertising');
    });

    it('has correct section structure', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      const sectionNames = pnl.sections.map((s) => s.section);
      expect(sectionNames).toContain('revenue');
      expect(sectionNames).toContain('other_income');
      expect(sectionNames).toContain('cost_of_sales');
      expect(sectionNames).toContain('operating_expenses');
      expect(sectionNames).toContain('tax');
    });
  });

  describe('with partial mappings (fallback behaviour)', () => {
    it('falls back to class-based categorisation for unmapped accounts', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, partialMappings, PERIOD);
      // Unmapped EXPENSE/OVERHEADS accounts should fall back to 'other_expense'
      const opexSection = pnl.sections.find((s) => s.section === 'operating_expenses');
      expect(opexSection).toBeDefined();
      // All 3 expense accounts should be in operating_expenses (salaries, marketing, rent)
      expect(opexSection!.rows.length).toBe(3);
    });

    it('reports partial mapping coverage', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, partialMappings, PERIOD);
      // 6 P&L accounts, 2 mapped = 2/6 ≈ 0.333
      expect(pnl.mappingCoverage).toBeGreaterThan(0);
      expect(pnl.mappingCoverage).toBeLessThan(1);
    });

    it('still produces correct totals with mixed mapped/unmapped', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, partialMappings, PERIOD);
      // With partial mappings, unmapped REVENUE class accounts fall back to 'revenue'
      // So revenue = Sales(100000) + Interest(500, unmapped REVENUE class → revenue)
      expect(pnl.revenue).toBe(100500);
      expect(pnl.costOfSales).toBe(40000);
      expect(pnl.grossProfit).toBe(60500);
    });
  });

  describe('with no mappings', () => {
    it('falls back entirely to class-based categorisation', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, [], PERIOD);
      // With no mappings, both REVENUE class accounts fall back to 'revenue'
      expect(pnl.revenue).toBe(100500); // Sales(100000) + Interest(500)
      expect(pnl.costOfSales).toBe(40000);
      expect(pnl.mappingCoverage).toBe(0);
    });

    it('puts REVENUE class interest income in revenue section (no other_income mapping)', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, [], PERIOD);
      // With no mappings, REVENUE class accounts default to 'revenue' category
      // Interest income has class REVENUE, so it goes to revenue section
      const revenueSection = pnl.sections.find((s) => s.section === 'revenue');
      expect(revenueSection!.rows.length).toBe(2); // both REVENUE class accounts
    });
  });

  describe('Xero class=EXPENSE type=DIRECTCOSTS accounts (unmapped)', () => {
    // Xero can set class=EXPENSE for accounts whose type=DIRECTCOSTS.
    // Without a mapping, the fallback should use the type field to route
    // these into cost_of_sales rather than other_expense.
    const accountsWithMisclass: ChartOfAccount[] = [
      ...mockAccounts,
      {
        id: 'acc-fabric',
        org_id: 'org-1',
        xero_account_id: 'x8',
        code: '309',
        name: 'Fabric Materials',
        type: 'DIRECTCOSTS',
        class: 'EXPENSE',
        status: 'ACTIVE',
        created_at: '',
        updated_at: '',
      },
    ];

    const financialsWithMisclass: NormalisedFinancial[] = [
      ...mockFinancials,
      { id: 'f8', org_id: 'org-1', period: PERIOD, account_id: 'acc-fabric', amount: -5000, transaction_count: 3, source: 'xero', created_at: '', updated_at: '' },
    ];

    it('routes EXPENSE-class DIRECTCOSTS-type accounts to cost_of_sales when unmapped', () => {
      const pnl = buildSemanticPnL(financialsWithMisclass, accountsWithMisclass, [], PERIOD);
      const cosSection = pnl.sections.find((s) => s.section === 'cost_of_sales');
      expect(cosSection).toBeDefined();
      const fabricRow = cosSection!.rows.find((r) => r.accountId === 'acc-fabric');
      expect(fabricRow).toBeDefined();
      expect(fabricRow!.standardCategory).toBe('cost_of_sales');
    });

    it('includes misclassified accounts in costOfSales total', () => {
      const pnl = buildSemanticPnL(financialsWithMisclass, accountsWithMisclass, [], PERIOD);
      // Original COGS: 40000, Fabric: 5000 => 45000
      expect(pnl.costOfSales).toBe(45000);
    });
  });

  describe('empty data', () => {
    it('returns zeroes for empty period', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, '2099-01-01');
      expect(pnl.revenue).toBe(0);
      expect(pnl.costOfSales).toBe(0);
      expect(pnl.grossProfit).toBe(0);
      expect(pnl.operatingExpenses).toBe(0);
      expect(pnl.netProfit).toBe(0);
      expect(pnl.mappingCoverage).toBe(0);
    });

    it('returns zeroes for empty financials', () => {
      const pnl = buildSemanticPnL([], mockAccounts, fullMappings, PERIOD);
      expect(pnl.revenue).toBe(0);
      expect(pnl.netProfit).toBe(0);
    });

    it('returns zeroes for empty accounts', () => {
      const pnl = buildSemanticPnL(mockFinancials, [], fullMappings, PERIOD);
      expect(pnl.revenue).toBe(0);
      expect(pnl.netProfit).toBe(0);
    });
  });

  describe('period correctness', () => {
    it('stores the correct period in the result', () => {
      const pnl = buildSemanticPnL(mockFinancials, mockAccounts, fullMappings, PERIOD);
      expect(pnl.period).toBe(PERIOD);
    });
  });
});
