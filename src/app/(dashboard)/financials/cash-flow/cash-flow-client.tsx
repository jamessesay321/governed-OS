'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCurrency } from '@/components/providers/currency-context';
import {
  ReportControls,
  getDefaultReportState,
  ReportControlsState,
} from '@/components/financial/report-controls';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { ChallengeButton } from '@/components/shared/challenge-panel';

type AccountEntry = { name: string; amount: number; accountId: string; code: string };
type BSSection = { class: string; accounts: AccountEntry[]; total: number };

type Props = {
  connected: boolean;
  availablePeriods: string[];
  allPnL: Record<string, { netProfit: number }>;
  allBS: Record<string, BSSection[]>;
};

function formatPeriodLabel(period: string | null): string {
  if (!period) return '-';
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/* ─── Section types for expandable groups ─── */
type CFLineItem = {
  label: string;
  current: number;
  prior: number;
  accountId?: string;
  accountCode?: string;
};

type CFSection = {
  id: string;
  title: string;
  description: string;
  items: CFLineItem[];
  subtotal: number;
  priorSubtotal: number;
};

function buildCashFlowSections(
  netProfit: number,
  priorNetProfit: number,
  currentBS: BSSection[],
  priorBS: BSSection[],
): { sections: CFSection[]; netChange: number; priorNetChange: number; cashPosition: number; priorCashPosition: number } {
  const getAccount = (sections: BSSection[], cls: string, name: string) => {
    const section = sections.find((s) => s.class === cls);
    return section?.accounts.find((a) => a.name === name);
  };

  // --- Operating Activities ---
  const operatingItems: CFLineItem[] = [];
  operatingItems.push({ label: 'Net Profit', current: netProfit, prior: priorNetProfit });

  // Working capital: non-cash asset changes
  const currentAssetSection = currentBS.find((s) => s.class === 'ASSET');
  const priorAssetSection = priorBS.find((s) => s.class === 'ASSET');

  const assetAccounts = new Set<string>();
  currentAssetSection?.accounts.forEach((a) => assetAccounts.add(a.name));
  priorAssetSection?.accounts.forEach((a) => assetAccounts.add(a.name));

  let totalWCAssetChange = 0;
  for (const name of Array.from(assetAccounts).sort()) {
    const lower = name.toLowerCase();
    if (lower.includes('bank') || lower.includes('cash') || lower.includes('petty')) continue;

    const curAcc = getAccount(currentBS, 'ASSET', name);
    const priorAcc = getAccount(priorBS, 'ASSET', name);
    const curAmt = curAcc?.amount ?? 0;
    const priorAmt = priorAcc?.amount ?? 0;
    const change = -(curAmt - priorAmt); // Increase in asset = cash outflow
    totalWCAssetChange += change;

    operatingItems.push({
      label: `Change in ${name}`,
      current: change,
      prior: 0,
      accountId: curAcc?.accountId ?? priorAcc?.accountId,
      accountCode: curAcc?.code ?? priorAcc?.code,
    });
  }

  // Working capital: liability changes
  const currentLiabSection = currentBS.find((s) => s.class === 'LIABILITY');
  const priorLiabSection = priorBS.find((s) => s.class === 'LIABILITY');

  const liabAccounts = new Set<string>();
  currentLiabSection?.accounts.forEach((a) => liabAccounts.add(a.name));
  priorLiabSection?.accounts.forEach((a) => liabAccounts.add(a.name));

  let totalWCLiabChange = 0;
  for (const name of Array.from(liabAccounts).sort()) {
    const curAcc = getAccount(currentBS, 'LIABILITY', name);
    const priorAcc = getAccount(priorBS, 'LIABILITY', name);
    const curAmt = curAcc?.amount ?? 0;
    const priorAmt = priorAcc?.amount ?? 0;
    const change = curAmt - priorAmt; // Increase in liability = cash inflow
    totalWCLiabChange += change;

    operatingItems.push({
      label: `Change in ${name}`,
      current: change,
      prior: 0,
      accountId: curAcc?.accountId ?? priorAcc?.accountId,
      accountCode: curAcc?.code ?? priorAcc?.code,
    });
  }

  const operatingCashFlow = netProfit + totalWCAssetChange + totalWCLiabChange;
  const priorOperatingCashFlow = priorNetProfit;

  const operatingSection: CFSection = {
    id: 'operating',
    title: 'Operating Activities',
    description: 'Cash generated from core business operations',
    items: operatingItems,
    subtotal: operatingCashFlow,
    priorSubtotal: priorOperatingCashFlow,
  };

  // --- Investing Activities (placeholder — data not yet available from Xero) ---
  const investingSection: CFSection = {
    id: 'investing',
    title: 'Investing Activities',
    description: 'Cash spent on or received from long-term assets',
    items: [],
    subtotal: 0,
    priorSubtotal: 0,
  };

  // --- Financing Activities (placeholder) ---
  const financingSection: CFSection = {
    id: 'financing',
    title: 'Financing Activities',
    description: 'Cash from borrowing, repaying debt, or equity changes',
    items: [],
    subtotal: 0,
    priorSubtotal: 0,
  };

  const netChange = operatingCashFlow; // + investing + financing when available
  const priorNetChange = priorOperatingCashFlow;

  // Cash position from bank/cash accounts
  const cashAccounts = (currentAssetSection?.accounts ?? [])
    .filter((a) => {
      const l = a.name.toLowerCase();
      return l.includes('bank') || l.includes('cash') || l.includes('petty');
    });
  const priorCashAccounts = (priorAssetSection?.accounts ?? [])
    .filter((a) => {
      const l = a.name.toLowerCase();
      return l.includes('bank') || l.includes('cash') || l.includes('petty');
    });

  const cashPosition = cashAccounts.reduce((s, a) => s + a.amount, 0);
  const priorCashPosition = priorCashAccounts.reduce((s, a) => s + a.amount, 0);

  return {
    sections: [operatingSection, investingSection, financingSection],
    netChange,
    priorNetChange,
    cashPosition,
    priorCashPosition,
  };
}

export function CashFlowClient({
  connected,
  availablePeriods,
  allPnL,
  allBS,
}: Props) {
  const { format: formatCurrency } = useCurrency();
  const { yearEndMonth } = useAccountingConfig();

  const globalPeriod = useGlobalPeriodContext();
  const { openDrill } = useDrillDown();
  const [controls, setControls] = useState<ReportControlsState>(() =>
    getDefaultReportState(availablePeriods, yearEndMonth)
  );

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: true,
    financing: true,
  });

  function toggleSection(id: string) {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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

  // Derive current and prior periods from controls.selectedPeriods
  const { currentPeriod, priorPeriod, netProfit, priorNetProfit, currentBS, priorBS } = useMemo(() => {
    const selected = [...controls.selectedPeriods].sort();
    const current = selected.length > 0 ? selected[selected.length - 1] : null;
    const prior = selected.length > 1 ? selected[selected.length - 2] : null;
    return {
      currentPeriod: current,
      priorPeriod: prior,
      netProfit: current ? (allPnL[current]?.netProfit ?? 0) : 0,
      priorNetProfit: prior ? (allPnL[prior]?.netProfit ?? 0) : 0,
      currentBS: current ? (allBS[current] ?? []) : [],
      priorBS: prior ? (allBS[prior] ?? []) : [],
    };
  }, [controls.selectedPeriods, allPnL, allBS]);

  const hasData = currentBS.some((s) => s.accounts.length > 0);

  if (!connected) {
    return (
      <div className="space-y-6 max-w-5xl">
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

  if (!hasData) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800 uppercase tracking-wide">Syncing</span>
            <span className="text-sm text-blue-800">
              Your accounting software is connected, but balance sheet data is needed for cash flow calculations.
              Go to <Link href="/financials" className="font-medium underline hover:no-underline">Financials</Link> and click &quot;Sync from Xero&quot; to pull your latest data.
            </span>
          </div>
        </div>
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to Financials</Link>
          <h2 className="text-2xl font-bold mt-1">Cash Flow Statement</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Cash flow is derived from your P&amp;L and balance sheet movements.
            If your last sync was interrupted by a rate limit, try again in a minute.
          </p>
        </div>
      </div>
    );
  }

  const { sections, netChange, priorNetChange, cashPosition, priorCashPosition } = buildCashFlowSections(
    netProfit,
    priorNetProfit,
    currentBS,
    priorBS,
  );

  // Build CSV export data
  const csvData: Record<string, unknown>[] = sections.flatMap((section) => {
    const rows: Record<string, unknown>[] = [];
    for (const item of section.items) {
      const row: Record<string, unknown> = {
        Section: section.title,
        Description: item.label,
        [formatPeriodLabel(currentPeriod)]: item.current,
      };
      if (priorPeriod) {
        row[formatPeriodLabel(priorPeriod)] = item.prior;
      }
      rows.push(row);
    }
    rows.push({
      Section: section.title,
      Description: `Subtotal: ${section.title}`,
      [formatPeriodLabel(currentPeriod)]: section.subtotal,
      ...(priorPeriod ? { [formatPeriodLabel(priorPeriod)]: section.priorSubtotal } : {}),
    });
    return rows;
  });

  const colCount = priorPeriod ? 5 : 3;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Financials
        </Link>
        <h2 className="text-2xl font-bold mt-1">Cash Flow Statement</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Indirect method, as at {formatPeriodLabel(currentPeriod)}
        </p>
      </div>
      <ChallengeButton
        page="cash-flow"
        metricLabel="Cash Flow Statement"
        period={currentPeriod ?? undefined}
      />

      {/* Report Controls */}
      <ReportControls
        availablePeriods={availablePeriods}
        showComparison={true}
        showAccountFilter={false}
        showViewMode={true}
        showSearch={false}
        onChange={setControls}
        state={controls}
        exportTitle="cash-flow"
        exportData={csvData}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Operating Cash Flow',
            value: sections[0].subtotal,
            change: priorPeriod ? sections[0].subtotal - sections[0].priorSubtotal : null,
          },
          {
            label: 'Investing Cash Flow',
            value: sections[1].subtotal,
            change: priorPeriod ? sections[1].subtotal - sections[1].priorSubtotal : null,
          },
          {
            label: 'Net Change in Cash',
            value: netChange,
            change: priorPeriod ? netChange - priorNetChange : null,
          },
          {
            label: 'Cash Position',
            value: cashPosition,
            change: priorPeriod ? cashPosition - priorCashPosition : null,
          },
        ].map((card, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(card.value)}
            </p>
            {card.change !== null && card.change !== 0 && (
              <p className={`text-[11px] mt-0.5 ${card.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {card.change > 0 ? '+' : ''}{formatCurrency(card.change)} vs prior
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Cash Flow Table with expandable sections */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[320px]">Description</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[120px]">{formatPeriodLabel(currentPeriod)}</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[70px]">% of Ops</th>
              {priorPeriod && (
                <th className="text-right px-4 py-3 font-semibold min-w-[120px]">{formatPeriodLabel(priorPeriod)}</th>
              )}
              {priorPeriod && (
                <th className="text-right px-4 py-3 font-semibold min-w-[100px]">Change</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const isExpanded = expandedSections[section.id] ?? true;
              const subtotalChange = section.subtotal - section.priorSubtotal;
              const subtotalChangePct = section.priorSubtotal !== 0
                ? ((subtotalChange / Math.abs(section.priorSubtotal)) * 100)
                : 0;
              const opsSubtotal = sections[0].subtotal; // For % of Operating

              return (
                <tbody key={section.id}>
                  {/* Section header — clickable */}
                  <tr
                    className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection(section.id)}
                  >
                    <td className="px-4 py-2.5 font-semibold">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <span className="uppercase text-xs tracking-wide">{section.title}</span>
                          <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                            {section.description}
                            {section.items.length > 0 && ` (${section.items.length} items)`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">
                      {formatCurrency(section.subtotal)}
                    </td>
                    <td className="text-right px-4 py-2.5 text-xs text-muted-foreground">
                      {section.id === 'operating' ? '100%' : opsSubtotal !== 0
                        ? `${((section.subtotal / Math.abs(opsSubtotal)) * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                    {priorPeriod && (
                      <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold text-muted-foreground">
                        {formatCurrency(section.priorSubtotal)}
                      </td>
                    )}
                    {priorPeriod && (
                      <td className={`text-right px-4 py-2.5 font-mono text-xs font-semibold ${
                        subtotalChange > 0 ? 'text-emerald-600' : subtotalChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {subtotalChange !== 0 ? (
                          <div>
                            <div>{subtotalChange > 0 ? '+' : ''}{formatCurrency(subtotalChange)}</div>
                            {subtotalChangePct !== 0 && (
                              <div className="text-[10px] font-normal">{subtotalChangePct > 0 ? '+' : ''}{subtotalChangePct.toFixed(1)}%</div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    )}
                  </tr>

                  {/* Line items — shown when expanded */}
                  {isExpanded && section.items.length > 0 && section.items.map((item, idx) => {
                    const change = item.current - item.prior;
                    const pctOfOps = opsSubtotal !== 0 ? ((Math.abs(item.current) / Math.abs(opsSubtotal)) * 100) : 0;
                    const hasAccount = item.accountId && currentPeriod;

                    return (
                      <tr
                        key={`${section.id}-${idx}`}
                        className={`border-b hover:bg-muted/30 transition-colors ${hasAccount ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (hasAccount && currentPeriod) {
                            openDrill({
                              type: 'account',
                              accountId: item.accountId!,
                              accountName: item.label.replace('Change in ', ''),
                              accountCode: item.accountCode ?? '',
                              amount: item.current,
                              period: currentPeriod,
                            });
                          }
                        }}
                      >
                        <td className="px-4 py-2.5 pl-10">
                          <div className="flex items-center gap-1.5">
                            <span className={item.label === 'Net Profit' ? 'font-medium' : 'text-muted-foreground'}>
                              {item.label}
                            </span>
                            {hasAccount && (
                              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            )}
                          </div>
                          {item.accountCode && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono">{item.accountCode}</span>
                          )}
                        </td>
                        <td className={`text-right px-4 py-2.5 font-mono text-xs ${
                          item.current < 0 ? 'text-red-600/70' : ''
                        }`}>
                          {formatCurrency(item.current)}
                        </td>
                        <td className="text-right px-4 py-2.5 text-[11px] text-muted-foreground">
                          {item.current !== 0 && opsSubtotal !== 0 ? `${pctOfOps.toFixed(1)}%` : '-'}
                        </td>
                        {priorPeriod && (
                          <td className="text-right px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {formatCurrency(item.prior)}
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

                  {/* Empty section message */}
                  {isExpanded && section.items.length === 0 && (
                    <tr className="border-b">
                      <td colSpan={colCount} className="px-4 py-3 pl-10 text-xs text-muted-foreground italic">
                        No data available — investing and financing activity not yet classified in Xero
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}

            {/* Net Change in Cash */}
            <tbody>
              <tr className="border-t-2 border-t-border bg-muted/20">
                <td className="px-4 py-3 font-bold">Net Change in Cash</td>
                <td className={`text-right px-4 py-3 font-mono text-sm font-bold ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netChange)}
                </td>
                <td />
                {priorPeriod && (
                  <td className="text-right px-4 py-3 font-mono text-xs font-semibold text-muted-foreground">
                    {formatCurrency(priorNetChange)}
                  </td>
                )}
                {priorPeriod && (
                  <td className={`text-right px-4 py-3 font-mono text-xs font-semibold ${
                    (netChange - priorNetChange) > 0 ? 'text-emerald-600' : (netChange - priorNetChange) < 0 ? 'text-red-600' : ''
                  }`}>
                    {(netChange - priorNetChange) !== 0
                      ? `${(netChange - priorNetChange) > 0 ? '+' : ''}${formatCurrency(netChange - priorNetChange)}`
                      : '-'}
                  </td>
                )}
              </tr>

              {/* Cash Position */}
              {(cashPosition !== 0 || priorCashPosition !== 0) && (
                <tr className="border-t bg-muted/10">
                  <td className="px-4 py-3 font-bold">Cash &amp; Bank Balances</td>
                  <td className={`text-right px-4 py-3 font-mono text-sm font-bold ${cashPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(cashPosition)}
                  </td>
                  <td />
                  {priorPeriod && (
                    <td className="text-right px-4 py-3 font-mono text-xs font-semibold text-muted-foreground">
                      {formatCurrency(priorCashPosition)}
                    </td>
                  )}
                  {priorPeriod && (
                    <td className={`text-right px-4 py-3 font-mono text-xs font-semibold ${
                      (cashPosition - priorCashPosition) > 0 ? 'text-emerald-600' : (cashPosition - priorCashPosition) < 0 ? 'text-red-600' : ''
                    }`}>
                      {(cashPosition - priorCashPosition) !== 0
                        ? `${(cashPosition - priorCashPosition) > 0 ? '+' : ''}${formatCurrency(cashPosition - priorCashPosition)}`
                        : '-'}
                    </td>
                  )}
                </tr>
              )}
            </tbody>
          </tbody>
        </table>
      </div>

      {/* Cash flow equation */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium">Cash Flow Equation:</span>{' '}
        Operating ({formatCurrency(sections[0].subtotal)}) + Investing ({formatCurrency(sections[1].subtotal)}) + Financing ({formatCurrency(sections[2].subtotal)}) = Net Change ({formatCurrency(netChange)})
      </div>
    </div>
  );
}
