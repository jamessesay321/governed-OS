import { describe, it, expect } from 'vitest';
import { reconcile } from '@/lib/financial/reconcile';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

function makeAccount(overrides: Partial<ChartOfAccount> = {}): ChartOfAccount {
  return {
    id: 'acc-1',
    org_id: 'org-1',
    xero_account_id: 'xero-1',
    code: '200',
    name: 'Sales',
    type: 'REVENUE',
    class: 'REVENUE',
    status: 'ACTIVE',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  };
}

function makeFinancial(overrides: Partial<NormalisedFinancial> = {}): NormalisedFinancial {
  return {
    id: 'fin-1',
    org_id: 'org-1',
    period: '2024-01-01',
    account_id: 'acc-1',
    amount: 1000,
    transaction_count: 5,
    source: 'xero',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  };
}

describe('reconcile', () => {
  it('returns fully reconciled when amounts match', () => {
    const accounts = [makeAccount()];
    const normalised = [makeFinancial({ amount: 1000 })];
    const xeroTotals = new Map([['200', 1000]]);

    const report = reconcile(normalised, xeroTotals, accounts, '2024-01-01');

    expect(report.fullyReconciled).toBe(true);
    expect(report.matchedCount).toBe(1);
    expect(report.discrepancyCount).toBe(0);
    expect(report.totalDifference).toBe(0);
  });

  it('detects discrepancies when amounts differ', () => {
    const accounts = [makeAccount()];
    const normalised = [makeFinancial({ amount: 1000 })];
    const xeroTotals = new Map([['200', 950]]);

    const report = reconcile(normalised, xeroTotals, accounts, '2024-01-01');

    expect(report.fullyReconciled).toBe(false);
    expect(report.discrepancyCount).toBe(1);
    expect(report.items[0].difference).toBe(50);
  });

  it('tolerates rounding differences within tolerance', () => {
    const accounts = [makeAccount()];
    const normalised = [makeFinancial({ amount: 1000.005 })];
    const xeroTotals = new Map([['200', 1000]]);

    const report = reconcile(normalised, xeroTotals, accounts, '2024-01-01');

    expect(report.fullyReconciled).toBe(true);
  });

  it('includes accounts only in Xero', () => {
    const accounts = [makeAccount()];
    const xeroTotals = new Map([['200', 500], ['300', 200]]);

    const report = reconcile([], xeroTotals, accounts, '2024-01-01');

    expect(report.items.length).toBe(2);
    const missingItem = report.items.find((i) => i.accountCode === '300');
    expect(missingItem?.normalisedAmount).toBe(0);
    expect(missingItem?.xeroAmount).toBe(200);
    expect(missingItem?.matched).toBe(false);
  });

  it('includes accounts only in normalised data', () => {
    const accounts = [makeAccount()];
    const normalised = [makeFinancial({ amount: 500 })];
    const xeroTotals = new Map<string, number>();

    const report = reconcile(normalised, xeroTotals, accounts, '2024-01-01');

    expect(report.items.length).toBe(1);
    expect(report.items[0].xeroAmount).toBe(0);
    expect(report.items[0].matched).toBe(false);
  });

  it('filters by period', () => {
    const accounts = [makeAccount()];
    const normalised = [
      makeFinancial({ id: 'f1', amount: 1000, period: '2024-01-01' }),
      makeFinancial({ id: 'f2', amount: 500, period: '2024-02-01' }),
    ];
    const xeroTotals = new Map([['200', 1000]]);

    const report = reconcile(normalised, xeroTotals, accounts, '2024-01-01');

    expect(report.items[0].normalisedAmount).toBe(1000);
    expect(report.fullyReconciled).toBe(true);
  });

  it('handles multiple accounts', () => {
    const accounts = [
      makeAccount({ id: 'acc-1', code: '200', name: 'Sales' }),
      makeAccount({ id: 'acc-2', code: '400', name: 'COGS' }),
    ];
    const normalised = [
      makeFinancial({ id: 'f1', account_id: 'acc-1', amount: 1000 }),
      makeFinancial({ id: 'f2', account_id: 'acc-2', amount: 300 }),
    ];
    const xeroTotals = new Map([['200', 1000], ['400', 300]]);

    const report = reconcile(normalised, xeroTotals, accounts, '2024-01-01');

    expect(report.fullyReconciled).toBe(true);
    expect(report.matchedCount).toBe(2);
    expect(report.totalNormalised).toBe(1300);
    expect(report.totalXero).toBe(1300);
  });
});
