'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/components/providers/currency-context';

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  class: string;
};

type Props = {
  orgId: string;
  accounts: Account[];
  periods: string[];
  existingBudgets: Record<string, number>;
};

const CLASS_ORDER = ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'];
const CLASS_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  DIRECTCOSTS: 'Cost of Sales',
  EXPENSE: 'Operating Expenses',
  OVERHEADS: 'Overheads',
};

function formatPeriod(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function formatPeriodLong(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function BudgetEditClient({ orgId, accounts, periods, existingBudgets }: Props) {
  const { format: formatCurrency } = useCurrency();
  const [budgets, setBudgets] = useState<Record<string, number>>({ ...existingBudgets });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(
    periods.length > 0 ? [periods[0]] : []
  );

  // Group accounts by class
  const accountsByClass = useMemo(() => {
    const grouped: Record<string, Account[]> = {};
    for (const cls of CLASS_ORDER) {
      grouped[cls] = accounts.filter((a) => a.class === cls).sort((a, b) => a.code.localeCompare(b.code));
    }
    return grouped;
  }, [accounts]);

  const handleAmountChange = useCallback((accountName: string, period: string, value: string) => {
    const key = `${accountName}_${period}`;
    const num = parseFloat(value);
    setBudgets((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  }, []);

  const handleCopyToAllPeriods = useCallback((accountName: string, period: string) => {
    const key = `${accountName}_${period}`;
    const amount = budgets[key] ?? 0;
    if (amount === 0) return;

    setBudgets((prev) => {
      const updated = { ...prev };
      for (const p of selectedPeriods) {
        updated[`${accountName}_${p}`] = amount;
      }
      return updated;
    });
  }, [budgets, selectedPeriods]);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      // Collect all non-zero budget entries
      const lines: Array<{
        category: string;
        period: string;
        budgeted_amount: number;
        account_code?: string;
        account_name?: string;
      }> = [];

      for (const [key, amount] of Object.entries(budgets)) {
        if (amount === 0) continue;
        const lastUnderscore = key.lastIndexOf('_');
        const category = key.substring(0, lastUnderscore);
        const period = key.substring(lastUnderscore + 1);
        if (!period.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

        // Find the account for this category
        const account = accounts.find((a) => a.name === category);

        lines.push({
          category,
          period,
          budgeted_amount: amount,
          account_code: account?.code,
          account_name: category,
        });
      }

      if (lines.length === 0) {
        setSaveResult({ success: false, message: 'No budget values to save.' });
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/budget/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveResult({ success: true, message: data.message || `Saved ${lines.length} budget lines.` });
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveResult({ success: false, message: err.error || 'Failed to save budget.' });
      }
    } catch {
      setSaveResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Compute section totals for the selected period
  const getSectionTotal = (cls: string, period: string) => {
    return (accountsByClass[cls] ?? []).reduce((sum, acc) => {
      return sum + (budgets[`${acc.name}_${period}`] ?? 0);
    }, 0);
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(budgets) !== JSON.stringify(existingBudgets);
  }, [budgets, existingBudgets]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/financials/budget" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Budget vs Actual
          </Link>
          <h2 className="text-2xl font-bold mt-1">Set Budget</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter monthly budget targets for each account. These will be compared against your actuals.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save Budget
            </>
          )}
        </button>
      </div>

      {/* Save feedback */}
      {saveResult && (
        <div className={`rounded-lg border p-3 text-sm ${
          saveResult.success
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {saveResult.message}
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Budget for:</label>
        <div className="flex flex-wrap gap-1.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => {
                setSelectedPeriods((prev) =>
                  prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                );
              }}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                selectedPeriods.includes(p)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {formatPeriod(p)}
            </button>
          ))}
        </div>
      </div>

      {selectedPeriods.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Select at least one period to set budgets.
        </div>
      )}

      {/* Budget entry table */}
      {selectedPeriods.length > 0 && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold min-w-[250px] sticky left-0 bg-muted/50">
                  Account
                </th>
                {selectedPeriods.sort().map((p) => (
                  <th key={p} className="text-right px-3 py-3 font-semibold min-w-[130px]">
                    {formatPeriodLong(p)}
                  </th>
                ))}
                {selectedPeriods.length > 1 && (
                  <th className="text-right px-4 py-3 font-semibold min-w-[100px] border-l">
                    Total
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {CLASS_ORDER.map((cls) => {
                const classAccounts = accountsByClass[cls] ?? [];
                if (classAccounts.length === 0) return null;

                return (
                  <tbody key={cls}>
                    {/* Section header */}
                    <tr className="border-b bg-muted/30">
                      <td colSpan={selectedPeriods.length + (selectedPeriods.length > 1 ? 2 : 1)} className="px-4 py-2.5 font-semibold text-muted-foreground uppercase text-xs tracking-wide">
                        {CLASS_LABELS[cls] ?? cls}
                      </td>
                    </tr>

                    {/* Account rows */}
                    {classAccounts.map((acc) => {
                      const rowTotal = selectedPeriods.reduce(
                        (sum, p) => sum + (budgets[`${acc.name}_${p}`] ?? 0),
                        0
                      );

                      return (
                        <tr key={acc.id} className="border-b hover:bg-muted/20 transition-colors group">
                          <td className="px-4 py-2 pl-8 text-muted-foreground sticky left-0 bg-card group-hover:bg-muted/20">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground/60 w-10">{acc.code}</span>
                              <span>{acc.name}</span>
                            </div>
                          </td>
                          {selectedPeriods.sort().map((p) => {
                            const key = `${acc.name}_${p}`;
                            const value = budgets[key] ?? 0;

                            return (
                              <td key={p} className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={value || ''}
                                    onChange={(e) => handleAmountChange(acc.name, p, e.target.value)}
                                    placeholder="0.00"
                                    className="w-full text-right px-2 py-1.5 rounded border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  {selectedPeriods.length > 1 && value > 0 && (
                                    <button
                                      onClick={() => handleCopyToAllPeriods(acc.name, p)}
                                      title="Copy to all selected periods"
                                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          {selectedPeriods.length > 1 && (
                            <td className="text-right px-4 py-2 font-mono text-xs font-semibold border-l">
                              {rowTotal > 0 ? formatCurrency(rowTotal) : '-'}
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Section total */}
                    <tr className="border-b border-t-2 border-t-border bg-muted/20">
                      <td className="px-4 py-2.5 font-semibold sticky left-0 bg-muted/20">
                        Total {CLASS_LABELS[cls] ?? cls}
                      </td>
                      {selectedPeriods.sort().map((p) => (
                        <td key={p} className="text-right px-3 py-2.5 font-mono text-xs font-semibold">
                          {formatCurrency(getSectionTotal(cls, p))}
                        </td>
                      ))}
                      {selectedPeriods.length > 1 && (
                        <td className="text-right px-4 py-2.5 font-mono text-xs font-bold border-l">
                          {formatCurrency(
                            selectedPeriods.reduce((sum, p) => sum + getSectionTotal(cls, p), 0)
                          )}
                        </td>
                      )}
                    </tr>
                  </tbody>
                );
              })}

              {/* Grand total: Net Budget */}
              <tr className="border-t-2 bg-muted/30">
                <td className="px-4 py-3 font-bold sticky left-0 bg-muted/30">Net Budget (Revenue - Costs - Expenses)</td>
                {selectedPeriods.sort().map((p) => {
                  const rev = getSectionTotal('REVENUE', p);
                  const cos = getSectionTotal('DIRECTCOSTS', p);
                  const exp = getSectionTotal('EXPENSE', p);
                  const oh = getSectionTotal('OVERHEADS', p);
                  const net = rev - cos - exp - oh;
                  return (
                    <td key={p} className={`text-right px-3 py-3 font-mono text-xs font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(net)}
                    </td>
                  );
                })}
                {selectedPeriods.length > 1 && (
                  <td className="text-right px-4 py-3 font-mono text-xs font-bold border-l">
                    {(() => {
                      const total = selectedPeriods.reduce((sum, p) => {
                        const rev = getSectionTotal('REVENUE', p);
                        const cos = getSectionTotal('DIRECTCOSTS', p);
                        const exp = getSectionTotal('EXPENSE', p);
                        const oh = getSectionTotal('OVERHEADS', p);
                        return sum + rev - cos - exp - oh;
                      }, 0);
                      return (
                        <span className={total >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatCurrency(total)}
                        </span>
                      );
                    })()}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Help text */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tips:</strong> Enter your monthly budget for each account.
          Use the copy icon to replicate a value across all selected periods.
          Budget figures are compared against your real Xero actuals on the Budget vs Actual page.
        </p>
      </div>
    </div>
  );
}
