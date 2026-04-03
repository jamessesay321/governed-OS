import { describe, it, expect } from 'vitest';
import {
  checkPnlVsXero,
  checkPnlVsBalanceSheet,
  checkRatioSanity,
  checkDeferredIncome,
  checkMissingPnlComponents,
  computeOverallScore,
  generateRecommendations,
} from '@/lib/financial/post-sync-reconciliation';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import type { PnLSummary } from '@/lib/financial/aggregate';
import type { XeroPnLTotals } from '@/lib/financial/xero-pnl-parser';
import type { IndustryBenchmarks } from '@/lib/financial/industry-benchmarks';
import { parseXeroPnLReport } from '@/lib/financial/xero-pnl-parser';
import { getBenchmarks } from '@/lib/financial/industry-benchmarks';

// --- Test helpers ---

function makeAccount(overrides: Partial<ChartOfAccount> & { id: string; code: string; name: string; class: string }): ChartOfAccount {
  return {
    org_id: 'org-1',
    xero_account_id: overrides.id,
    type: 'REVENUE',
    status: 'ACTIVE',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function makeFinancial(accountId: string, period: string, amount: number): NormalisedFinancial {
  return {
    id: `fin-${accountId}-${period}`,
    org_id: 'org-1',
    period,
    account_id: accountId,
    amount,
    transaction_count: 5,
    source: 'xero',
    created_at: '',
    updated_at: '',
  };
}

function makePnl(overrides: Partial<PnLSummary> = {}): PnLSummary {
  return {
    sections: [],
    revenue: 100000,
    costOfSales: 40000,
    grossProfit: 60000,
    expenses: 50000,
    netProfit: 10000,
    period: '2025-01-01',
    ...overrides,
  };
}

function makeXeroPnl(overrides: Partial<XeroPnLTotals> = {}): XeroPnLTotals {
  return {
    byAccountId: new Map(),
    byAccountCode: new Map(),
    totalRevenue: 100000,
    totalCostOfSales: 40000,
    totalExpenses: 50000,
    netProfit: 10000,
    ...overrides,
  };
}

const defaultBenchmarks: IndustryBenchmarks = {
  grossMarginRange: [30, 65],
  netMarginRange: [-15, 20],
  maxPlausibleNetMargin: 35,
  expectsCOGS: true,
  expectsDepreciation: true,
  expectsStockMovements: true,
  expectsInterestExpense: true,
};

// --- Check 1: P&L vs Xero ---

describe('checkPnlVsXero', () => {
  const accounts: ChartOfAccount[] = [
    makeAccount({ id: 'a1', code: '200', name: 'Sales', class: 'REVENUE' }),
    makeAccount({ id: 'a2', code: '400', name: 'Cost of Goods', class: 'DIRECTCOSTS' }),
  ];

  const normalised: NormalisedFinancial[] = [
    makeFinancial('a1', '2025-01-01', 100000),
    makeFinancial('a2', '2025-01-01', -40000),
  ];

  it('passes when platform matches Xero within tolerance', () => {
    // Xero totals must also match and account codes must be in byAccountCode
    const xeroPnl = makeXeroPnl();
    xeroPnl.byAccountCode.set('200', 100000);
    xeroPnl.byAccountCode.set('400', -40000);
    const result = checkPnlVsXero(normalised, accounts, xeroPnl, makePnl(), '2025-01-01');
    expect(result.severity).toBe('pass');
    expect(result.discrepancies).toHaveLength(0);
  });

  it('flags critical when revenue differs by more than £1000', () => {
    const xeroPnl = makeXeroPnl({ totalRevenue: 50000, netProfit: -40000 });
    const platformPnl = makePnl({ revenue: 100000, netProfit: 10000 });
    const result = checkPnlVsXero(normalised, accounts, xeroPnl, platformPnl, '2025-01-01');
    expect(result.severity).toBe('critical');
    expect(result.discrepancies.some((d) => d.field === 'Total Revenue')).toBe(true);
  });

  it('flags warn when difference is between £100 and £1000', () => {
    const xeroPnl = makeXeroPnl({ totalRevenue: 99500, netProfit: 9500 });
    const platformPnl = makePnl();
    const result = checkPnlVsXero(normalised, accounts, xeroPnl, platformPnl, '2025-01-01');
    expect(result.severity).toBe('warn');
  });
});

// --- Check 2: P&L vs Balance Sheet ---

describe('checkPnlVsBalanceSheet', () => {
  it('passes when P&L profit and equity movement are consistent', () => {
    const result = checkPnlVsBalanceSheet(makePnl({ netProfit: 10000 }), 50000, 40000);
    expect(result.severity).toBe('pass');
  });

  it('flags critical when profit shown but equity declined', () => {
    const result = checkPnlVsBalanceSheet(makePnl({ netProfit: 50000 }), -100000, -50000);
    expect(result.severity).toBe('critical');
    expect(result.discrepancies.length).toBeGreaterThan(0);
  });

  it('flags warn when profit shown but net liabilities', () => {
    const result = checkPnlVsBalanceSheet(makePnl({ netProfit: 10000 }), -500000, null);
    expect(result.discrepancies.some((d) => d.field === 'Net Profit vs Equity')).toBe(true);
  });

  it('returns pass with note when no balance sheet data', () => {
    const result = checkPnlVsBalanceSheet(makePnl(), null, null);
    expect(result.severity).toBe('pass');
    expect(result.score).toBe(50);
  });
});

// --- Check 3: Ratio Sanity ---

describe('checkRatioSanity', () => {
  it('passes when margins are within industry range', () => {
    const pnl = makePnl({ revenue: 100000, grossProfit: 50000, netProfit: 10000 });
    const result = checkRatioSanity(pnl, defaultBenchmarks, null, null);
    expect(result.severity).toBe('pass');
  });

  it('flags critical when net margin is implausibly high', () => {
    const pnl = makePnl({ revenue: 100000, grossProfit: 95000, netProfit: 90000 });
    const result = checkRatioSanity(pnl, defaultBenchmarks, null, null);
    expect(result.severity).toBe('critical');
    expect(result.discrepancies.some((d) => d.field.includes('Implausible'))).toBe(true);
  });

  it('flags when profit exists but net liabilities', () => {
    const pnl = makePnl({ netProfit: 50000 });
    const result = checkRatioSanity(pnl, defaultBenchmarks, 100000, 200000);
    expect(result.discrepancies.some((d) => d.field.includes('Net Liabilities'))).toBe(true);
  });

  it('returns pass with score 50 when no revenue', () => {
    const pnl = makePnl({ revenue: 0 });
    const result = checkRatioSanity(pnl, defaultBenchmarks, null, null);
    expect(result.severity).toBe('pass');
    expect(result.score).toBe(50);
  });
});

// --- Check 4: Deferred Income ---

describe('checkDeferredIncome', () => {
  it('flags revenue accounts containing deposit-like names', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'a1', code: '200', name: 'Bespoke Deposits', class: 'REVENUE' }),
      makeAccount({ id: 'a2', code: '201', name: 'Sales Revenue', class: 'REVENUE' }),
    ];
    const financials: NormalisedFinancial[] = [
      makeFinancial('a1', '2025-01-01', 50000),
      makeFinancial('a2', '2025-01-01', 100000),
    ];
    const result = checkDeferredIncome(financials, accounts, '2025-01-01');
    expect(result.severity).toBe('warn');
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].field).toContain('Bespoke Deposits');
  });

  it('passes when no revenue accounts have deposit-like names', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'a1', code: '200', name: 'Sales Revenue', class: 'REVENUE' }),
    ];
    const financials: NormalisedFinancial[] = [
      makeFinancial('a1', '2025-01-01', 100000),
    ];
    const result = checkDeferredIncome(financials, accounts, '2025-01-01');
    expect(result.severity).toBe('pass');
  });

  it('ignores non-revenue accounts with deposit names', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'a1', code: '800', name: 'Customer Deposits', class: 'LIABILITY' }),
    ];
    const financials: NormalisedFinancial[] = [
      makeFinancial('a1', '2025-01-01', 50000),
    ];
    const result = checkDeferredIncome(financials, accounts, '2025-01-01');
    expect(result.severity).toBe('pass');
  });
});

