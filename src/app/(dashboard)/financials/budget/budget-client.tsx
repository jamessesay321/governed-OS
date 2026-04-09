'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/components/providers/currency-context';
import { formatPercent } from '@/lib/formatting/currency';
import { ReportControls, getDefaultReportState } from '@/components/financial/report-controls';
import type { ReportControlsState } from '@/components/financial/report-controls';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';

// ─── Types ──────────────────────────────────────────────────────────

type BudgetRow = {
  category: string;
  budget: number;
  actual: number;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  header?: boolean;
  /** true = lower actual is good (costs); false = higher actual is good (revenue) */
  favorableWhenUnder?: boolean;
};

type PeriodPnLData = {
  period: string;
  accountsByClass: Record<string, Record<string, number>>;
};

type Props = {
  connected: boolean;
  hasBudget: boolean;
  availablePeriods: string[];
  periodPnLs: PeriodPnLData[];
  budgetByCategory: Record<string, number>;
  budgetByCategoryPeriod: Record<string, number>;
};

// ─── Variance helpers (DataRails-style thresholds) ──────────────────

type VarianceSeverity = 'on-budget' | 'minor' | 'material' | 'critical' | 'none';

function getVarianceSeverity(variancePct: number): VarianceSeverity {
  const abs = Math.abs(variancePct);
  if (abs <= 2) return 'on-budget';
  if (abs <= 10) return 'minor';
  if (abs <= 25) return 'material';
  return 'critical';
}

