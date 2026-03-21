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

type BudgetLine = {
  category: string;
  budget: number;
  actual: number;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  header?: boolean;
  favorableWhenUnder?: boolean; // true for costs (under budget = good), false for revenue (over budget = good)
};

// Mock data for a UK SME service business (~£2M revenue)
// Values in £ thousands, full year
const lines: BudgetLine[] = [
  // Revenue
  { category: 'Revenue', budget: 0, actual: 0, header: true },
  { category: 'Consulting Revenue', budget: 1400, actual: 1462, indent: true, favorableWhenUnder: false },
  { category: 'Recurring / Retainer Revenue', budget: 480, actual: 445, indent: true, favorableWhenUnder: false },
  { category: 'Training & Workshops', budget: 120, actual: 100, indent: true, favorableWhenUnder: false },
  { category: 'Total Revenue', budget: 2000, actual: 2007, bold: true, separator: true, favorableWhenUnder: false },

  // Cost of Sales
  { category: 'Cost of Sales', budget: 0, actual: 0, header: true },
  { category: 'Direct Labour (Contractors)', budget: 360, actual: 402, indent: true, favorableWhenUnder: true },
  { category: 'Project Materials & Licences', budget: 40, actual: 38, indent: true, favorableWhenUnder: true },
  { category: 'Total Cost of Sales', budget: 400, actual: 440, bold: true, separator: true, favorableWhenUnder: true },

  // Gross Profit
  { category: 'Gross Profit', budget: 1600, actual: 1567, bold: true, separator: true, favorableWhenUnder: false },

  // Operating Expenses
  { category: 'Operating Expenses', budget: 0, actual: 0, header: true },
  { category: 'Salaries & Wages', budget: 720, actual: 722, indent: true, favorableWhenUnder: true },
  { category: 'Employer NI & Pension', budget: 108, actual: 112, indent: true, favorableWhenUnder: true },
  { category: 'Rent & Rates', budget: 96, actual: 96, indent: true, favorableWhenUnder: true },
  { category: 'Marketing & Advertising', budget: 144, actual: 172, indent: true, favorableWhenUnder: true },
  { category: 'Technology & Software', budget: 72, actual: 80, indent: true, favorableWhenUnder: true },
  { category: 'Insurance', budget: 36, actual: 36, indent: true, favorableWhenUnder: true },
  { category: 'Travel & Entertainment', budget: 48, actual: 58, indent: true, favorableWhenUnder: true },
  { category: 'Professional Fees', budget: 48, actual: 55, indent: true, favorableWhenUnder: true },
  { category: 'Telecommunications', budget: 18, actual: 16, indent: true, favorableWhenUnder: true },
  { category: 'Office Supplies', budget: 12, actual: 10, indent: true, favorableWhenUnder: true },
  { category: 'Training & Development', budget: 24, actual: 18, indent: true, favorableWhenUnder: true },
  { category: 'Other Operating Costs', budget: 36, actual: 39, indent: true, favorableWhenUnder: true },
  { category: 'Total Operating Expenses', budget: 1362, actual: 1414, bold: true, separator: true, favorableWhenUnder: true },

  // EBITDA
  { category: 'EBITDA', budget: 238, actual: 153, bold: true, separator: true, favorableWhenUnder: false },

  // Below EBITDA
  { category: 'Below the Line', budget: 0, actual: 0, header: true },
  { category: 'Depreciation & Amortisation', budget: 48, actual: 48, indent: true, favorableWhenUnder: true },
  { category: 'Interest Expense', budget: 24, actual: 24, indent: true, favorableWhenUnder: true },
  { category: 'Corporation Tax', budget: 32, actual: 15, indent: true, favorableWhenUnder: true },

  // Net Profit
  { category: 'Net Profit', budget: 134, actual: 66, bold: true, separator: true, favorableWhenUnder: false },
];

export default function BudgetPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
        <h2 className="text-2xl font-bold mt-1">Budget vs Actual</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Financial year April 2025 &ndash; March 2026
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[280px]">Category</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[110px]">Budget (£k)</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[110px]">Actual (£k)</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[110px]">Variance (£k)</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[90px]">Variance %</th>
              <th className="text-center px-4 py-3 font-semibold min-w-[80px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              if (line.header) {
                return (
                  <tr key={idx} className="border-b bg-muted/30">
                    <td colSpan={6} className="px-4 py-2.5 font-semibold text-muted-foreground uppercase text-xs tracking-wide">
                      {line.category}
                    </td>
                  </tr>
                );
              }

              const variance = line.actual - line.budget;
              const variancePercent = line.budget !== 0 ? ((variance / line.budget) * 100) : 0;

              // Determine if variance is favorable
              let favorable: boolean | null = null;
              if (variance !== 0 && line.favorableWhenUnder !== undefined) {
                if (line.favorableWhenUnder) {
                  favorable = variance < 0; // Under budget on costs = good
                } else {
                  favorable = variance > 0; // Over budget on revenue = good
                }
              }

              const colorClass = favorable === true
                ? 'text-emerald-600 dark:text-emerald-400'
                : favorable === false
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground';

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
                    {line.category}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''}`}>
                    £{fmt(line.budget)}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''}`}>
                    £{fmt(line.actual)}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''} ${colorClass}`}>
                    {variance !== 0 ? `${variance > 0 ? '+' : ''}£${fmt(variance)}` : '-'}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${colorClass}`}>
                    {variance !== 0 ? `${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%` : '-'}
                  </td>
                  <td className="text-center px-4 py-2.5">
                    {favorable === true && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Favourable
                      </span>
                    )}
                    {favorable === false && (
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                        Adverse
                      </span>
                    )}
                    {favorable === null && variance === 0 && !line.bold && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                        On Budget
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Revenue vs Budget',
            value: `${((2007 / 2000) * 100 - 100).toFixed(1)}%`,
            sub: '£7k over',
            positive: true,
          },
          {
            label: 'OpEx vs Budget',
            value: `+${((1414 / 1362) * 100 - 100).toFixed(1)}%`,
            sub: '£52k over',
            positive: false,
          },
          {
            label: 'EBITDA vs Budget',
            value: `${((153 / 238) * 100 - 100).toFixed(1)}%`,
            sub: '£85k under',
            positive: false,
          },
          {
            label: 'Net Profit vs Budget',
            value: `${((66 / 134) * 100 - 100).toFixed(1)}%`,
            sub: '£68k under',
            positive: false,
          },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {card.value}
            </p>
            <p className={`text-xs mt-0.5 ${card.positive ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-red-600/70 dark:text-red-400/70'}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