// --- Check 5: Missing P&L Components ---

describe('checkMissingPnlComponents', () => {
  it('flags missing stock movements when stock accounts exist', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'a1', code: '200', name: 'Sales', class: 'REVENUE' }),
      makeAccount({ id: 'a2', code: '600', name: 'Stock on Hand', class: 'ASSET' }),
    ];
    const financials: NormalisedFinancial[] = [
      makeFinancial('a1', '2025-01-01', 100000),
    ];
    const result = checkMissingPnlComponents(financials, accounts, '2025-01-01', defaultBenchmarks);
    expect(result.severity).toBe('warn');
    expect(result.discrepancies.some((d) => d.field === 'Stock/WIP Movements')).toBe(true);
  });

  it('flags missing interest when loan accounts exist', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'a1', code: '200', name: 'Sales', class: 'REVENUE' }),
      makeAccount({ id: 'a2', code: '800', name: 'Bank Loan', class: 'LIABILITY' }),
    ];
    const financials: NormalisedFinancial[] = [
      makeFinancial('a1', '2025-01-01', 100000),
    ];
    const result = checkMissingPnlComponents(financials, accounts, '2025-01-01', defaultBenchmarks);
    expect(result.discrepancies.some((d) => d.field === 'Interest Expense')).toBe(true);
  });

  it('passes when all expected components are present', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'a1', code: '200', name: 'Sales', class: 'REVENUE' }),
      makeAccount({ id: 'a2', code: '400', name: 'Opening Stock', class: 'DIRECTCOSTS' }),
      makeAccount({ id: 'a3', code: '600', name: 'Stock on Hand', class: 'ASSET' }),
      makeAccount({ id: 'a4', code: '800', name: 'Bank Loan', class: 'LIABILITY' }),
      makeAccount({ id: 'a5', code: '810', name: 'Interest Paid', class: 'EXPENSE' }),
      makeAccount({ id: 'a6', code: '700', name: 'Equipment', class: 'ASSET' }),
      makeAccount({ id: 'a7', code: '710', name: 'Depreciation', class: 'EXPENSE' }),
    ];
    const financials: NormalisedFinancial[] = [
      makeFinancial('a1', '2025-01-01', 100000),
      makeFinancial('a2', '2025-01-01', -30000),
      makeFinancial('a5', '2025-01-01', -5000),
      makeFinancial('a7', '2025-01-01', -2000),
    ];
    const result = checkMissingPnlComponents(financials, accounts, '2025-01-01', defaultBenchmarks);
    expect(result.severity).toBe('pass');
  });
});

