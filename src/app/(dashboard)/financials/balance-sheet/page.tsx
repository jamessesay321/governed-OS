'use client';

import Link from 'next/link';

function fmt(n: number): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `(${formatted})` : formatted;
}

type LineItem = {
  label: string;
  currentYear: number;
  priorYear: number;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  header?: boolean;
};

// Mock data for a UK SME service business (~£2M revenue)
// Values in £ thousands
const lines: LineItem[] = [
  // Current Assets
  { label: 'Current Assets', currentYear: 0, priorYear: 0, header: true },
  { label: 'Cash and Cash Equivalents', currentYear: 285, priorYear: 218, indent: true },
  { label: 'Accounts Receivable', currentYear: 342, priorYear: 298, indent: true },
  { label: 'Prepayments', currentYear: 48, priorYear: 42, indent: true },
  { label: 'Other Current Assets', currentYear: 15, priorYear: 12, indent: true },
  { label: 'Total Current Assets', currentYear: 690, priorYear: 570, bold: true, separator: true },

  // Non-Current Assets
  { label: 'Non-Current Assets', currentYear: 0, priorYear: 0, header: true },
  { label: 'Property, Plant & Equipment', currentYear: 124, priorYear: 138, indent: true },
  { label: 'Right-of-Use Assets', currentYear: 86, priorYear: 102, indent: true },
  { label: 'Intangible Assets', currentYear: 45, priorYear: 32, indent: true },
  { label: 'Total Non-Current Assets', currentYear: 255, priorYear: 272, bold: true, separator: true },

  // Total Assets
  { label: 'Total Assets', currentYear: 945, priorYear: 842, bold: true, separator: true },

  // Current Liabilities
  { label: 'Current Liabilities', currentYear: 0, priorYear: 0, header: true },
  { label: 'Accounts Payable', currentYear: 156, priorYear: 142, indent: true },
  { label: 'Accruals', currentYear: 78, priorYear: 65, indent: true },
  { label: 'Corporation Tax Payable', currentYear: 42, priorYear: 35, indent: true },
  { label: 'VAT Payable', currentYear: 38, priorYear: 32, indent: true },
  { label: 'PAYE / NI Payable', currentYear: 52, priorYear: 48, indent: true },
  { label: 'Deferred Revenue', currentYear: 65, priorYear: 55, indent: true },
  { label: 'Current Portion of Loans', currentYear: 24, priorYear: 24, indent: true },
  { label: 'Total Current Liabilities', currentYear: 455, priorYear: 401, bold: true, separator: true },

  // Non-Current Liabilities
  { label: 'Non-Current Liabilities', currentYear: 0, priorYear: 0, header: true },
  { label: 'Bank Loans', currentYear: 72, priorYear: 96, indent: true },
  { label: 'Lease Liabilities', currentYear: 68, priorYear: 82, indent: true },
  { label: 'Total Non-Current Liabilities', currentYear: 140, priorYear: 178, bold: true, separator: true },

  // Total Liabilities
  { label: 'Total Liabilities', currentYear: 595, priorYear: 579, bold: true, separator: true },

  // Equity
  { label: 'Equity', currentYear: 0, priorYear: 0, header: true },
  { label: 'Share Capital', currentYear: 10, priorYear: 10, indent: true },
  { label: 'Retained Earnings', currentYear: 340, priorYear: 253, indent: true },
  { label: 'Total Equity', currentYear: 350, priorYear: 263, bold: true, separator: true },

  // Total Liabilities + Equity
  { label: 'Total Liabilities & Equity', currentYear: 945, priorYear: 842, bold: true, separator: true },
];

export default function BalanceSheetPage() {
  return (
    <div className="space-y-6 max-w-4xl">
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
      <div>
        <Link
          href="/financials"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Financials
        </Link>
        <h2 className="text-2xl font-bold mt-1">Balance Sheet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          As at 31 March 2026
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[280px]">Account</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[120px]">2025/26 (£k)</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[120px]">2024/25 (£k)</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[100px]">Change</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              if (line.header) {
                return (
                  <tr key={idx} className="border-b bg-muted/30">
                    <td colSpan={4} className="px-4 py-2.5 font-semibold text-muted-foreground uppercase text-xs tracking-wide">
                      {line.label}
                    </td>
                  </tr>
                );
              }

              const change = line.currentYear - line.priorYear;
              const changePercent = line.priorYear !== 0 ? ((change / line.priorYear) * 100) : 0;

              return (
                <tr
                  key={idx}
                  className={`
                    border-b last:border-b-0 hover:bg-muted/30 transition-colors
                    ${line.separator ? 'border-t-2 border-t-border' : ''}
                    ${line.bold ? 'bg-muted/20' : ''}
                  `}
                >
                  <td className={`px-4 py-2.5 ${line.bold ? 'font-semibold' : ''} ${line.indent ? 'pl-8 text-muted-foreground' : ''}`}>
                    {line.label}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''}`}>
                    £{fmt(line.currentYear)}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''} text-muted-foreground`}>
                    £{fmt(line.priorYear)}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${
                    change > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : change < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                  }`}>
                    {change !== 0 ? `${change > 0 ? '+' : ''}${changePercent.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Key Ratios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current Ratio', value: (690 / 455).toFixed(2), good: 690 / 455 > 1.2 },
          { label: 'Quick Ratio', value: ((690 - 48 - 15) / 455).toFixed(2), good: (690 - 48 - 15) / 455 > 1 },
          { label: 'Debt-to-Equity', value: (595 / 350).toFixed(2), good: 595 / 350 < 2 },
          { label: 'Net Assets', value: '£350k', good: true },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
