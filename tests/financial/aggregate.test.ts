import { describe, it, expect } from 'vitest';
import { buildPnL, sumAmounts, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

const mockAccounts: ChartOfAccount[] = [
  {
    id: 'acc-1',
    org_id: 'org-1',
    xero_account_id: 'x1',
    code: '200',
    name: 'Sales',
    type: 'REVENUE',
    class: 'REVENUE',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-2',
    org_id: 'org-1',
    xero_account_id: 'x2',
    code: '300',
    name: 'Cost of Goods Sold',
    type: 'DIRECTCOSTS',
    class: 'DIRECTCOSTS',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-3',
    org_id: 'org-1',
    xero_account_id: 'x3',
    code: '400',
    name: 'Rent',
    type: 'OVERHEADS',
    class: 'OVERHEADS',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'acc-4',
    org_id: 'org-1',
    xero_account_id: 'x4',
    code: '410',
    name: 'Office Supplies',
    type: 'EXPENSE',
    class: 'EXPENSE',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
  },
];

const mockFinancials: NormalisedFinancial[] = [
  {
    id: 'f1',
    org_id: 'org-1',
    period: '2024-01-01',
    account_id: 'acc-1',
    amount: 50000,
    transaction_count: 10,
    source: 'xero',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'f2',
    org_id: 'org-1',
    period: '2024-01-01',
    account_id: 'acc-2',
    amount: 20000,
    transaction_count: 5,
    source: 'xero',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'f3',
    org_id: 'org-1',
    period: '2024-01-01',
    account_id: 'acc-3',
    amount: 5000,
    transaction_count: 1,
    source: 'xero',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'f4',
    org_id: 'org-1',
    period: '2024-01-01',
    account_id: 'acc-4',
    amount: 2000,
    transaction_count: 3,
    source: 'xero',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'f5',
    org_id: 'org-1',
    period: '2024-02-01',
    account_id: 'acc-1',
    amount: 60000,
    transaction_count: 12,
    source: 'xero',
    created_at: '',
    updated_at: '',
  },
];

describe('buildPnL', () => {
  it('calculates correct P&L for a period', () => {
    const pnl = buildPnL(mockFinancials, mockAccounts, '2024-01-01');

    expect(pnl.revenue).toBe(50000);
    expect(pnl.costOfSales).toBe(20000);
    expect(pnl.grossProfit).toBe(30000);
    expect(pnl.expenses).toBe(7000); // 5000 overheads + 2000 expenses
    expect(pnl.netProfit).toBe(23000); // 50000 - 20000 - 5000 - 2000
    expect(pnl.period).toBe('2024-01-01');
  });

  it('returns zero values for empty period', () => {
    const pnl = buildPnL(mockFinancials, mockAccounts, '2024-06-01');

    expect(pnl.revenue).toBe(0);
    expect(pnl.costOfSales).toBe(0);
    expect(pnl.grossProfit).toBe(0);
    expect(pnl.netProfit).toBe(0);
  });

  it('groups accounts into correct sections', () => {
    const pnl = buildPnL(mockFinancials, mockAccounts, '2024-01-01');

    expect(pnl.sections).toHaveLength(4);
    expect(pnl.sections[0].label).toBe('Revenue');
    expect(pnl.sections[0].rows).toHaveLength(1);
    expect(pnl.sections[1].label).toBe('Cost of Sales');
    expect(pnl.sections[1].rows).toHaveLength(1);
  });

  it('classifies EXPENSE-class accounts with DIRECTCOSTS type as Cost of Sales', () => {
    // Xero can set class=EXPENSE for accounts whose type=DIRECTCOSTS.
    // The P&L must route these into the Cost of Sales section.
    const accountsWithMisclass: ChartOfAccount[] = [
      ...mockAccounts,
      {
        id: 'acc-5',
        org_id: 'org-1',
        xero_account_id: 'x5',
        code: '305',
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
      {
        id: 'f6',
        org_id: 'org-1',
        period: '2024-01-01',
        account_id: 'acc-5',
        amount: -8000,
        transaction_count: 4,
        source: 'xero',
        created_at: '',
        updated_at: '',
      },
    ];

    const pnl = buildPnL(financialsWithMisclass, accountsWithMisclass, '2024-01-01');

    // DIRECTCOSTS section should have 2 rows: original COGS + Fabric Materials
    const cogsSection = pnl.sections.find((s) => s.class === 'DIRECTCOSTS');
    expect(cogsSection).toBeDefined();
    expect(cogsSection!.rows).toHaveLength(2);
    expect(cogsSection!.rows.find((r) => r.accountName === 'Fabric Materials')).toBeDefined();

    // costOfSales should include both accounts
    expect(pnl.costOfSales).toBe(28000); // |20000| + |-8000|
  });
});

describe('sumAmounts', () => {
  it('sums amounts correctly', () => {
    expect(sumAmounts([10.1, 20.2, 30.3])).toBe(60.6);
    expect(sumAmounts([])).toBe(0);
    expect(sumAmounts([100])).toBe(100);
  });

  it('handles floating point edge cases', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
  });
});

describe('getAvailablePeriods', () => {
  it('returns unique periods sorted descending', () => {
    const periods = getAvailablePeriods(mockFinancials);
    expect(periods).toEqual(['2024-02-01', '2024-01-01']);
  });

  it('returns empty array for no data', () => {
    expect(getAvailablePeriods([])).toEqual([]);
  });
});
