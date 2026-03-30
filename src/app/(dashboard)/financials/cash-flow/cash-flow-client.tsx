'use client';

import Link from 'next/link';
import { useCurrency } from '@/components/providers/currency-context';

type AccountEntry = { name: string; amount: number };
type BSSection = { class: string; accounts: AccountEntry[]; total: number };

type Props = {
  connected: boolean;
  currentPeriod: string | null;
  priorPeriod: string | null;
  netProfit: number;
  priorNetProfit: number;
  currentBS: BSSection[];
  priorBS: BSSection[];
};

function formatPeriodLabel(period: string | null): string {
  if (!period) return '-';
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

type RowDef = {
  label: string;
  current: number;
  prior: number;
  bold?: boolean;
  indent?: boolean;
  header?: boolean;
  separator?: boolean;
};

function buildCashFlowRows(
  netProfit: number,
  priorNetProfit: number,
  currentBS: BSSection[],
  priorBS: BSSection[],
  priorPriorBS: BSSection[] // empty if no prior-prior period
): RowDef[] {
  // Helper: get total for a class from BS sections
  const getTotal = (sections: BSSection[], cls: string) =>
    sections.find((s) => s.class === cls)?.total ?? 0;

  // Helper: get account amount from BS
  const getAccount = (sections: BSSection[], cls: string, name: string) => {
    const section = sections.find((s) => s.class === cls);
    return section?.accounts.find((a) => a.name === name)?.amount ?? 0;
  };

  // Current period balance sheet totals
  const curAssets = getTotal(currentBS, 'ASSET');
  const curLiabilities = getTotal(currentBS, 'LIABILITY');

  // Prior period balance sheet totals
  const priorAssets = getTotal(priorBS, 'ASSET');
  const priorLiabilities = getTotal(priorBS, 'LIABILITY');

  // Changes in working capital (current period vs prior)
  // Increase in assets = cash outflow (negative)
  // Increase in liabilities = cash inflow (positive)
  const rows: RowDef[] = [];

  // Operating Activities
  rows.push({ label: 'Cash Flows from Operating Activities', current: 0, prior: 0, header: true });
  rows.push({ label: 'Net Profit', current: netProfit, prior: priorNetProfit, indent: true });

  // Working capital changes from balance sheet
  rows.push({ label: 'Changes in Working Capital:', current: 0, prior: 0, header: true });

  // Build account-level changes for assets (exclude cash/bank accounts)
  const currentAssetSection = currentBS.find((s) => s.class === 'ASSET');
  const priorAssetSection = priorBS.find((s) => s.class === 'ASSET');

  const assetAccounts = new Set<string>();
  currentAssetSection?.accounts.forEach((a) => assetAccounts.add(a.name));
  priorAssetSection?.accounts.forEach((a) => assetAccounts.add(a.name));

  let totalWCAssetChange = 0;
  let totalWCAssetChangePrior = 0;

  for (const name of Array.from(assetAccounts).sort()) {
    const lower = name.toLowerCase();
    // Skip cash/bank accounts - they're the result, not a source
    if (lower.includes('bank') || lower.includes('cash') || lower.includes('petty')) continue;

    const curAmt = getAccount(currentBS, 'ASSET', name);
    const priorAmt = getAccount(priorBS, 'ASSET', name);
    // Change in non-cash assets: increase = outflow (negative for cash flow)
    const change = -(curAmt - priorAmt);
    totalWCAssetChange += change;

    // For prior period change, we'd need prior-prior BS which we may not have
    rows.push({
      label: `Change in ${name}`,
      current: change,
      prior: 0, // Would need 3 periods to calculate
      indent: true,
    });
  }

  // Liability changes
  const currentLiabSection = currentBS.find((s) => s.class === 'LIABILITY');
  const priorLiabSection = priorBS.find((s) => s.class === 'LIABILITY');

  const liabAccounts = new Set<string>();
  currentLiabSection?.accounts.forEach((a) => liabAccounts.add(a.name));
  priorLiabSection?.accounts.forEach((a) => liabAccounts.add(a.name));

  let totalWCLiabChange = 0;

  for (const name of Array.from(liabAccounts).sort()) {
    const curAmt = getAccount(currentBS, 'LIABILITY', name);
    const priorAmt = getAccount(priorBS, 'LIABILITY', name);
    // Change in liabilities: increase = inflow (positive for cash flow)
    const change = curAmt - priorAmt;
    totalWCLiabChange += change;

    rows.push({
      label: `Change in ${name}`,
      current: change,
      prior: 0,
      indent: true,
    });
  }

  const operatingCashFlow = netProfit + totalWCAssetChange + totalWCLiabChange;
  const priorOperatingCashFlow = priorNetProfit; // Simplified without prior WC changes

  rows.push({
    label: 'Net Cash from Operating Activities',
    current: operatingCashFlow,
    prior: priorOperatingCashFlow,
    bold: true,
    separator: true,
  });

  // Net change in cash (simplified - we only have operating data from normalised_financials)
  rows.push({
    label: 'Net Change in Cash',
    current: operatingCashFlow,
    prior: priorOperatingCashFlow,
    bold: true,
    separator: true,
  });

  // Cash position from bank/cash accounts in balance sheet
  const cashAccountNames = (currentAssetSection?.accounts ?? [])
    .filter((a) => {
      const lower = a.name.toLowerCase();
      return lower.includes('bank') || lower.includes('cash') || lower.includes('petty');
    });

  const priorCashAccounts = (priorAssetSection?.accounts ?? [])
    .filter((a) => {
      const lower = a.name.toLowerCase();
      return lower.includes('bank') || lower.includes('cash') || lower.includes('petty');
    });

  const currentCash = cashAccountNames.reduce((s, a) => s + a.amount, 0);
  const priorCash = priorCashAccounts.reduce((s, a) => s + a.amount, 0);

  if (currentCash !== 0 || priorCash !== 0) {
    rows.push({
      label: 'Cash & Bank Balances',
      current: currentCash,
      prior: priorCash,
      bold: true,
      separator: true,
    });
  }

  return rows;
}

export function CashFlowClient({
  connected,
  currentPeriod,
  priorPeriod,
  netProfit,
  priorNetProfit,
  currentBS,
  priorBS,
}: Props) {
  const { format: formatCurrency } = useCurrency();
  const hasData = currentBS.some((s) => s.accounts.length > 0);

  if (!connected || !hasData) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800 uppercase tracking-wide">No Data</span>
            <span className="text-sm text-amber-800">Connect your accounting software to see your Cash Flow Statement.</span>
          </div>
          <Link href="/integrations" className="text-sm font-medium text-amber-900 underline hover:no-underline">Connect accounts &rarr;</Link>
        </div>
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to Financials</Link>
          <h2 className="text-2xl font-bold mt-1">Cash Flow Statement</h2>
        </div>
      </div>
    );
  }

  const rows = buildCashFlowRows(netProfit, priorNetProfit, currentBS, priorBS, []);

  // Summary card values
  const operatingRow = rows.find((r) => r.label === 'Net Cash from Operating Activities');
  const cashRow = rows.find((r) => r.label === 'Cash & Bank Balances');
  const netChangeRow = rows.find((r) => r.label === 'Net Change in Cash');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Financials
        </Link>
        <h2 className="text-2xl font-bold mt-1">Cash Flow Statement</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Indirect method, as at {formatPeriodLabel(currentPeriod)}
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[320px]">Description</th>
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
            {rows.map((row, idx) => {
              if (row.header) {
                return (
                  <tr key={idx} className="border-b bg-muted/30">
                    <td colSpan={priorPeriod ? 4 : 2} className="px-4 py-2.5 font-semibold text-muted-foreground uppercase text-xs tracking-wide">
                      {row.label}
                    </td>
                  </tr>
                );
              }

              const change = row.current - row.prior;

              return (
                <tr
                  key={idx}
                  className={`
                    border-b last:border-b-0 hover:bg-muted/30 transition-colors
                    ${row.separator ? 'border-t-2 border-t-border' : ''}
                    ${row.bold ? 'bg-muted/20' : ''}
                  `}
                >
                  <td className={`px-4 py-2.5 ${row.bold ? 'font-semibold' : ''} ${row.indent ? 'pl-8 text-muted-foreground' : ''}`}>
                    {row.label}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-mono text-xs ${row.bold ? 'font-semibold' : ''} ${
                    row.bold
                      ? row.current >= 0 ? 'text-emerald-600' : 'text-red-600'
                      : row.current < 0 ? 'text-red-600/70' : ''
                  }`}>
                    {formatCurrency(row.current)}
                  </td>
                  {priorPeriod && (
                    <td className={`text-right px-4 py-2.5 font-mono text-xs text-muted-foreground ${row.bold ? 'font-semibold' : ''}`}>
                      {formatCurrency(row.prior)}
                    </td>
                  )}
                  {priorPeriod && (
                    <td className={`text-right px-4 py-2.5 font-mono text-xs ${
                      change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {change !== 0 ? `${change > 0 ? '+' : ''}${formatCurrency(change)}` : '-'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Operating Cash Flow',
            value: formatCurrency(operatingRow?.current ?? 0),
            good: (operatingRow?.current ?? 0) > 0,
          },
          {
            label: 'Net Change in Cash',
            value: formatCurrency(netChangeRow?.current ?? 0),
            good: (netChangeRow?.current ?? 0) > 0,
          },
          {
            label: 'Cash Position',
            value: formatCurrency(cashRow?.current ?? 0),
            good: (cashRow?.current ?? 0) > 0,
          },
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
