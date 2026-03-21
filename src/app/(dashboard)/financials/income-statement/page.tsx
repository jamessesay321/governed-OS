'use client';

import Link from 'next/link';

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

function fmt(n: number): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `(${formatted})` : formatted;
}

function fmtK(n: number): string {
  return `£${fmt(n)}`;
}

// Mock data for a UK SME service business (~£2M revenue)
// Values in £ thousands
const data = {
  revenue: [155, 162, 178, 148, 135, 171, 182, 168, 190, 175, 158, 185],
  cogs: [31, 32, 36, 30, 27, 34, 36, 34, 38, 35, 32, 37],
  salaries: [58, 58, 58, 58, 58, 58, 62, 62, 62, 62, 62, 62],
  rent: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
  marketing: [12, 14, 16, 10, 8, 15, 18, 14, 20, 16, 12, 17],
  technology: [6, 6, 7, 6, 6, 6, 7, 6, 7, 6, 6, 7],
  insurance: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  travel: [4, 5, 6, 3, 2, 5, 7, 4, 8, 5, 3, 6],
  professional: [5, 4, 5, 4, 3, 5, 5, 4, 6, 5, 4, 5],
  otherOpex: [3, 3, 4, 3, 2, 3, 4, 3, 4, 3, 3, 4],
  depreciation: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  interest: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
};

function sumRow(row: number[]): number {
  return row.reduce((a, b) => a + b, 0);
}

function subtractRows(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function sumMultipleRows(...rows: number[][]): number[] {
  return rows[0].map((_, i) => rows.reduce((sum, row) => sum + row[i], 0));
}

type RowDef = {
  label: string;
  values: number[];
  bold?: boolean;
  indent?: boolean;
  separator?: boolean;
};

export default function IncomeStatementPage() {
  const grossProfit = subtractRows(data.revenue, data.cogs);

  const totalOpex = sumMultipleRows(
    data.salaries, data.rent, data.marketing, data.technology,
    data.insurance, data.travel, data.professional, data.otherOpex
  );

  const ebitda = subtractRows(grossProfit, totalOpex);
  const ebit = subtractRows(ebitda, data.depreciation);
  const ebt = subtractRows(ebit, data.interest);

  // Corporation tax at ~19% on positive earnings
  const tax = ebt.map((v) => (v > 0 ? Math.round(v * 0.19) : 0));
  const netProfit = subtractRows(ebt, tax);

  const rows: RowDef[] = [
    { label: 'Revenue', values: data.revenue, bold: true },
    { label: 'Cost of Goods Sold', values: data.cogs },
    { label: 'Gross Profit', values: grossProfit, bold: true, separator: true },
    { label: 'Operating Expenses', values: totalOpex, bold: true },
    { label: 'Salaries & Wages', values: data.salaries, indent: true },
    { label: 'Rent & Rates', values: data.rent, indent: true },
    { label: 'Marketing & Advertising', values: data.marketing, indent: true },
    { label: 'Technology & Software', values: data.technology, indent: true },
    { label: 'Insurance', values: data.insurance, indent: true },
    { label: 'Travel & Entertainment', values: data.travel, indent: true },
    { label: 'Professional Fees', values: data.professional, indent: true },
    { label: 'Other Operating Costs', values: data.otherOpex, indent: true },
    { label: 'EBITDA', values: ebitda, bold: true, separator: true },
    { label: 'Depreciation & Amortisation', values: data.depreciation },
    { label: 'EBIT', values: ebit, bold: true, separator: true },
    { label: 'Interest Expense', values: data.interest },
    { label: 'Earnings Before Tax', values: ebt, bold: true, separator: true },
    { label: 'Corporation Tax (19%)', values: tax },
    { label: 'Net Profit', values: netProfit, bold: true, separator: true },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-200 dark:bg-amber-800 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
            Sample Data
          </span>
          <span className="text-sm text-amber-800 dark:text-amber-200">
            This is illustrative data. Connect your accounts to see your real numbers.
          </span>
        </div>
        <Link
          href="/settings"
          className="text-sm font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline"
        >
          Connect accounts &rarr;
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/financials"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Financials
          </Link>
          <h2 className="text-2xl font-bold mt-1">Income Statement (P&L)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Financial year April 2025 &ndash; March 2026
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
              {MONTHS.map((m) => (
                <th key={m} className="text-right px-3 py-3 font-semibold min-w-[85px]">
                  {m}
                </th>
              ))}
              <th className="text-right px-4 py-3 font-semibold min-w-[100px] border-l">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const total = sumRow(row.values);
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
                        row.label === 'Net Profit' || row.label === 'EBITDA' || row.label === 'Gross Profit'
                          ? v >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                          : row.label.includes('Cost') || row.label.includes('Expense') || row.label.includes('Tax') || row.label.includes('Interest') || row.label.includes('Depreciation') || row.indent
                            ? 'text-red-600/70 dark:text-red-400/70'
                            : ''
                      }`}
                    >
                      {fmtK(v)}
                    </td>
                  ))}
                  <td
                    className={`text-right px-4 py-2.5 font-mono text-xs border-l ${
                      row.bold ? 'font-bold' : 'font-semibold'
                    } ${
                      row.label === 'Net Profit' || row.label === 'EBITDA' || row.label === 'Gross Profit' || row.label === 'Revenue'
                        ? total >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                        : ''
                    }`}
                  >
                    {fmtK(total)}
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
          { label: 'Total Revenue', value: sumRow(data.revenue), positive: true },
          { label: 'Gross Margin', value: `${((sumRow(grossProfit) / sumRow(data.revenue)) * 100).toFixed(1)}%`, positive: true },
          { label: 'EBITDA Margin', value: `${((sumRow(ebitda) / sumRow(data.revenue)) * 100).toFixed(1)}%`, positive: sumRow(ebitda) > 0 },
          { label: 'Net Profit', value: sumRow(netProfit), positive: sumRow(netProfit) > 0 },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {typeof card.value === 'number' ? `£${fmt(card.value)}k` : card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