// --- Xero P&L Parser ---

describe('parseXeroPnLReport', () => {
  it('parses a standard Xero P&L report structure', () => {
    const mockReport = {
      Reports: [{
        Rows: [
          { RowType: 'Header', Cells: [{ Value: 'Account' }, { Value: 'Total' }] },
          {
            RowType: 'Section',
            Title: 'Income',
            Rows: [
              {
                RowType: 'Row',
                Cells: [
                  { Value: 'Sales', Attributes: [{ Id: 'account', Value: 'ACC-1' }] },
                  { Value: '50000.00' },
                ],
              },
              {
                RowType: 'Row',
                Cells: [
                  { Value: 'Other Income', Attributes: [{ Id: 'account', Value: 'ACC-2' }] },
                  { Value: '5000.00' },
                ],
              },
            ],
          },
          {
            RowType: 'Section',
            Title: 'Cost of Sales',
            Rows: [
              {
                RowType: 'Row',
                Cells: [
                  { Value: 'Materials', Attributes: [{ Id: 'account', Value: 'ACC-3' }] },
                  { Value: '-20000.00' },
                ],
              },
            ],
          },
          {
            RowType: 'Section',
            Title: 'Operating Expenses',
            Rows: [
              {
                RowType: 'Row',
                Cells: [
                  { Value: 'Rent', Attributes: [{ Id: 'account', Value: 'ACC-4' }] },
                  { Value: '-10000.00' },
                ],
              },
            ],
          },
        ],
      }],
    };

    const result = parseXeroPnLReport(mockReport);
    // Revenue: 50000 + 5000 = 55000. COS: abs(-20000) = 20000. Expenses: abs(-10000) = 10000.
    // Net = 55000 + (-20000) + (-10000) = 25000
    expect(result.totalRevenue).toBe(55000);
    expect(result.totalCostOfSales).toBe(20000);
    expect(result.totalExpenses).toBe(10000);
    expect(result.netProfit).toBe(25000);
    expect(result.byAccountCode.size).toBe(4);
  });

  it('returns zeros for empty/missing report', () => {
    const result = parseXeroPnLReport({});
    expect(result.totalRevenue).toBe(0);
    expect(result.totalCostOfSales).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.netProfit).toBe(0);
  });
});