function getSeverityBadge(severity: VarianceSeverity, favorable: boolean | null) {
  if (severity === 'on-budget') {
    return { label: 'On Budget', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' };
  }
  if (favorable === true) {
    if (severity === 'minor') return { label: 'Favourable', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' };
    return { label: 'Favourable', bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-300 dark:border-emerald-700' };
  }
  if (favorable === false) {
    if (severity === 'minor') return { label: 'Watch', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' };
    if (severity === 'material') return { label: 'Adverse', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' };
    return { label: 'Critical', bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-800 dark:text-red-200', border: 'border-red-300 dark:border-red-700' };
  }
  return null;
}

// ─── Component ──────────────────────────────────────────────────────

export function BudgetClient({
  connected,
  hasBudget,
  availablePeriods,
  periodPnLs,
  budgetByCategory,
  budgetByCategoryPeriod,
}: Props) {
  const { format: formatCurrency } = useCurrency();
  const { yearEndMonth } = useAccountingConfig();
  const [controls, setControls] = useState<ReportControlsState>(() => getDefaultReportState(availablePeriods, yearEndMonth));
  const [suppressMinor, setSuppressMinor] = useState(false);

  // ─── Build rows dynamically based on selected periods ─────────────
  const { rows, periodLabel } = useMemo(() => {
    const selectedSet = new Set(controls.selectedPeriods);
    const filteredPnLs = periodPnLs.filter((p) => selectedSet.has(p.period));

    if (filteredPnLs.length === 0) {
      return { rows: [] as BudgetRow[], periodLabel: 'No periods selected' };
    }

    // Aggregate actuals by class -> account name across selected periods
    const actualsByClass = new Map<string, Map<string, number>>();
    for (const pnl of filteredPnLs) {
      for (const [cls, accounts] of Object.entries(pnl.accountsByClass)) {
        if (!actualsByClass.has(cls)) actualsByClass.set(cls, new Map());
        const accMap = actualsByClass.get(cls)!;
        for (const [name, amount] of Object.entries(accounts)) {
          accMap.set(name, (accMap.get(name) ?? 0) + amount);
        }
      }
    }

    // Aggregate budget for selected periods only
    const budgetForSelected = new Map<string, number>();
    for (const [key, amount] of Object.entries(budgetByCategoryPeriod)) {
      const lastUnderscore = key.lastIndexOf('_');
      const category = key.substring(0, lastUnderscore);
      const period = key.substring(lastUnderscore + 1);
      if (selectedSet.has(period)) {
        budgetForSelected.set(category, (budgetForSelected.get(category) ?? 0) + amount);
      }
    }

    const getBudget = (name: string): number => {
      if (budgetForSelected.size > 0) return budgetForSelected.get(name) ?? 0;
      return budgetByCategory[name] ?? 0;
    };

    const result: BudgetRow[] = [];

    // Revenue
    const revenueAccounts = actualsByClass.get('REVENUE') ?? new Map();
    result.push({ category: 'Revenue', budget: 0, actual: 0, header: true });
    let totalRevBudget = 0, totalRevActual = 0;
    for (const [name, actual] of Array.from(revenueAccounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const budget = getBudget(name);
      totalRevBudget += budget;
      totalRevActual += actual;
      result.push({ category: name, budget, actual, indent: true, favorableWhenUnder: false });
    }
    result.push({ category: 'Total Revenue', budget: totalRevBudget, actual: totalRevActual, bold: true, separator: true, favorableWhenUnder: false });

    // Cost of Sales
    const cosAccounts = actualsByClass.get('DIRECTCOSTS') ?? new Map();
    result.push({ category: 'Cost of Sales', budget: 0, actual: 0, header: true });
    let totalCosBudget = 0, totalCosActual = 0;
    for (const [name, actual] of Array.from(cosAccounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const budget = getBudget(name);
      totalCosBudget += budget;
      totalCosActual += actual;
      result.push({ category: name, budget, actual, indent: true, favorableWhenUnder: true });
    }
    result.push({ category: 'Total Cost of Sales', budget: totalCosBudget, actual: totalCosActual, bold: true, separator: true, favorableWhenUnder: true });

    // Gross Profit
    result.push({ category: 'Gross Profit', budget: totalRevBudget - totalCosBudget, actual: totalRevActual - totalCosActual, bold: true, separator: true, favorableWhenUnder: false });

    // Operating Expenses
    const expAccounts = actualsByClass.get('EXPENSE') ?? new Map();
    const ohAccounts = actualsByClass.get('OVERHEADS') ?? new Map();
    result.push({ category: 'Operating Expenses', budget: 0, actual: 0, header: true });
    let totalExpBudget = 0, totalExpActual = 0;
    const allExpenses = new Map<string, number>();
    for (const [n, a] of expAccounts) allExpenses.set(n, (allExpenses.get(n) ?? 0) + a);
    for (const [n, a] of ohAccounts) allExpenses.set(n, (allExpenses.get(n) ?? 0) + a);
    for (const [name, actual] of Array.from(allExpenses.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const budget = getBudget(name);
      totalExpBudget += budget;
      totalExpActual += actual;
      result.push({ category: name, budget, actual, indent: true, favorableWhenUnder: true });
    }
    result.push({ category: 'Total Operating Expenses', budget: totalExpBudget, actual: totalExpActual, bold: true, separator: true, favorableWhenUnder: true });

    // Net Profit
    const gpB = totalRevBudget - totalCosBudget;
    const gpA = totalRevActual - totalCosActual;
    result.push({ category: 'Net Profit', budget: gpB - totalExpBudget, actual: gpA - totalExpActual, bold: true, separator: true, favorableWhenUnder: false });

    const sorted = [...controls.selectedPeriods].sort();
    const first = new Date(sorted[0]);
    const last = new Date(sorted[sorted.length - 1]);
    const label = sorted.length === 1
      ? first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : `${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} \u2013 ${last.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

    return { rows: result, periodLabel: label };
  }, [controls.selectedPeriods, periodPnLs, budgetByCategory, budgetByCategoryPeriod]);

  // ─── Derived data ─────────────────────────────────────────────────

  const revenueRow = rows.find((r) => r.category === 'Total Revenue' && r.bold);
  const cosRow = rows.find((r) => r.category === 'Total Cost of Sales' && r.bold);
  const gpRow = rows.find((r) => r.category === 'Gross Profit' && r.bold);
  const expenseRow = rows.find((r) => r.category === 'Total Operating Expenses' && r.bold);
  const netProfitRow = rows.find((r) => r.category === 'Net Profit' && r.bold);

  // Count material variances for the header stat
  const materialVarianceCount = useMemo(() => {
    if (!hasBudget) return 0;
    return rows.filter((r) => {
      if (r.header || r.bold) return false;
      const v = r.actual - r.budget;
      const pct = r.budget !== 0 ? Math.abs((v / Math.abs(r.budget)) * 100) : 0;
      return pct > 10;
    }).length;
  }, [rows, hasBudget]);

  // Search + variance suppression filter
  const filteredRows = useMemo(() => {
    let result = rows;

    // Suppress minor variances (DataRails pattern)
    if (suppressMinor && hasBudget) {
      result = result.filter((r) => {
        if (r.header || r.bold) return true;
        const v = r.actual - r.budget;
        const pct = r.budget !== 0 ? Math.abs((v / Math.abs(r.budget)) * 100) : 0;
        return pct > 5; // Only show >5% variances
      });
    }

    // Search filter
    if (controls.searchQuery) {
      const query = controls.searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.header || r.bold || r.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [rows, controls.searchQuery, suppressMinor, hasBudget]);

  // CSV export
  const csvData = useMemo(() => {
    return rows
      .filter((r) => !r.header)
      .map((r) => {
        const v = r.actual - r.budget;
        const pct = r.budget !== 0 ? (v / Math.abs(r.budget)) * 100 : 0;
        return {
          Category: r.category,
          Budget: r.budget,
          Actual: r.actual,
          Variance: v,
          'Variance %': formatPercent(pct),
        };
      });
  }, [rows]);

  // ─── Empty state ──────────────────────────────────────────────────

  if (!connected || periodPnLs.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-200 dark:bg-amber-800 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">No Data</span>
            <span className="text-sm text-amber-800 dark:text-amber-200">
              {!connected
                ? 'Connect your accounting software to see Budget vs Actual.'
                : 'No financial data available yet. Sync from Xero to get started.'}
            </span>
          </div>
          <Link href={connected ? '/financials' : '/integrations'} className="text-sm font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline">
            {connected ? 'Go to Financials' : 'Connect accounts'} &rarr;
          </Link>
        </div>
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to Financials</Link>
          <h2 className="text-2xl font-bold mt-1">Budget vs Actual</h2>
        </div>
      </div>
    );
  }

  // ─── Variance bar helper (visual progress indicator) ──────────────

  function VarianceBar({ budget, actual, favorableWhenUnder }: { budget: number; actual: number; favorableWhenUnder?: boolean }) {
    if (budget === 0) return null;
    const pct = (actual / budget) * 100;
    const clamped = Math.min(Math.max(pct, 0), 200);
    const barWidth = Math.min(clamped, 100);
    const overflowWidth = clamped > 100 ? Math.min(clamped - 100, 100) : 0;

    const isOver = actual > budget;
    const favorable = favorableWhenUnder ? !isOver : isOver;
    const barColor = favorable ? 'bg-emerald-400 dark:bg-emerald-500' : isOver ? 'bg-red-400 dark:bg-red-500' : 'bg-amber-400 dark:bg-amber-500';

    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
          {overflowWidth > 0 && (
            <div className="absolute right-0 top-0 h-full bg-red-300 dark:bg-red-600 rounded-r-full opacity-50" style={{ width: `${overflowWidth}%` }} />
          )}
          {/* Budget line marker at 100% */}
          <div className="absolute top-0 h-full w-0.5 bg-foreground/30" style={{ left: '100%', transform: 'translateX(-1px)' }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{formatPercent(Math.round(pct))}</span>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Financials
          </Link>
          <h2 className="text-2xl font-bold mt-1">Budget vs Actual</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasBudget && materialVarianceCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {materialVarianceCount} material variance{materialVarianceCount !== 1 ? 's' : ''}
            </span>
          )}
          <Link
            href="/financials/budget/edit"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            {hasBudget ? 'Edit Budget' : 'Set Budget'}
          </Link>
        </div>
      </div>

      {/* No budget smart prompt (Fathom pattern) */}
      {!hasBudget && (
        <div className="rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-2.5 shrink-0">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l3-3m0 0l3 3m-3-3v8.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">No budget set yet</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Showing actual figures only. Set a budget to unlock variance analysis, threshold alerts, and performance tracking.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Link
                  href="/financials/budget/edit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Create Budget
                </Link>
                <span className="text-xs text-blue-500 dark:text-blue-400">Takes about 5 minutes</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Summary Cards (Fathom/DataRails pattern - budget vs actual side by side) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenue', row: revenueRow, favorableWhenUnder: false },
          { label: 'Gross Profit', row: gpRow, favorableWhenUnder: false },
          { label: 'Operating Expenses', row: expenseRow, favorableWhenUnder: true },
          { label: 'Net Profit', row: netProfitRow, favorableWhenUnder: false },
        ].map((card, i) => {
          const actual = card.row?.actual ?? 0;
          const budget = card.row?.budget ?? 0;
          const variance = actual - budget;
          const variancePct = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;
          const favorable = card.favorableWhenUnder ? variance < 0 : variance > 0;
          const isPositiveMetric = card.label !== 'Operating Expenses';

          return (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
              <p className={`text-lg font-bold ${isPositiveMetric ? (actual > 0 ? 'text-foreground' : 'text-red-600') : 'text-foreground'}`}>
                {formatCurrency(actual)}
              </p>
              {hasBudget && budget !== 0 && (
                <>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Budget: {formatCurrency(budget)}</span>
                    <span className={`font-medium ${favorable ? 'text-emerald-600' : variance === 0 ? 'text-muted-foreground' : 'text-red-600'}`}>
                      {variance === 0 ? 'On target' : `${variancePct > 0 ? '+' : ''}${formatPercent(variancePct)}`}
                    </span>
                  </div>
                  <VarianceBar budget={budget} actual={actual} favorableWhenUnder={card.favorableWhenUnder} />
                </>
              )}
              {!hasBudget && (
                <p className="text-[10px] text-muted-foreground/60">No budget set</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ReportControls
            availablePeriods={availablePeriods}
            showComparison={false}
            showViewMode={false}
            showSearch={true}
            onChange={setControls}
            state={controls}
            exportTitle="budget-vs-actual"
            exportData={csvData}
            hasBudget={hasBudget}
          />
        </div>
        {hasBudget && (
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              checked={suppressMinor}
              onChange={(e) => setSuppressMinor(e.target.checked)}
              className="rounded border-muted-foreground/30"
            />
            Hide &lt;5% variances
          </label>
        )}
      </div>

      {/* Legend (explains favorable semantics - Kevin Steel pattern) */}
      {hasBudget && (
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Favourable (revenue above / costs below budget)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            Watch (5-10% variance)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            Adverse (costs above / revenue below budget)
          </span>
        </div>
      )}

      {/* Main table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No periods match your filter. Adjust the date selection above.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold min-w-[260px] sticky left-0 bg-muted/50 z-10">
                  Category
                </th>
                <th className="text-right px-4 py-3 font-semibold min-w-[110px]">
                  <span className={hasBudget ? '' : 'text-muted-foreground/40'}>Budget</span>
                </th>
                <th className="text-right px-4 py-3 font-semibold min-w-[110px]">Actual</th>
                <th className="text-right px-4 py-3 font-semibold min-w-[100px]">
                  <span className={hasBudget ? '' : 'text-muted-foreground/40'}>Variance</span>
                </th>
                {hasBudget && (
                  <th className="text-center px-3 py-3 font-semibold min-w-[120px]">Progress</th>
                )}
                <th className="text-center px-3 py-3 font-semibold min-w-[90px]">
                  <span className={hasBudget ? '' : 'text-muted-foreground/40'}>Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((line, idx) => {
                if (line.header) {
                  return (
                    <tr key={idx} className="border-b bg-muted/30">
                      <td colSpan={hasBudget ? 6 : 6} className="px-4 py-2.5 font-semibold text-muted-foreground uppercase text-xs tracking-wide sticky left-0 bg-muted/30 z-10">
                        {line.category}
                      </td>
                    </tr>
                  );
                }

                const variance = line.actual - line.budget;
                const variancePct = line.budget !== 0 ? ((variance / Math.abs(line.budget)) * 100) : (line.actual !== 0 ? 100 : 0);
                const severity = getVarianceSeverity(variancePct);

                let favorable: boolean | null = null;
                if (variance !== 0 && line.favorableWhenUnder !== undefined) {
                  favorable = line.favorableWhenUnder ? variance < 0 : variance > 0;
                }

                const badge = hasBudget && line.budget !== 0 ? getSeverityBadge(severity, favorable) : null;

                const varianceColor = favorable === true
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : favorable === false
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground';

                // Variance text: "5% over" / "3% under" (human-readable, not raw %)
                const varianceText = (() => {
                  if (!hasBudget || line.budget === 0) return '\u2014';
                  if (variance === 0) return 'On target';
                  const absPct = formatPercent(Math.abs(variancePct));
                  const direction = line.favorableWhenUnder
                    ? (variance > 0 ? 'over' : 'under')
                    : (variance > 0 ? 'above' : 'below');
                  return `${absPct} ${direction}`;
                })();

                return (
                  <tr
                    key={idx}
                    className={`
                      border-b last:border-b-0 hover:bg-muted/20 transition-colors
                      ${line.separator ? 'border-t-2 border-t-border' : ''}
                      ${line.bold ? 'bg-muted/10' : ''}
                    `}
                  >
                    {/* Category - sticky */}
                    <td className={`px-4 py-2.5 sticky left-0 bg-card z-10 ${line.bold ? 'font-semibold bg-muted/10' : ''} ${line.indent ? 'pl-8 text-muted-foreground' : ''}`}>
                      {line.category}
                    </td>

                    {/* Budget */}
                    <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''} ${!hasBudget ? 'text-muted-foreground/30' : ''}`}>
                      {hasBudget ? formatCurrency(line.budget) : '\u2014'}
                    </td>

                    {/* Actual */}
                    <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''}`}>
                      {formatCurrency(line.actual)}
                    </td>

                    {/* Variance (amount + human-readable %) */}
                    <td className={`text-right px-4 py-2.5 ${line.bold ? 'font-semibold' : ''}`}>
                      {hasBudget && line.budget !== 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`font-mono text-xs ${varianceColor}`}>
                            {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                          </span>
                          <span className={`text-[10px] ${varianceColor}`}>{varianceText}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground/30">{'\u2014'}</span>
                      )}
                    </td>

                    {/* Progress bar (DataRails gauge pattern) */}
                    {hasBudget && (
                      <td className="px-3 py-2.5">
                        {!line.header && line.budget !== 0 && (
                          <VarianceBar budget={line.budget} actual={line.actual} favorableWhenUnder={line.favorableWhenUnder} />
                        )}
                      </td>
                    )}

                    {/* Status badge (tolerance-based) */}
                    <td className="text-center px-3 py-2.5">
                      {badge && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Gross margin / net margin footnote */}
      {rows.length > 0 && (
        <div className="flex items-center gap-6 px-1">
          {[
            { label: 'Gross Margin', value: (revenueRow?.actual ?? 0) > 0 ? ((gpRow?.actual ?? 0) / (revenueRow?.actual ?? 1)) * 100 : 0 },
            { label: 'Net Margin', value: (revenueRow?.actual ?? 0) > 0 ? ((netProfitRow?.actual ?? 0) / (revenueRow?.actual ?? 1)) * 100 : 0 },
            { label: 'Cost Ratio', value: (revenueRow?.actual ?? 0) > 0 ? ((cosRow?.actual ?? 0) / (revenueRow?.actual ?? 1)) * 100 : 0 },
            { label: 'OpEx Ratio', value: (revenueRow?.actual ?? 0) > 0 ? ((expenseRow?.actual ?? 0) / (revenueRow?.actual ?? 1)) * 100 : 0 },
          ].map((metric, i) => (
            <div key={i} className="text-xs">
              <span className="text-muted-foreground">{metric.label}: </span>
              <span className="font-medium">{formatPercent(metric.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
