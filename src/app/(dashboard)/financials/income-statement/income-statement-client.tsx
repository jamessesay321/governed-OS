'use client';

import Link from 'next/link';
import { useCurrency } from '@/components/providers/currency-context';

type AccountRow = { name: string; code: string; amount: number };
type Section = { label: string; class: string; total: number; rows: AccountRow[] };
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

export function IncomeStatementClient({ connected, periods }: Props) {
  const { format: formatCurrency } = useCurrency();
  const hasData = periods.length > 0;

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
  const sectionOrder = ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'];
  const sectionLabels: Record<string, string> = {
    REVENUE: 'Revenue',
    DIRECTCOSTS: 'Cost of Goods Sold',
    EXPENSE: 'Operating Expenses',
    OVERHEADS: 'Overheads',
  };

  // Collect all account names per section
  const sectionAccounts = new Map<string, string[]>();
  for (const cls of sectionOrder) {
    const names = new Set<string>();
    for (const p of periods) {
      const section = p.sections.find((s) => s.class === cls);
      if (section) {
        for (const r of section.rows) names.add(r.name);
      }
    }
    sectionAccounts.set(cls, Array.from(names).sort());
  }

  // Build lookup: period -> section class -> account name -> amount
  const lookup = new Map<string, Map<string, Map<string, number>>>();
  for (const p of periods) {
    const sectionMap = new Map<string, Map<string, number>>();
    for (const section of p.sections) {
      const accMap = new Map<string, number>();
      for (const r of section.rows) {
        accMap.set(r.name, (accMap.get(r.name) ?? 0) + r.amount);
      }
      sectionMap.set(section.class, accMap);
    }
    lookup.set(p.period, sectionMap);
  }

  const sortedPeriods = [...periods].sort((a, b) => a.period.localeCompare(b.period));

  type RowDef = {
    label: string;
    values: number[];
    bold?: boolean;
    indent?: boolean;
    separator?: boolean;
    profitRow?: boolean;
  };

  const rows: RowDef[] = [];

  for (const cls of sectionOrder) {
    const names = sectionAccounts.get(cls) ?? [];
    // Section total row
    const sectionTotals = sortedPeriods.map((p) => {
      const section = p.sections.find((s) => s.class === cls);
      return section?.total ?? 0;
    });
    rows.push({ label: sectionLabels[cls] ?? cls, values: sectionTotals, bold: true });

    // Individual account rows
    for (const name of names) {
      const values = sortedPeriods.map((p) => {
        const sectionMap = lookup.get(p.period);
        const accMap = sectionMap?.get(cls);
        return accMap?.get(name) ?? 0;
      });
      rows.push({ label: name, values, indent: true });
    }

    // After DIRECTCOSTS, add Gross Profit
    if (cls === 'DIRECTCOSTS') {
      const gpValues = sortedPeriods.map((p) => p.grossProfit);
      rows.push({ label: 'Gross Profit', values: gpValues, bold: true, separator: true, profitRow: true });
    }
  }

  // Net Profit
  const netProfitValues = sortedPeriods.map((p) => p.netProfit);
  rows.push({ label: 'Net Profit', values: netProfitValues, bold: true, separator: true, profitRow: true });

  // Summary totals
  const totalRevenue = periods.reduce((s, p) => s + p.revenue, 0);
  const totalGrossProfit = periods.reduce((s, p) => s + p.grossProfit, 0);
  const totalNetProfit = periods.reduce((s, p) => s + p.netProfit, 0);
  const grossMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const netMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Financials
          </Link>
          <h2 className="text-2xl font-bold mt-1">Income Statement (P&amp;L)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatPeriodRange(periods.map((p) => p.period))}
          </p>
        </div>
      </div>

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
            {rows.map((row, idx) => {
              const total = row.values.reduce((a, b) => a + b, 0);
              return (
                <tr
                  key={idx}
                  className={`
                    border-b last:border-b-0 hover:bg-muted/30 transition-colors
                    ${row.separator ? 'border-t-2 border-t-border' : ''}
                    ${row.bold ? 'bg-muted/20' : ''}
                  `}
                >
                  <td
                    className={`px-4 py-2.5 sticky left-0 bg-card ${
                      row.bold ? 'font-semibold bg-muted/20' : ''
                    } ${row.indent ? 'pl-8 text-muted-foreground' : ''}`}
                  >
                    {row.label}
                  </td>
                  {row.values.map((v, i) => (
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
                      {formatCurrency(v)}
                    </td>
                  ))}
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
                    {formatCurrency(total)}
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
          { label: 'Gross Margin', value: `${grossMargin}%`, positive: totalGrossProfit > 0 },
          { label: 'Net Margin', value: `${netMargin}%`, positive: totalNetProfit > 0 },
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
    </div>
  );
}