// --- Industry Benchmarks ---

describe('getBenchmarks', () => {
  it('returns specific benchmarks for known industries', () => {
    const b = getBenchmarks('fashion-luxury');
    expect(b.expectsStockMovements).toBe(true);
    expect(b.grossMarginRange[0]).toBeGreaterThan(0);
  });

  it('returns default benchmarks for unknown industries', () => {
    const b = getBenchmarks('underwater-basket-weaving');
    expect(b.grossMarginRange).toEqual([15, 80]);
  });

  it('returns default benchmarks for null', () => {
    const b = getBenchmarks(null);
    expect(b.maxPlausibleNetMargin).toBe(60);
  });

  it('handles partial matches', () => {
    const b = getBenchmarks('fashion');
    expect(b.expectsStockMovements).toBe(true);
  });
});

// --- Scoring ---

describe('computeOverallScore', () => {
  it('returns pass with score 100 when all checks pass', () => {
    const checks = [
      { name: 'pnl_vs_xero' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
      { name: 'pnl_vs_balance_sheet' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
      { name: 'ratio_sanity' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
      { name: 'deferred_income' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
      { name: 'missing_pnl_components' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
    ];
    const result = computeOverallScore(checks);
    expect(result.score).toBe(100);
    expect(result.status).toBe('pass');
    expect(result.hasCritical).toBe(false);
  });

  it('returns critical when any check is critical', () => {
    const checks = [
      { name: 'pnl_vs_xero' as const, label: '', severity: 'critical' as const, score: 10, message: '', discrepancies: [] },
      { name: 'pnl_vs_balance_sheet' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
      { name: 'ratio_sanity' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
      { name: 'deferred_income' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
      { name: 'missing_pnl_components' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
    ];
    const result = computeOverallScore(checks);
    expect(result.status).toBe('critical');
    expect(result.hasCritical).toBe(true);
  });
});

describe('generateRecommendations', () => {
  it('generates recommendations for failing checks', () => {
    const checks = [
      {
        name: 'deferred_income' as const,
        label: '',
        severity: 'warn' as const,
        score: 50,
        message: '',
        discrepancies: [{ field: 'test', platformValue: 0, expectedValue: 0, difference: 0, explanation: '' }],
      },
    ];
    const recs = generateRecommendations(checks);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toContain('deferred income');
  });

  it('returns empty for all-pass checks', () => {
    const checks = [
      { name: 'pnl_vs_xero' as const, label: '', severity: 'pass' as const, score: 100, message: '', discrepancies: [] },
    ];
    const recs = generateRecommendations(checks);
    expect(recs).toHaveLength(0);
  });
});
