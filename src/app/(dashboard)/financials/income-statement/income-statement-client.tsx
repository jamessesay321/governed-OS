'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/components/providers/currency-context';
import { formatPercent } from '@/lib/formatting/currency';
import {
  ReportControls,
  getDefaultReportState,
  ReportControlsState,
} from '@/components/financial/report-controls';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { ChallengeButton } from '@/components/shared/challenge-panel';
import { ExportButton } from '@/components/shared/export-button';
import type { ExportColumn } from '@/components/shared/export-button';
import { CrossRef } from '@/components/shared/in-page-link';
import { DrillableNumber } from '@/components/data-primitives';
import type { DrillableValue } from '@/components/data-primitives';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';

type AccountRow = { id?: string; name: string; code: string; amount: number; category?: string };
type SubCategory = { label: string; key: string; rows: AccountRow[]; total: number };
type Section = { label: string; class: string; total: number; rows: AccountRow[]; subCategories?: SubCategory[] };
type PeriodPnL = {
  period: string;
  sections: Section[];
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

type Props = {
  connected: boolean;
  periods: PeriodPnL[];
  orgId: string;
  lastSyncAt: string | null;
};

function formatMonth(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short' });
}

function formatPeriodRange(periods: string[]): string {
  if (periods.length === 0) return '';
  const sorted = [...periods].sort();
  const first = new Date(sorted[0]);
  const last = new Date(sorted[sorted.length - 1]);
  return `${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} \u2013 ${last.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
}

export function IncomeStatementClient({ connected, periods, orgId, lastSyncAt }: Props) {
  const { format: formatCurrency } = useCurrency();
  const hasData = periods.length > 0;

  const availablePeriods = useMemo(
    () => periods.map((p) => p.period).sort(),
    [periods]
  );

  const { yearEndMonth } = useAccountingConfig();
  const { openDrill } = useDrillDown();
  const globalPeriod = useGlobalPeriodContext();
  const [controls, setControls] = useState<ReportControlsState>(() =>
    getDefaultReportState(availablePeriods, yearEndMonth)
  );

  // Sync from global period selector when it changes
  const prevGlobalPeriodRef = useRef(globalPeriod.period);
  useEffect(() => {
    if (globalPeriod.period && globalPeriod.period !== prevGlobalPeriodRef.current) {
      prevGlobalPeriodRef.current = globalPeriod.period;
      setControls((prev) => ({
        ...prev,
        selectedPeriods: globalPeriod.selectedPeriods.filter((p) =>
          availablePeriods.includes(p)
        ),
      }));
    }
  }, [globalPeriod.period, globalPeriod.selectedPeriods, availablePeriods]);

  const filteredPeriods = useMemo(
    () => periods.filter((p) => controls.selectedPeriods.includes(p.period)),
    [periods, controls.selectedPeriods]
  );

  if (!connected || !hasData) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800 uppercase tracking-wide">
              No Data
            </span>
            <span className="text-sm text-amber-800">
              Connect your accounting software to see your Income Statement.
            </span>
          </div>
          <Link href="/integrations" className="text-sm font-medium text-amber-900 underline hover:no-underline">
            Connect accounts &rarr;
          </Link>
        </div>
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Financials
          </Link>
          <h2 className="text-2xl font-bold mt-1">Income Statement (P&amp;L)</h2>
        </div>
      </div>
    );
  }

  // Build a cross-period table: rows are account names, columns are months
  // Get unique account names per section across all periods
  // Include Finance Costs if present in any period
  const hasFinanceCosts = filteredPeriods.some((p) =>
    p.sections.some((s) => s.class === 'FINANCE_COSTS')
  );

  // Detect actual section class names from data (supports both legacy Xero classes
  // and semantic taxonomy section names from buildSemanticPnL)
  const actualSectionClasses = new Set<string>();
  for (const p of filteredPeriods) {
    for (const s of p.sections) {
      actualSectionClasses.add(s.class);
    }
  }

  // Normalise section lookup: both legacy (DIRECTCOSTS) and semantic (COST_OF_SALES)
  // map to the same position in the P&L
  const normaliseSectionClass = (cls: string): string => {
    const map: Record<string, string> = {
      COST_OF_SALES: 'DIRECTCOSTS',
      OPERATING_EXPENSES: 'EXPENSE',
      OTHER_INCOME: 'OTHER_INCOME',
      TAX: 'TAX',
      INTEREST_PAYABLE: 'INTEREST_PAYABLE',
    };
    return map[cls] ?? cls;
  };

  // Build ordered list of sections from actual data
  const canonicalOrder = ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS', 'INTEREST_PAYABLE', 'FINANCE_COSTS', 'OTHER_INCOME', 'TAX'];
  const sectionOrder = canonicalOrder.filter((c) => {
    return actualSectionClasses.has(c) ||
      [...actualSectionClasses].some((actual) => normaliseSectionClass(actual) === c);
  });

  const sectionLabels: Record<string, string> = {
    REVENUE: 'Revenue',
    DIRECTCOSTS: 'Cost of Goods Sold',
    COST_OF_SALES: 'Cost of Goods Sold',
    EXPENSE: 'Operating Expenses',
    OPERATING_EXPENSES: 'Operating Expenses',
    OVERHEADS: 'Overheads',
    FINANCE_COSTS: 'Finance Costs',
    INTEREST_PAYABLE: 'Interest Payable',
    OTHER_INCOME: 'Other Income',
    TAX: 'Tax',
  };

  // Plain-English descriptions for each P&L section
  const sectionDescriptions: Record<string, string> = {
    REVENUE: 'What the business earned from sales and services',
    DIRECTCOSTS: 'Costs directly tied to delivering your products or services',
    COST_OF_SALES: 'Costs directly tied to delivering your products or services',
    EXPENSE: 'Day-to-day costs of running the business',
    OPERATING_EXPENSES: 'Day-to-day costs of running the business',
    OVERHEADS: 'Fixed costs like rent, utilities, and insurance',
    FINANCE_COSTS: 'Interest and fees on loans, MCAs, and other debt facilities',
    INTEREST_PAYABLE: 'Interest and fees on loans and borrowings',
    OTHER_INCOME: 'Non-trading income like interest received and grants',
    TAX: 'Corporation tax and other tax charges',
  };

  const isDetailedView = controls.viewMode === 'detailed';

  // Helper: find section in period data, matching either exact or normalised class
  const findSection = (p: PeriodPnL, cls: string): Section | undefined => {
    return p.sections.find((s) => s.class === cls || normaliseSectionClass(s.class) === cls);
  };

  // Collect all account names per section + name-to-code mapping
  // Also collect sub-category structure when available
  const sectionAccounts = new Map<string, string[]>();
  const sectionSubCategories = new Map<string, SubCategory[]>();
  const accountCodeMap = new Map<string, string>(); // accountName -> accountCode
  const accountIdMap = new Map<string, string>(); // accountName -> accountId (UUID)
  for (const cls of sectionOrder) {
    const names = new Set<string>();
    const subCatMap = new Map<string, SubCategory>();
    for (const p of filteredPeriods) {
      const section = findSection(p, cls);
      if (section) {
        for (const r of section.rows) {
          names.add(r.name);
          if (r.code && !accountCodeMap.has(r.name)) {
            accountCodeMap.set(r.name, r.code);
          }
          if (r.id && !accountIdMap.has(r.name)) {
            accountIdMap.set(r.name, r.id);
          }
        }
        // Build sub-category list from first period that has them
        if (section.subCategories && section.subCategories.length > 0 && subCatMap.size === 0) {
          for (const sc of section.subCategories) {
            subCatMap.set(sc.key, sc);
          }
        }
      }
    }
    sectionAccounts.set(cls, Array.from(names).sort());
    if (subCatMap.size > 0) {
      sectionSubCategories.set(cls, Array.from(subCatMap.values()));
    }
  }

  // Build lookup: period -> section class (normalised) -> account name -> amount
  const lookup = new Map<string, Map<string, Map<string, number>>>();
  for (const p of filteredPeriods) {
    const sectionMap = new Map<string, Map<string, number>>();
    for (const section of p.sections) {
      const accMap = new Map<string, number>();
      for (const r of section.rows) {
        accMap.set(r.name, (accMap.get(r.name) ?? 0) + r.amount);
      }
      // Store under normalised key so both DIRECTCOSTS and COST_OF_SALES resolve
      const normKey = normaliseSectionClass(section.class);
      if (sectionMap.has(normKey)) {
        // Merge if there's already a section (shouldn't happen but be safe)
        const existing = sectionMap.get(normKey)!;
        accMap.forEach((v, k) => existing.set(k, (existing.get(k) ?? 0) + v));
      } else {
        sectionMap.set(normKey, accMap);
      }
      // Also store under original key for exact lookups
      if (normKey !== section.class) {
        sectionMap.set(section.class, accMap);
      }
    }
    lookup.set(p.period, sectionMap);
  }

  const sortedPeriods = [...filteredPeriods].sort((a, b) => a.period.localeCompare(b.period));

  type RowDef = {
    label: string;
    description?: string;
    values: number[];
    bold?: boolean;
    indent?: boolean;
    separator?: boolean;
    profitRow?: boolean;
    /** Inline margin % for subtotal rows (e.g. Gross Profit = GP/Revenue) */
    marginPcts?: (string | null)[];
    sectionHeader?: boolean;
    /** Sub-category header within a section (e.g. "Staff Costs" within Operating Expenses) */
    subCategoryHeader?: boolean;
    /** If set, clicking this row opens the drill-down sheet for the first period */
    drillSectionClass?: string;
    /** Account code for individual account rows */
    accountCode?: string;
    /** Account UUID for drill-down (from chart_of_accounts.id) */
    accountId?: string;
    /** Parent section class for individual account rows */
    sectionClass?: string;
  };

  const rows: RowDef[] = [];

  for (const cls of sectionOrder) {
    const names = sectionAccounts.get(cls) ?? [];
    const subCategories = sectionSubCategories.get(cls);
    // Section total row with plain-English description
    const sectionTotals = sortedPeriods.map((p) => {
      const section = findSection(p, cls);
      return section?.total ?? 0;
    });
    rows.push({
      label: sectionLabels[cls] ?? cls,
      description: sectionDescriptions[cls],
      values: sectionTotals,
      bold: true,
      sectionHeader: true,
      drillSectionClass: cls,
    });

    // Individual account rows (only shown in detailed view)
    if (isDetailedView) {
      if (subCategories && subCategories.length > 1) {
        // Render accounts grouped by sub-category (management account style)
        for (const sc of subCategories) {
          const scAccountNames = sc.rows.map((r) => r.name);
          // Sub-category total row
          const scTotals = sortedPeriods.map((p) => {
            const sectionMap = lookup.get(p.period);
            const accMap = sectionMap?.get(cls);
            if (!accMap) return 0;
            return scAccountNames.reduce((sum, name) => sum + (accMap.get(name) ?? 0), 0);
          });
          rows.push({
            label: sc.label,
            values: scTotals,
            indent: true,
            bold: true,
            subCategoryHeader: true,
            sectionClass: cls,
          });
          // Individual accounts within sub-category
          for (const name of scAccountNames) {
            const values = sortedPeriods.map((p) => {
              const sectionMap = lookup.get(p.period);
              const accMap = sectionMap?.get(cls);
              return accMap?.get(name) ?? 0;
            });
            rows.push({ label: name, values, indent: true, accountCode: accountCodeMap.get(name), accountId: accountIdMap.get(name), sectionClass: cls });
          }
        }
        // Any accounts not in sub-categories (unmapped)
        const subCatAccountNames = new Set(subCategories.flatMap((sc) => sc.rows.map((r) => r.name)));
        const unmapped = names.filter((n) => !subCatAccountNames.has(n));
        for (const name of unmapped) {
          const values = sortedPeriods.map((p) => {
            const sectionMap = lookup.get(p.period);
            const accMap = sectionMap?.get(cls);
            return accMap?.get(name) ?? 0;
          });
          rows.push({ label: name, values, indent: true, accountCode: accountCodeMap.get(name), accountId: accountIdMap.get(name), sectionClass: cls });
        }
      } else {
        // Flat account list (no sub-categories or only one)
        for (const name of names) {
          const values = sortedPeriods.map((p) => {
            const sectionMap = lookup.get(p.period);
            const accMap = sectionMap?.get(cls);
            return accMap?.get(name) ?? 0;
          });
          rows.push({ label: name, values, indent: true, accountCode: accountCodeMap.get(name), accountId: accountIdMap.get(name), sectionClass: cls });
        }
      }
    }

    // After DIRECTCOSTS/COST_OF_SALES, add Gross Profit with inline margin %
    if (cls === 'DIRECTCOSTS' || cls === 'COST_OF_SALES') {
      const gpValues = sortedPeriods.map((p) => p.grossProfit);
      const gpMargins = sortedPeriods.map((p) =>
        p.revenue > 0 ? formatPercent(p.grossProfit / p.revenue, true) : null
      );
      rows.push({
        label: 'Gross Profit',
        values: gpValues,
        bold: true,
        separator: true,
        profitRow: true,
        marginPcts: gpMargins,
        drillSectionClass: 'REVENUE',
      });
    }
  }

  // Net Profit with inline margin %
  const netProfitValues = sortedPeriods.map((p) => p.netProfit);
  const netMargins = sortedPeriods.map((p) =>
    p.revenue > 0 ? formatPercent(p.netProfit / p.revenue, true) : null
  );
  rows.push({
    label: 'Net Profit',
    values: netProfitValues,
    bold: true,
    separator: true,
    profitRow: true,
    marginPcts: netMargins,
    drillSectionClass: 'EXPENSE',
  });

  // Build flat export data: all account rows plus section totals and profit rows
  const exportColumns: ExportColumn[] = [
    { header: 'Category', key: 'category', format: 'text' },
    { header: 'Account', key: 'account', format: 'text' },
    ...sortedPeriods.map((p) => ({
      header: formatMonth(p.period),
      key: p.period,
      format: 'currency' as const,
    })),
    { header: 'Total', key: 'total', format: 'currency' as const },
  ];

  const exportData: Record<string, unknown>[] = rows.map((row) => {
    const obj: Record<string, unknown> = {
      category: row.sectionClass ? (sectionLabels[row.sectionClass] ?? row.sectionClass) : row.label,
      account: row.indent ? row.label : row.label,
    };
    sortedPeriods.forEach((p, i) => {
      obj[p.period] = row.values[i] ?? 0;
    });
    obj['total'] = row.values.reduce((a, b) => a + b, 0);
    return obj;
  });

  // Apply search filter to rows
  const displayRows = controls.searchQuery
    ? rows.filter((row) => {
        if (row.bold || row.separator || row.profitRow || row.subCategoryHeader) return true; // Always show totals/summaries
        return row.label.toLowerCase().includes(controls.searchQuery.toLowerCase());
      })
    : rows;

  // Build CSV export data
  const csvData: Record<string, unknown>[] = rows
    .filter((row) => !controls.searchQuery || row.label.toLowerCase().includes(controls.searchQuery.toLowerCase()) || row.bold)
    .map((row) => {
      const obj: Record<string, unknown> = { Account: row.label };
      sortedPeriods.forEach((p, i) => {
        obj[p.period] = row.values[i];
      });
      obj['Total'] = row.values.reduce((a, b) => a + b, 0);
      return obj;
    });

  // Summary totals
  const totalRevenue = filteredPeriods.reduce((s, p) => s + p.revenue, 0);
  const totalGrossProfit = filteredPeriods.reduce((s, p) => s + p.grossProfit, 0);
  const totalNetProfit = filteredPeriods.reduce((s, p) => s + p.netProfit, 0);
  const grossMargin = totalRevenue > 0 ? formatPercent(totalGrossProfit / totalRevenue, true) : '0%';
  const netMargin = totalRevenue > 0 ? formatPercent(totalNetProfit / totalRevenue, true) : '0%';

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Financials
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-2xl font-bold">Income Statement (P&amp;L)</h2>
            <DataFreshness lastSyncAt={lastSyncAt} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatPeriodRange(filteredPeriods.map((p) => p.period))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={exportData}
            columns={exportColumns}
            filename="income-statement"
            title="Income Statement (P&L)"
            subtitle={formatPeriodRange(filteredPeriods.map((p) => p.period))}
          />
          <ChallengeButton
            page="income-statement"
            metricLabel="Income Statement"
            period={filteredPeriods[filteredPeriods.length - 1]?.period}
          />
        </div>
      </div>

      {/* AI Narrative Summary */}
      <NarrativeSummary
        orgId={orgId}
        period={controls.selectedPeriods[controls.selectedPeriods.length - 1] ?? ''}
        narrativeEndpoint="narrative/income-statement"
      />

      {/* Report Controls */}
      <ReportControls
        availablePeriods={availablePeriods}
        showComparison={false}
        showViewMode={true}
        showSearch={true}
        onChange={setControls}
        state={controls}
        exportTitle="income-statement"
        exportData={csvData}
      />

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[200px] sticky left-0 bg-muted/50">
                Category
              </th>
              {sortedPeriods.map((p) => (
                <th key={p.period} className="text-right px-3 py-3 font-semibold min-w-[85px]">
                  {formatMonth(p.period)}
                </th>
              ))}
              <th className="text-right px-4 py-3 font-semibold min-w-[100px] border-l">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const total = row.values.reduce((a, b) => a + b, 0);
              const totalMarginPct = row.marginPcts && totalRevenue > 0
                ? formatPercent(total / totalRevenue, true)
                : null;
              return (
                <tr
                  key={idx}
                  className={`
                    border-b last:border-b-0 hover:bg-muted/30 transition-colors
                    ${row.separator ? 'border-t-2 border-t-border' : ''}
                    ${row.bold ? 'bg-muted/20' : ''}
                    ${row.drillSectionClass ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => {
                    if (row.drillSectionClass && sortedPeriods.length > 0) {
                      // Use the latest period for drill-down; build a PnLSection-like object
                      const latestPeriod = sortedPeriods[sortedPeriods.length - 1];
                      const section = latestPeriod.sections.find((s) => s.class === row.drillSectionClass);
                      if (section) {
                        openDrill({
                          type: 'pnl_section',
                          section: {
                            label: section.label,
                            class: section.class,
                            total: section.total,
                            rows: section.rows.map((r) => ({
                              accountId: r.id || r.code,
                              accountCode: r.code,
                              accountName: r.name,
                              accountType: '',
                              accountClass: section.class,
                              amount: r.amount,
                              transactionCount: 0,
                            })),
                          },
                          period: latestPeriod.period,
                        });
                      }
                    }
                  }}
                >
                  <td
                    className={`px-4 py-2.5 sticky left-0 bg-card ${
                      row.bold && !row.subCategoryHeader ? 'font-semibold bg-muted/20' : ''
                    } ${row.subCategoryHeader ? 'pl-6 font-medium text-foreground/80 text-[13px] border-t border-border/30 pt-3' : ''
                    } ${row.indent && !row.subCategoryHeader ? 'pl-8 text-muted-foreground' : ''}`}
                  >
                    <div>
                      {(row.sectionHeader || row.profitRow) ? (
                        <FinancialTooltip term={row.label} orgId={orgId}>
                          {row.label}
                        </FinancialTooltip>
                      ) : (
                        row.label
                      )}
                      {row.sectionHeader && row.description && (
                        <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                          {row.description}
                        </span>
                      )}
                    </div>
                  </td>
                  {row.values.map((v, i) => {
                    const period = sortedPeriods[i]?.period;
                    const isDrillable = !!(row.drillSectionClass || row.accountId || row.accountCode);
                    const drillValue: DrillableValue = {
                      value: v,
                      type: 'actual',
                      label: row.label,
                      drillable: isDrillable,
                      prefix: '',
                      compact: false,
                      wholeNumbers: true,
                    };
                    const handleDrillClick = () => {
                      if (!period) return;
                      if (row.accountId && row.sectionClass) {
                        openDrill({
                          type: 'account',
                          accountId: row.accountId,
                          accountName: row.label,
                          accountCode: row.accountCode || '',
                          amount: v,
                          period,
                        });
                      } else if (row.drillSectionClass) {
                        const pData = sortedPeriods[i];
                        const section = pData?.sections.find((s) => s.class === row.drillSectionClass);
                        if (section) {
                          openDrill({
                            type: 'pnl_section',
                            section: {
                              label: section.label,
                              class: section.class,
                              total: section.total,
                              rows: section.rows.map((r) => ({
                                accountId: r.id || r.code,
                                accountCode: r.code,
                                accountName: r.name,
                                accountType: '',
                                accountClass: section.class,
                                amount: r.amount,
                                transactionCount: 0,
                              })),
                            },
                            period,
                          });
                        }
                      }
                    };
                    return (
                      <td
                        key={i}
                        className={`text-right px-3 py-2.5 font-mono text-xs ${
                          row.bold ? 'font-semibold' : ''
                        } ${
                          row.profitRow
                            ? v >= 0
                              ? 'text-emerald-600'
                              : 'text-red-600'
                            : row.indent
                              ? 'text-muted-foreground'
                              : ''
                        }`}
                      >
                        <div>
                          {isDrillable ? (
                            <DrillableNumber
                              data={drillValue}
                              onDrillClick={handleDrillClick}
                              size="sm"
                              showTooltip={true}
                            />
                          ) : (
                            formatCurrency(v)
                          )}
                        </div>
                        {row.marginPcts?.[i] && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {row.marginPcts[i]} margin
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td
                    className={`text-right px-4 py-2.5 font-mono text-xs border-l ${
                      row.bold ? 'font-bold' : 'font-semibold'
                    } ${
                      row.profitRow
                        ? total >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                        : ''
                    }`}
                  >
                    <div>{formatCurrency(total)}</div>
                    {totalMarginPct && (
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {totalMarginPct} margin
                      </div>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), positive: true },
          { label: 'Gross Margin', value: grossMargin, positive: totalGrossProfit > 0 },
          { label: 'Net Margin', value: netMargin, positive: totalNetProfit > 0 },
          { label: 'Net Profit', value: formatCurrency(totalNetProfit), positive: totalNetProfit > 0 },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/financials/balance-sheet" label="Balance Sheet" />
        <CrossRef href="/financials/cash-flow" label="Cash Flow" />
        <CrossRef href="/variance" label="Variance Analysis" />
        <CrossRef href="/dashboard/profitability" label="Profitability" />
      </div>
    </div>
  );
}
