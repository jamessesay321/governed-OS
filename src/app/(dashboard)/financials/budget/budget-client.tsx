'use client';

import Link from 'next/link';
import { useCurrency } from '@/components/providers/currency-context';

type BudgetRow = {
  category: string;
  budget: number;
  actual: number;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
  header?: boolean;
  favorableWhenUnder?: boolean;
};

type Props = {
  connected: boolean;
  hasBudget: boolean;
  periodLabel: string;
  rows: BudgetRow[];
};

export function BudgetClient({ connected, hasBudget, periodLabel, rows }: Props) {
  const { format: formatCurrency } = useCurrency();

  if (!connected || rows.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800 uppercase tracking-wide">No Data</span>
            <span className="text-sm text-amber-800">
              {!connected
                ? 'Connect your accounting software to see Budget vs Actual.'
                : 'No budget or financial data available yet.'}
            </span>
          </div>
          <Link href="/integrations" className="text-sm font-medium text-amber-900 underline hover:no-underline">Connect accounts &rarr;</Link>
        </div>
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to Financials</Link>
          <h2 className="text-2xl font-bold mt-1">Budget vs Actual</h2>
        </div>
      </div>
    );
  }

  // Calculate summary values from the structured rows
  const revenueRow = rows.find((r) => r.category === 'Total Revenue' && r.bold);
  const expenseRow = rows.find((r) => r.category === 'Total Operating Expenses' && r.bold);
  const netProfitRow = rows.find((r) => r.category === 'Net Profit' && r.bold);
  const grossProfitRow = rows.find((r) => r.category === 'Gross Profit' && r.bold);

  return (
    <div className="space-y-6 max-w-5xl">
      {!hasBudget && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800 uppercase tracking-wide">Actuals Only</span>
            <span className="text-sm text-blue-800">No budget has been set. Showing actual figures only. Set a budget to enable variance analysis.</span>
          </div>
        </div>
      )}

      <div>
        <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Financials
        </Link>
        <h2 className="text-2xl font-bold mt-1">Budget vs Actual</h2>
        <p className="text-sm text-muted-foreground mt-1">{periodLabel}</p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[280px]">Category</th>
              {hasBudget && <th className="text-right px-4 py-3 font-semibold min-w-[110px]">Budget</th>}
              <th className="text-right px-4 py-3 font-semibold min-w-[110px]">Actual</th>
              {hasBudget && <th className="text-right px-4 py-3 font-semibold min-w-[110px]">Variance</th>}
              {hasBudget && <th className="text-right px-4 py-3 font-semibold min-w-[90px]">Variance %</th>}
              {hasBudget && <th className="text-center px-4 py-3 font-semibold min-w-[80px]">Status</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((line, idx) => {
              if (line.header) {
                return (
                  <tr key={idx} className="border-b bg-muted/30">
                    <td colSpan={hasBudget ? 6 : 2} className="px-4 py-2.5 font-semibold text-muted-foreground uppercase text-xs tracking-wide">
                      {line.category}
                    </td>
                  </tr>
                );
              }

              const variance = line.actual - line.budget;
              const variancePercent = line.budget !== 0 ? ((variance / Math.abs(line.budget)) * 100) : 0;

              let favorable: boolean | null = null;
              if (variance !== 0 && line.favorableWhenUnder !== undefined) {
                favorable = line.favorableWhenUnder ? variance < 0 : variance > 0;
              }

              const colorClass = favorable === true
                ? 'text-emerald-600'
                : favorable === false
                  ? 'text-red-600'
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
                  {hasBudget && (
                    <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''}`}>
                      {formatCurrency(line.budget)}
                    </td>
                  )}
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''}`}>
                    {formatCurrency(line.actual)}
                  </td>
                  {hasBudget && (
                    <td className={`text-right px-4 py-2.5 font-mono text-xs ${line.bold ? 'font-semibold' : ''} ${colorClass}`}>
                      {variance !== 0 ? `${variance > 0 ? '+' : ''}${formatCurrency(variance)}` : '-'}
                    </td>
                  )}
                  {hasBudget && (
                    <td className={`text-right px-4 py-2.5 font-mono text-xs ${colorClass}`}>
                      {variance !== 0 ? `${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%` : '-'}
                    </td>
                  )}
                  {hasBudget && (
                    <td className="text-center px-4 py-2.5">
                      {favorable === true && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Favourable
                        </span>
                      )}
                      {favorable === false && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Adverse
                        </span>
                      )}
                      {favorable === null && variance === 0 && !line.bold && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          On Budget
                        </span>
                      )}
                    </td>
                  )}
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
            label: 'Total Revenue',
            value: formatCurrency(revenueRow?.actual ?? 0),
            positive: (revenueRow?.actual ?? 0) > 0,
          },
          {
            label: 'Gross Profit',
            value: formatCurrency(grossProfitRow?.actual ?? 0),
            positive: (grossProfitRow?.actual ?? 0) > 0,
          },
          {
            label: 'Total Expenses',
            value: formatCurrency(expenseRow?.actual ?? 0),
            positive: false,
          },
          {
            label: 'Net Profit',
            value: formatCurrency(netProfitRow?.actual ?? 0),
            positive: (netProfitRow?.actual ?? 0) > 0,
          },
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
