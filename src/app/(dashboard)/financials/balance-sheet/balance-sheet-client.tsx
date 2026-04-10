'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { CrossRef } from '@/components/shared/in-page-link';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { ExportButton, ExportColumn } from '@/components/shared/export-button';
import { NumberLegend } from '@/components/data-primitives';

type AccountEntry = { name: string; amount: number; accountId: string; code: string };
type SubGroup = { label: string; accounts: AccountEntry[]; total: number };
type BSSection = { class: string; subGroups: SubGroup[]; total: number };

type Props = {
  connected: boolean;
  availablePeriods: string[];
  allPeriodsData: Record<string, BSSection[]>;
  orgId: string;
  lastSyncAt: string | null;
};

const CLASS_LABELS: Record<string, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
};

const CLASS_DESCRIPTIONS: Record<string, string> = {
  ASSET: 'What the business owns',
  LIABILITY: 'What the business owes',
  EQUITY: "The owners' stake in the business",
};

function formatPeriodLabel(period: string | null): string {
  if (!period) return '-';
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function BalanceSheetClient({ connected, availablePeriods, allPeriodsData, orgId, lastSyncAt }: Props) {
  const { format: formatCurrency } = useCurrency();
  const { yearEndMonth } = useAccountingConfig();

  const globalPeriod = useGlobalPeriodContext();
  const { openDrill } = useDrillDown();
  const [controls, setControls] = useState<ReportControlsState>(() =>
    getDefaultReportState(availablePeriods, yearEndMonth)
  );

  // Track which sections are expanded (all expanded by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ASSET: true,
    LIABILITY: true,
    EQUITY: true,
  });

  function toggleSection(cls: string) {
    setExpandedSections((prev) => ({ ...prev, [cls]: !prev[cls] }));
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
  const { currentPeriod, priorPeriod, currentData, priorData } = useMemo(() => {
    const selected = [...controls.selectedPeriods].sort();
    const current = selected.length > 0 ? selected[selected.length - 1] : null;
    const prior = selected.length > 1 ? selected[selected.length - 2] : null;
    return {
      currentPeriod: current,
      priorPeriod: prior,
      currentData: current ? (allPeriodsData[current] ?? []) : [],
      priorData: prior ? (allPeriodsData[prior] ?? []) : [],
    };
  }, [controls.selectedPeriods, allPeriodsData]);

  const hasData = currentData.some((s) => s.subGroups.some((sg) => sg.accounts.length > 0));

  if (!connected) {
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

  if (!hasData) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800 uppercase tracking-wide">Syncing</span>
            <span className="text-sm text-blue-800">
              Your accounting software is connected, but balance sheet data hasn&apos;t been synced yet.
              Go to <Link href="/financials" className="font-medium underline hover:no-underline">Financials</Link> and click &quot;Sync from Xero&quot; to pull your latest data.
            </span>
          </div>
        </div>
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to Financials</Link>
          <h2 className="text-2xl font-bold mt-1">Balance Sheet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Balance sheet positions are pulled from Xero&apos;s Trial Balance report during each sync.
            If your last sync was interrupted by a rate limit, try again in a minute.
          </p>
        </div>
      </div>
    );
  }

  // Build a lookup for prior period amounts by class + account name
  const priorLookup = new Map<string, Map<string, number>>();
  for (const section of priorData) {
    const accMap = new Map<string, number>();
    for (const sg of section.subGroups) {
      for (const acc of sg.accounts) accMap.set(acc.name, acc.amount);
    }
    priorLookup.set(section.class, accMap);
  }

  // Build prior sub-group totals lookup: class -> subGroup label -> total
  const priorSubGroupLookup = new Map<string, Map<string, number>>();
  for (const section of priorData) {
    const sgMap = new Map<string, number>();
    for (const sg of section.subGroups) sgMap.set(sg.label, sg.total);
    priorSubGroupLookup.set(section.class, sgMap);
  }

  // Build CSV export data
  const csvData: Record<string, unknown>[] = currentData.flatMap((section) => {
    const rows: Record<string, unknown>[] = [];
    for (const sg of section.subGroups) {
      for (const acc of sg.accounts) {
        const priorAmount = priorLookup.get(section.class)?.get(acc.name) ?? 0;
        const row: Record<string, unknown> = {
          Class: CLASS_LABELS[section.class] ?? section.class,
          SubGroup: sg.label,
          Account: acc.name,
          Code: acc.code,
          [formatPeriodLabel(currentPeriod)]: acc.amount,
        };
        if (priorPeriod) {
          row[formatPeriodLabel(priorPeriod)] = priorAmount;
          row['Change'] = acc.amount - priorAmount;
        }
        rows.push(row);
      }
    }
    return rows;
  });

  // Build export data with fixed keys for ExportButton
  const exportData: Record<string, unknown>[] = currentData.flatMap((section) =>
    section.subGroups.flatMap((sg) =>
      sg.accounts.map((acc) => ({
        section: CLASS_LABELS[section.class] ?? section.class,
        subgroup: sg.label,
        account: acc.name,
        code: acc.code,
        amount: acc.amount,
        ...(priorPeriod
          ? {
              prior_amount: priorLookup.get(section.class)?.get(acc.name) ?? 0,
              change: acc.amount - (priorLookup.get(section.class)?.get(acc.name) ?? 0),
            }
          : {}),
      }))
    )
  );

  const exportColumns: ExportColumn[] = [
    { header: 'Section', key: 'section', format: 'text' },
    { header: 'Sub-group', key: 'subgroup', format: 'text' },
    { header: 'Account', key: 'account', format: 'text' },
    { header: 'Code', key: 'code', format: 'text' },
    { header: formatPeriodLabel(currentPeriod), key: 'amount', format: 'currency' },
    ...(priorPeriod
      ? ([
          { header: formatPeriodLabel(priorPeriod), key: 'prior_amount', format: 'currency' },
          { header: 'Change', key: 'change', format: 'currency' },
        ] as ExportColumn[])
      : []),
  ];

  // Totals
  const totalAssets = currentData.find((s) => s.class === 'ASSET')?.total ?? 0;
  const totalLiabilities = currentData.find((s) => s.class === 'LIABILITY')?.total ?? 0;
  const totalEquity = currentData.find((s) => s.class === 'EQUITY')?.total ?? 0;
  const netAssets = totalAssets - totalLiabilities;

  // Current sub-group totals for Working Capital
  const assetSection = currentData.find((s) => s.class === 'ASSET');
  const liabilitySection = currentData.find((s) => s.class === 'LIABILITY');
  const currentAssetsTotal = assetSection?.subGroups.find((sg) => sg.label === 'Current Assets')?.total ?? 0;
  const currentLiabilitiesTotal = liabilitySection?.subGroups.find((sg) => sg.label === 'Current Liabilities')?.total ?? 0;
  const workingCapital = currentAssetsTotal - currentLiabilitiesTotal;

  // Prior totals
  const priorTotalAssets = priorData.find((s) => s.class === 'ASSET')?.total ?? 0;
  const priorTotalLiabilities = priorData.find((s) => s.class === 'LIABILITY')?.total ?? 0;
  const priorTotalEquity = priorData.find((s) => s.class === 'EQUITY')?.total ?? 0;
  const priorNetAssets = priorTotalAssets - priorTotalLiabilities;

  // Prior Working Capital
  const priorAssetSection = priorData.find((s) => s.class === 'ASSET');
  const priorLiabilitySection = priorData.find((s) => s.class === 'LIABILITY');
  const priorCurrentAssetsTotal = priorAssetSection?.subGroups.find((sg) => sg.label === 'Current Assets')?.total ?? 0;
  const priorCurrentLiabilitiesTotal = priorLiabilitySection?.subGroups.find((sg) => sg.label === 'Current Liabilities')?.total ?? 0;
  const priorWorkingCapital = priorCurrentAssetsTotal - priorCurrentLiabilitiesTotal;

  // Column count for colSpan calculations
  const colCount = priorPeriod ? 5 : 3; // Account, Current, % | + Prior, Change

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Financials
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-2xl font-bold">Balance Sheet</h2>
            <DataFreshness lastSyncAt={lastSyncAt} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            As at {formatPeriodLabel(currentPeriod)}
          </p>
        </div>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          filename="balance-sheet"
          title="Balance Sheet"
        />
      </div>
      <ChallengeButton
        page="balance-sheet"
        metricLabel="Balance Sheet"
        period={currentPeriod ?? undefined}
      />

      {/* Data type legend */}
      <NumberLegend />

      {/* AI Narrative Summary */}
      <NarrativeSummary
        orgId={orgId}
        period={currentPeriod ?? ''}
        narrativeEndpoint="narrative/balance-sheet"
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
        exportTitle="balance-sheet"
        exportData={csvData}
      />

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold min-w-[280px]">Account</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[120px]">{formatPeriodLabel(currentPeriod)}</th>
              <th className="text-right px-4 py-3 font-semibold min-w-[70px]">% Total</th>
              {priorPeriod && (
                <th className="text-right px-4 py-3 font-semibold min-w-[120px]">{formatPeriodLabel(priorPeriod)}</th>
              )}
              {priorPeriod && (
                <th className="text-right px-4 py-3 font-semibold min-w-[100px]">Change</th>
              )}
            </tr>
          </thead>
          <tbody>
            {currentData.map((section) => {
              const isExpanded = expandedSections[section.class] ?? true;
              const priorSectionTotal = priorData.find((s) => s.class === section.class)?.total ?? 0;
              const sectionChange = section.total - priorSectionTotal;
              const sectionChangePct = priorSectionTotal !== 0 ? ((sectionChange / Math.abs(priorSectionTotal)) * 100) : 0;
              const refTotal = section.class === 'ASSET' ? totalAssets : section.class === 'LIABILITY' ? totalLiabilities : totalEquity;
              const totalAccountCount = section.subGroups.reduce((s, sg) => s + sg.accounts.length, 0);

              return (
                <tbody key={section.class}>
                  {/* Section header — clickable to expand/collapse */}
                  <tr
                    className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection(section.class)}
                  >
                    <td className="px-4 py-2.5 font-semibold">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <span className="uppercase text-xs tracking-wide">
                          <FinancialTooltip term={CLASS_LABELS[section.class] ?? section.class} orgId={orgId}>
                            {CLASS_LABELS[section.class] ?? section.class}
                          </FinancialTooltip>
                        </span>
                          <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                            {CLASS_DESCRIPTIONS[section.class]} ({totalAccountCount} accounts)
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">
                      {formatCurrency(section.total)}
                    </td>
                    <td className="text-right px-4 py-2.5 text-xs text-muted-foreground">
                      100%
                    </td>
                    {priorPeriod && (
                      <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold text-muted-foreground">
                        {formatCurrency(priorSectionTotal)}
                      </td>
                    )}
                    {priorPeriod && (
                      <td className={`text-right px-4 py-2.5 font-mono text-xs font-semibold ${
                        sectionChange > 0 ? 'text-emerald-600' : sectionChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {sectionChange !== 0 ? (
                          <div>
                            <div>{sectionChange > 0 ? '+' : ''}{formatCurrency(sectionChange)}</div>
                            <div className="text-[10px] font-normal">{sectionChangePct > 0 ? '+' : ''}{sectionChangePct.toFixed(1)}%</div>
                          </div>
                        ) : '-'}
                      </td>
                    )}
                  </tr>

                  {/* Sub-groups and account rows — only shown when expanded */}
                  {isExpanded && section.subGroups.map((subGroup) => {
                    const priorSgTotal = priorSubGroupLookup.get(section.class)?.get(subGroup.label) ?? 0;
                    const sgChange = subGroup.total - priorSgTotal;
                    const sgChangePct = priorSgTotal !== 0 ? ((sgChange / Math.abs(priorSgTotal)) * 100) : 0;
                    // For EQUITY (single subgroup), skip sub-header
                    const showSubHeader = section.class !== 'EQUITY' && section.subGroups.length > 0;

                    return (
                      <React.Fragment key={`${section.class}-${subGroup.label}`}>
                        {/* Sub-group header */}
                        {showSubHeader && (
                          <tr className="border-b bg-muted/10">
                            <td className="px-4 py-2 pl-8 font-medium text-xs text-foreground/80">
                              {subGroup.label}
                              <span className="text-[10px] text-muted-foreground font-normal ml-2">
                                ({subGroup.accounts.length} accounts)
                              </span>
                            </td>
                            <td className="text-right px-4 py-2 font-mono text-xs font-medium text-foreground/80">
                              {formatCurrency(subGroup.total)}
                            </td>
                            <td className="text-right px-4 py-2 text-[11px] text-muted-foreground">
                              {refTotal !== 0 ? ((Math.abs(subGroup.total) / Math.abs(refTotal)) * 100).toFixed(1) : '0.0'}%
                            </td>
                            {priorPeriod && (
                              <td className="text-right px-4 py-2 font-mono text-xs text-muted-foreground">
                                {formatCurrency(priorSgTotal)}
                              </td>
                            )}
                            {priorPeriod && (
                              <td className={`text-right px-4 py-2 font-mono text-xs ${
                                sgChange > 0 ? 'text-emerald-600' : sgChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                              }`}>
                                {sgChange !== 0 ? (
                                  <div>
                                    <div>{sgChange > 0 ? '+' : ''}{formatCurrency(sgChange)}</div>
                                    <div className="text-[10px] font-normal">{sgChangePct > 0 ? '+' : ''}{sgChangePct.toFixed(1)}%</div>
                                  </div>
                                ) : '-'}
                              </td>
                            )}
                          </tr>
                        )}

                        {/* Account rows */}
                        {subGroup.accounts.map((acc) => {
                          const priorAmount = priorLookup.get(section.class)?.get(acc.name) ?? 0;
                          const change = acc.amount - priorAmount;
                          const changePct = priorAmount !== 0 ? ((change / Math.abs(priorAmount)) * 100) : 0;
                          const pctOfSection = refTotal !== 0 ? ((Math.abs(acc.amount) / Math.abs(refTotal)) * 100) : 0;

                          return (
                            <tr
                              key={`${section.class}-${subGroup.label}-${acc.name}`}
                              className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => {
                                if (currentPeriod && acc.accountId) {
                                  openDrill({
                                    type: 'account',
                                    accountId: acc.accountId,
                                    accountName: acc.name,
                                    accountCode: acc.code,
                                    amount: acc.amount,
                                    period: currentPeriod,
                                  });
                                }
                              }}
                            >
                              <td className={`px-4 py-2.5 ${showSubHeader ? 'pl-14' : 'pl-10'}`}>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground">{acc.name}</span>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                </div>
                                {acc.code && (
                                  <span className="text-[10px] text-muted-foreground/60 font-mono">{acc.code}</span>
                                )}
                              </td>
                              <td className="text-right px-4 py-2.5 font-mono text-xs">{formatCurrency(acc.amount)}</td>
                              <td className="text-right px-4 py-2.5 text-[11px] text-muted-foreground">
                                {pctOfSection.toFixed(1)}%
                              </td>
                              {priorPeriod && (
                                <td className="text-right px-4 py-2.5 font-mono text-xs text-muted-foreground">{formatCurrency(priorAmount)}</td>
                              )}
                              {priorPeriod && (
                                <td className={`text-right px-4 py-2.5 font-mono text-xs ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {change !== 0 ? (
                                    <div>
                                      <div>{change > 0 ? '+' : ''}{formatCurrency(change)}</div>
                                      <div className="text-[10px] font-normal">{changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%</div>
                                    </div>
                                  ) : '-'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* Section total row (for ASSET and LIABILITY with sub-groups) */}
                  {isExpanded && section.class !== 'EQUITY' && section.subGroups.length > 1 && (
                    <tr className="border-b bg-muted/20">
                      <td className="px-4 py-2 pl-8 font-semibold text-xs">
                        Total {CLASS_LABELS[section.class]}
                      </td>
                      <td className="text-right px-4 py-2 font-mono text-xs font-semibold">
                        {formatCurrency(section.total)}
                      </td>
                      <td className="text-right px-4 py-2 text-xs text-muted-foreground">100%</td>
                      {priorPeriod && (
                        <td className="text-right px-4 py-2 font-mono text-xs font-semibold text-muted-foreground">
                          {formatCurrency(priorSectionTotal)}
                        </td>
                      )}
                      {priorPeriod && (
                        <td className={`text-right px-4 py-2 font-mono text-xs font-semibold ${
                          sectionChange > 0 ? 'text-emerald-600' : sectionChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {sectionChange !== 0 ? `${sectionChange > 0 ? '+' : ''}${formatCurrency(sectionChange)}` : '-'}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Working Capital row — shown after LIABILITY section */}
                  {section.class === 'LIABILITY' && isExpanded && (
                    <tr className="border-b border-t bg-blue-50/50 dark:bg-blue-950/20">
                      <td className="px-4 py-2.5 pl-4 font-semibold text-xs">
                        <FinancialTooltip term="Working Capital" orgId={orgId}>
                          Working Capital
                        </FinancialTooltip>
                        {' '}
                        <span className="font-normal text-muted-foreground">(Current Assets - Current Liabilities)</span>
                      </td>
                      <td className={`text-right px-4 py-2.5 font-mono text-xs font-semibold ${
                        workingCapital > 0 ? 'text-emerald-600' : workingCapital < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {formatCurrency(workingCapital)}
                      </td>
                      <td />
                      {priorPeriod && (
                        <td className={`text-right px-4 py-2.5 font-mono text-xs font-semibold ${
                          priorWorkingCapital > 0 ? 'text-emerald-600/70' : priorWorkingCapital < 0 ? 'text-red-600/70' : 'text-muted-foreground'
                        }`}>
                          {formatCurrency(priorWorkingCapital)}
                        </td>
                      )}
                      {priorPeriod && (() => {
                        const wcChange = workingCapital - priorWorkingCapital;
                        return (
                          <td className={`text-right px-4 py-2.5 font-mono text-xs font-semibold ${
                            wcChange > 0 ? 'text-emerald-600' : wcChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                            {wcChange !== 0
                              ? `${wcChange > 0 ? '+' : ''}${formatCurrency(wcChange)}`
                              : '-'}
                          </td>
                        );
                      })()}
                    </tr>
                  )}
                </tbody>
              );
            })}

            {/* Net Assets row */}
            <tbody>
              <tr className="border-t-2 border-t-border bg-muted/20">
                <td className="px-4 py-3 font-bold">
                  <FinancialTooltip term="Net Assets" orgId={orgId}>
                    Net Assets
                  </FinancialTooltip>
                  {' '}(Assets - Liabilities)
                </td>
                <td className={`text-right px-4 py-3 font-mono text-sm font-bold ${netAssets >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netAssets)}
                </td>
                <td />
                {priorPeriod && (
                  <td className="text-right px-4 py-3 font-mono text-xs font-semibold text-muted-foreground">
                    {formatCurrency(priorNetAssets)}
                  </td>
                )}
                {priorPeriod && (
                  <td className={`text-right px-4 py-3 font-mono text-xs font-semibold ${
                    (netAssets - priorNetAssets) > 0 ? 'text-emerald-600' : (netAssets - priorNetAssets) < 0 ? 'text-red-600' : ''
                  }`}>
                    {(netAssets - priorNetAssets) !== 0
                      ? `${(netAssets - priorNetAssets) > 0 ? '+' : ''}${formatCurrency(netAssets - priorNetAssets)}`
                      : '-'}
                  </td>
                )}
              </tr>
            </tbody>
          </tbody>
        </table>
      </div>

      {/* Key Ratios & Health Indicators */}
      {(() => {
        const currentRatio = currentLiabilitiesTotal !== 0
          ? currentAssetsTotal / Math.abs(currentLiabilitiesTotal)
          : currentAssetsTotal > 0 ? 999 : 0;
        const gearing = totalEquity !== 0
          ? (Math.abs(totalLiabilities) / Math.abs(totalEquity)) * 100
          : 0;
        const priorCurrentRatio = priorCurrentLiabilitiesTotal !== 0
          ? priorCurrentAssetsTotal / Math.abs(priorCurrentLiabilitiesTotal)
          : priorCurrentAssetsTotal > 0 ? 999 : 0;
        const priorGearing = priorTotalEquity !== 0
          ? (Math.abs(priorTotalLiabilities) / Math.abs(priorTotalEquity)) * 100
          : 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: 'Current Ratio',
                value: currentRatio >= 999 ? 'N/A' : `${currentRatio.toFixed(2)}x`,
                good: currentRatio >= 1,
                change: priorPeriod && priorCurrentRatio < 999 ? currentRatio - priorCurrentRatio : null,
                suffix: currentRatio < 1 ? 'Below 1.0 — potential liquidity risk' : currentRatio > 2 ? 'Strong liquidity' : 'Adequate liquidity',
              },
              {
                label: 'Gearing (D/E)',
                value: `${gearing.toFixed(1)}%`,
                good: gearing < 100,
                change: priorPeriod ? gearing - priorGearing : null,
                suffix: gearing > 200 ? 'High leverage — monitor closely' : gearing > 100 ? 'Moderate leverage' : 'Low leverage',
              },
              {
                label: 'Working Capital',
                value: formatCurrency(workingCapital),
                good: workingCapital > 0,
                change: priorPeriod ? workingCapital - priorWorkingCapital : null,
                suffix: workingCapital < 0 ? 'Net current liabilities — ISA 570 indicator' : undefined,
              },
              {
                label: 'Total Equity',
                value: formatCurrency(totalEquity),
                good: totalEquity > 0,
                change: priorPeriod ? totalEquity - priorTotalEquity : null,
                suffix: totalEquity < 0 ? 'Negative equity — going concern risk' : undefined,
              },
              {
                label: 'Net Assets',
                value: formatCurrency(netAssets),
                good: netAssets > 0,
                change: priorPeriod ? netAssets - priorNetAssets : null,
                suffix: undefined,
              },
            ].map((card, i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                <p className={`text-xl font-bold mt-1 ${card.good ? 'text-emerald-600' : 'text-red-600'}`}>{card.value}</p>
                {card.change !== null && card.change !== 0 && (
                  <p className={`text-[11px] mt-0.5 ${(card.label === 'Gearing (D/E)' ? card.change < 0 : card.change > 0) ? 'text-emerald-600' : 'text-red-600'}`}>
                    {card.change > 0 ? '+' : ''}{card.label === 'Current Ratio' ? `${card.change.toFixed(2)}x` : card.label === 'Gearing (D/E)' ? `${card.change.toFixed(1)}pp` : formatCurrency(card.change)} vs prior
                  </p>
                )}
                {card.suffix && (
                  <p className="text-[10px] mt-0.5 text-muted-foreground">{card.suffix}</p>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Accounting equation check */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium">Accounting Equation:</span>{' '}
        Assets ({formatCurrency(totalAssets)}) = Liabilities ({formatCurrency(totalLiabilities)}) + Equity ({formatCurrency(totalEquity)})
        {' '}
        {Math.abs(totalAssets - totalLiabilities - totalEquity) < 1 ? (
          <span className="text-emerald-600 font-medium ml-1">Balanced</span>
        ) : (
          <span className="text-red-600 font-medium ml-1">
            Imbalance: {formatCurrency(totalAssets - totalLiabilities - totalEquity)}
          </span>
        )}
      </div>

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/financials/cash-flow" label="Cash Flow Statement" />
        <CrossRef href="/financials/income-statement" label="Income Statement" />
        <CrossRef href="/dashboard/financial-health" label="Financial Health" />
      </div>
    </div>
  );
}
