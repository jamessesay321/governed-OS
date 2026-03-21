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
  // Operating Activities
  { label: 'Cash Flows from Operating Activities', currentYear: 0, priorYear: 0, header: true },
  { label: 'Net Profit Before Tax', currentYear: 128, priorYear: 98, indent: true },
  { label: 'Adjustments for:', currentYear: 0, priorYear: 0, header: true },
  { label: 'Depreciation & Amortisation', currentYear: 48, priorYear: 45, indent: true },
  { label: 'Interest Expense', currentYear: 24, priorYear: 28, indent: true },
  { label: 'Loss on Disposal of Assets', currentYear: 3, priorYear: 0, indent: true },
  { label: 'Changes in Working Capital:', currentYear: 0, priorYear: 0, header: true },
  { label: 'Increase in Accounts Receivable', currentYear: -44, priorYear: -32, indent: true },
  { label: 'Increase in Prepayments', currentYear: -6, priorYear: -4, indent: true },
  { label: 'Increase in Accounts Payable', currentYear: 14, priorYear: 18, indent: true },
  { label: 'Increase in Accruals', currentYear: 13, priorYear: 8, indent: true },
  { label: 'Increase in Deferred Revenue', currentYear: 10, priorYear: 12, indent: true },
  { label: 'Increase in Tax & NI Payable', currentYear: 15, priorYear: 10, indent: true },
  { label: 'Corporation Tax Paid', currentYear: -35, priorYear: -28, indent: true },
  { label: 'Net Cash from Operating Activities', currentYear: 170, priorYear: 155, bold: true, separator: true },

  // Investing Activities
  { label: 'Cash Flows from Investing Activities', currentYear: 0, priorYear: 0, header: true },
  { label: 'Purchase of Property, Plant & Equipment', currentYear: -18, priorYear: -25, indent: true },
  { label: 'Purchase of Intangible Assets', currentYear: -22, priorYear: -15, indent: true },
  { label: 'Proceeds from Disposal of Assets', currentYear: 5, priorYear: 0, indent: true },
  { label: 'Net Cash Used in Investing Activities', currentYear: -35, priorYear: -40, bold: true, separator: true },

  // Financing Activities
  { label: 'Cash Flows from Financing Activities', currentYear: 0, priorYear: 0, header: true },
  { label: 'Repayment of Bank Loans', currentYear: -24, priorYear: -24, indent: true },
  { label: 'Repayment of Lease Liabilities', currentYear: -20, priorYear: -18, indent: true },
  { label: 'Interest Paid', currentYear: -24, priorYear: -28, indent: true },
  { label: 'Dividends Paid', currentYear: 0, priorYear: -15, indent: true },
  { label: 'Net Cash Used in Financing Activities', currentYear: -68, priorYear: -85, bold: true, separator: true },

  // Summary
  { label: 'Net Increase in Cash', currentYear: 67, priorYear: 30, bold: true, separator: true },
  { label: 'Cash at Beginning of Year', currentYear: 218, priorYear: 188, indent: true },
  { label: 'Cash at End of Year', currentYear: 285, priorYear: 218, bold: true, separator: true },
];

export default function CashFlowPage() {
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
        <h2 className="text-2xl font-bold mt-1">Cash Flow Statement</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Financial year ended 31 March 2026
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[320px]">Description</th>
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
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''} ${
                    line.bold
                      ? line.currentYear >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                      : line.currentYear < 0
                        ? 'text-red-600/70 dark:text-red-400/70'
                        : ''
                  }`}>
                    £{fmt(line.currentYear)}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs text-muted-foreground ${line.bold ? 'font-semibold' : ''}`}>
                    £{fmt(line.priorYear)}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${
                    change > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : change < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                  }`}>
                    {change !== 0 ? `${change > 0 ? '+' : ''}£${fmt(change)}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Operating Cash Flow', value: '£170k', positive: true },
          { label: 'Free Cash Flow', value: `£${fmt(170 - 35)}k`, positive: true },
          { label: 'Cash Position', value: '£285k', positive: true },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
