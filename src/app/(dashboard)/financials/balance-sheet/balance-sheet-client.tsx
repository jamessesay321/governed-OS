'use client';

import Link from 'next/link';
import { useCurrency } from '@/components/providers/currency-context';

type AccountEntry = { name: string; amount: number };
type BSSection = { class: string; accounts: AccountEntry[]; total: number };

type Props = {
  connected: boolean;
  currentPeriod: string | null;
  priorPeriod: string | null;
  currentData: BSSection[];
  priorData: BSSection[];
};

const CLASS_LABELS: Record<string, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
};

function formatPeriodLabel(period: string | null): string {
  if (!period) return '-';
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function BalanceSheetClient({ connected, currentPeriod, priorPeriod, currentData, priorData }: Props) {
  const { format: formatCurrency } = useCurrency();
  const hasData = currentData.some((s) => s.accounts.length > 0);

  if (!connected || !hasData) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800 uppercase tracking-wide">No Data</span>
            <span className="text-sm text-amber-800">Connect your accounting software to see your Balance Sheet.</span>
          </div>
          <Link href="/integrations" className="text-sm font-medium text-amber-900 underline hover:no-underline">Connect accounts &rarr;</Link>
        </div>
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to Financials</Link>
          <h2 className="text-2xl font-bold mt-1">Balance Sheet</h2>
        </div>
      </div>
    );
  }

  // Build a lookup for prior period amounts by class + account name
  const priorLookup = new Map<string, Map<string, number>>();
  for (const section of priorData) {
    const accMap = new Map<string, number>();
    for (const acc of section.accounts) accMap.set(acc.name, acc.amount);
    priorLookup.set(section.class, accMap);
  }

  // Totals
  const totalAssets = currentData.find((s) => s.class === 'ASSET')?.total ?? 0;
  const totalLiabilities = currentData.find((s) => s.class === 'LIABILITY')?.total ?? 0;
  const totalEquity = currentData.find((s) => s.class === 'EQUITY')?.total ?? 0;
  const priorTotalAssets = priorData.find((s) => s.class === 'ASSET')?.total ?? 0;
  const priorTotalLiabilities = priorData.find((s) => s.class === 'LIABILITY')?.total ?? 0;
  const netAssets = totalAssets - totalLiabilities;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Financials
        </Link>
        <h2 className="text-2xl font-bold mt-1">Balance Sheet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          As at {formatPeriodLabel(currentPeriod)}
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[280px]">Account</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[120px]">{formatPeriodLabel(currentPeriod)}</th>
              {priorPeriod && (
                <th className="text-right px-4 py-3 font-semibold min-w-[120px]">{formatPeriodLabel(priorPeriod)}</th>
              )}
              {priorPeriod && (
                <th className="text-right px-4 py-3 font-semibold min-w-[100px]">Change</th>
              )}
            </tr>
          </thead>
          <tbody>
            {currentData.map((section) => (
              <>
                <tr key={`h-${section.class}`} className="border-b bg-muted/30">
                  <td colSpan={priorPeriod ? 4 : 2} className="px-4 py-2.5 font-semibold text-muted-foreground uppercase text-xs tracking-wide">
                    {CLASS_LABELS[section.class] ?? section.class}
                  </td>
                </tr>
                {section.accounts.map((acc) => {
                  const priorAmount = priorLookup.get(section.class)?.get(acc.name) ?? 0;
                  const change = acc.amount - priorAmount;
                  const changePct = priorAmount !== 0 ? ((change / Math.abs(priorAmount)) * 100) : 0;
                  return (
                    <tr key={`${section.class}-${acc.name}`} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 pl-8 text-muted-foreground">{acc.name}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-xs">{formatCurrency(acc.amount)}</td>
                      {priorPeriod && (
                        <td className="text-right px-4 py-2.5 font-mono text-xs text-muted-foreground">{formatCurrency(priorAmount)}</td>
                      )}
                      {priorPeriod && (
                        <td className={`text-right px-4 py-2.5 font-mono text-xs ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {change !== 0 ? `${change > 0 ? '+' : ''}${changePct.toFixed(1)}%` : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
                <tr key={`t-${section.class}`} className="border-b border-t-2 border-t-border bg-muted/20">
                  <td className="px-4 py-2.5 font-semibold">Total {CLASS_LABELS[section.class] ?? section.class}</td>
                  <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">{formatCurrency(section.total)}</td>
                  {priorPeriod && (
                    <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold text-muted-foreground">
                      {formatCurrency(priorData.find((s) => s.class === section.class)?.total ?? 0)}
                    </td>
                  )}
                  {priorPeriod && <td />}
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Ratios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: formatCurrency(totalAssets), good: true },
          { label: 'Total Liabilities', value: formatCurrency(totalLiabilities), good: totalLiabilities < totalAssets },
          { label: 'Total Equity', value: formatCurrency(totalEquity), good: totalEquity > 0 },
          { label: 'Net Assets', value: formatCurrency(netAssets), good: netAssets > 0 },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.good ? 'text-emerald-600' : 'text-red-600'}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
