'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrency } from '@/components/providers/currency-context';
import {
  ReportControls,
  getDefaultReportState,
  ReportControlsState,
} from '@/components/financial/report-controls';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { usePersistentReportState } from '@/lib/hooks/use-persistent-report-state';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { ChallengeButton } from '@/components/shared/challenge-panel';
import { CrossRef } from '@/components/shared/in-page-link';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { ExportButton, ExportColumn } from '@/components/shared/export-button';
import { NumberLegend } from '@/components/data-primitives';

type AccountEntry = { name: string; amount: number; accountId: string; code: string; type: string };
type BSSection = { class: string; accounts: AccountEntry[]; total: number };

type Props = {
  connected: boolean;
  availablePeriods: string[];
  allPnL: Record<string, { netProfit: number; depreciation: number }>;
  allBS: Record<string, BSSection[]>;
  orgId: string;
  lastSyncAt: string | null;
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

/* ─── Account classification helpers ─── */
const INVESTING_KEYWORDS = ['equipment', 'property', 'plant', 'vehicle', 'furniture', 'computer', 'machinery', 'intangible', 'goodwill', 'investment'];
const FINANCING_KEYWORDS = ['loan', 'mortgage', 'borrowing', 'overdraft', 'share capital', 'dividend', 'director loan', 'hire purchase', 'lease liability'];
const CASH_KEYWORDS = ['bank', 'cash', 'petty'];

function isCashAccount(name: string): boolean {
  const lower = name.toLowerCase();
  return CASH_KEYWORDS.some((kw) => lower.includes(kw));
}

function isInvestingAccount(account: { name: string; type: string; class: string }): boolean {
  const lower = account.name.toLowerCase();
  const typeUpper = account.type.toUpperCase();
  const classUpper = account.class.toUpperCase();
  if (typeUpper.includes('FIXED') || (classUpper === 'ASSET' && INVESTING_KEYWORDS.some((kw) => lower.includes(kw)))) {
    return true;
  }
  return false;
}

function isFinancingAccount(account: { name: string; type: string; class: string }): boolean {
  const lower = account.name.toLowerCase();
  const classUpper = account.class.toUpperCase();
  if (FINANCING_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  // Equity accounts related to share capital / dividends
  if (classUpper === 'EQUITY' && (lower.includes('share') || lower.includes('dividend') || lower.includes('capital'))) return true;
  return false;
}

type CashFlowResult = {
  sections: CFSection[];
  netChange: number;
  priorNetChange: number;
  openingCash: number;
  closingCash: number;
  priorOpeningCash: number;
  priorClosingCash: number;
  cashReconciles: boolean;
};

/* ─── Direct Method Builder ─── */
function buildDirectCashFlow(
  netProfit: number,
  priorNetProfit: number,
  depreciation: number,
  priorDepreciation: number,
  currentBS: BSSection[],
  priorBS: BSSection[],
  prePriorBS: BSSection[],
  indirectResult: CashFlowResult,
): CashFlowResult {
  // Helper: find an account balance by class and name keyword match
  const findAccountAmount = (sections: BSSection[], cls: string, keywords: string[]): number => {
    const section = sections.find((s) => s.class === cls);
    if (!section) return 0;
    return section.accounts
      .filter((a) => keywords.some((kw) => a.name.toLowerCase().includes(kw)))
      .reduce((sum, a) => sum + a.amount, 0);
  };

  // Helper: get account meta for drill-down
  const findAccountMeta = (sections: BSSection[], cls: string, keywords: string[]) => {
    const section = sections.find((s) => s.class === cls);
    if (!section) return undefined;
    return section.accounts.find((a) => keywords.some((kw) => a.name.toLowerCase().includes(kw)));
  };

  // AR keywords
  const arKeywords = ['receivable', 'debtor', 'trade debtor'];
  // AP keywords
  const apKeywords = ['payable', 'creditor', 'trade creditor'];
  // Inventory keywords
  const inventoryKeywords = ['inventory', 'stock'];
  // Prepayment keywords
  const prepaymentKeywords = ['prepayment', 'prepaid', 'advance'];
  // Interest keywords
  const interestKeywords = ['interest'];
  // Tax keywords
  const taxKeywords = ['tax', 'corporation tax', 'vat', 'hmrc', 'income tax'];

  // Current period changes
  const arCurrent = findAccountAmount(currentBS, 'ASSET', arKeywords);
  const arPrior = findAccountAmount(priorBS, 'ASSET', arKeywords);
  const arChange = arCurrent - arPrior;

  const apCurrent = findAccountAmount(currentBS, 'LIABILITY', apKeywords);
  const apPrior = findAccountAmount(priorBS, 'LIABILITY', apKeywords);
  const apChange = apCurrent - apPrior;

  const invCurrent = findAccountAmount(currentBS, 'ASSET', inventoryKeywords);
  const invPrior = findAccountAmount(priorBS, 'ASSET', inventoryKeywords);
  const invChange = invCurrent - invPrior;

  const prepCurrent = findAccountAmount(currentBS, 'ASSET', prepaymentKeywords);
  const prepPrior = findAccountAmount(priorBS, 'ASSET', prepaymentKeywords);
  const prepChange = prepCurrent - prepPrior;

  const taxLiabCurrent = findAccountAmount(currentBS, 'LIABILITY', taxKeywords);
  const taxLiabPrior = findAccountAmount(priorBS, 'LIABILITY', taxKeywords);
  const taxChange = taxLiabCurrent - taxLiabPrior;

  const intLiabCurrent = findAccountAmount(currentBS, 'LIABILITY', interestKeywords);
  const intLiabPrior = findAccountAmount(priorBS, 'LIABILITY', interestKeywords);
  const intChange = intLiabCurrent - intLiabPrior;

  // Prior period changes (for comparison column)
  const arPrePrior = findAccountAmount(prePriorBS, 'ASSET', arKeywords);
  const arChangePrior = arPrior - arPrePrior;

  const apPrePrior = findAccountAmount(prePriorBS, 'LIABILITY', apKeywords);
  const apChangePrior = apPrior - apPrePrior;

  const invPrePrior = findAccountAmount(prePriorBS, 'ASSET', inventoryKeywords);
  const invChangePrior = invPrior - invPrePrior;

  const prepPrePrior = findAccountAmount(prePriorBS, 'ASSET', prepaymentKeywords);
  const prepChangePrior = prepPrior - prepPrePrior;

  const taxLiabPrePrior = findAccountAmount(prePriorBS, 'LIABILITY', taxKeywords);
  const taxChangePrior = taxLiabPrior - taxLiabPrePrior;

  const intLiabPrePrior = findAccountAmount(prePriorBS, 'LIABILITY', interestKeywords);
  const intChangePrior = intLiabPrior - intLiabPrePrior;

  // Derive revenue from net profit + all expenses (rough: net profit + depreciation + operating cash adjustments)
  // For direct method we use: Revenue = NetProfit + Depreciation + total operating expenses (implied)
  // Cash from customers = Revenue - increase in AR (or + decrease in AR)
  // Since we don't have revenue separately, derive from operating cash flow:
  // Operating CF = NetProfit + Dep + WC changes (same as indirect)
  // For direct, we present:
  //   Cash from customers = (NetProfit + Dep + COGS + OpEx) - AR change
  //   But since we only have net profit, we re-derive differently:
  //   Total operating CF is the same either way. We just present the breakdown differently.

  // Gross revenue proxy: Net profit + all non-cash adj + all WC changes = operating CF (same number)
  // For direct method, the conceptual breakdown is:
  //   Cash from customers ~= operating CF + cash to suppliers + cash for opex + cash for interest + cash for tax
  // Since we only have aggregate P&L (net profit), derive:

  const operatingCF = indirectResult.sections[0].subtotal;
  const priorOperatingCF = indirectResult.sections[0].priorSubtotal;

  // Cash from customers: Net profit + depreciation + cost adjustments, minus AR change
  // We approximate: Revenue = NetProfit + Depreciation + Abs(other working capital outflows)
  // Better approach: take the operating CF and split it

  // Direct method line items: we derive from the indirect operating data
  // Cash from customers = Revenue - AR increase = (NetProfit + Dep + all expenses) - AR change
  // Since we can't perfectly decompose without full revenue data, we present:
  //   Cash from customers = Operating CF + cash paid to suppliers + operating expenses + interest + tax
  // But that's circular. Instead, present the WC changes as cash flow categories:

  // Approximation: use net profit + depreciation as "gross operating surplus"
  // then adjust for each WC line
  const grossSurplus = netProfit + depreciation;
  const priorGrossSurplus = priorNetProfit + priorDepreciation;

  // Cash received from customers = gross surplus - change in AR
  const cashFromCustomers = grossSurplus - arChange;
  const priorCashFromCustomers = priorGrossSurplus - arChangePrior;

  // Cash paid to suppliers = -(increase in inventory - increase in AP)
  const cashToSuppliers = -(invChange - apChange);
  const priorCashToSuppliers = -(invChangePrior - apChangePrior);

  // Cash paid for operating expenses = -(increase in prepayments)
  const cashForOpex = -prepChange;
  const priorCashForOpex = -prepChangePrior;

  // Cash paid for interest
  const cashForInterest = intChange;
  const priorCashForInterest = intChangePrior;

  // Cash paid for taxes
  const cashForTax = taxChange;
  const priorCashForTax = taxChangePrior;

  // Residual = operating CF minus the above items (captures unclassified WC changes)
  const explainedDirect = cashFromCustomers + cashToSuppliers + cashForOpex + cashForInterest + cashForTax;
  const priorExplainedDirect = priorCashFromCustomers + priorCashToSuppliers + priorCashForOpex + priorCashForInterest + priorCashForTax;

  const residual = operatingCF - explainedDirect;
  const priorResidual = priorOperatingCF - priorExplainedDirect;

  const arMeta = findAccountMeta(currentBS, 'ASSET', arKeywords) ?? findAccountMeta(priorBS, 'ASSET', arKeywords);
  const apMeta = findAccountMeta(currentBS, 'LIABILITY', apKeywords) ?? findAccountMeta(priorBS, 'LIABILITY', apKeywords);
  const invMeta = findAccountMeta(currentBS, 'ASSET', inventoryKeywords) ?? findAccountMeta(priorBS, 'ASSET', inventoryKeywords);
  const prepMeta = findAccountMeta(currentBS, 'ASSET', prepaymentKeywords) ?? findAccountMeta(priorBS, 'ASSET', prepaymentKeywords);
  const taxMeta = findAccountMeta(currentBS, 'LIABILITY', taxKeywords) ?? findAccountMeta(priorBS, 'LIABILITY', taxKeywords);
  const intMeta = findAccountMeta(currentBS, 'LIABILITY', interestKeywords) ?? findAccountMeta(priorBS, 'LIABILITY', interestKeywords);

  const directOperatingItems: CFLineItem[] = [
    {
      label: 'Cash received from customers',
      current: cashFromCustomers,
      prior: priorCashFromCustomers,
      accountId: arMeta?.accountId,
      accountCode: arMeta?.code,
    },
    {
      label: 'Cash paid to suppliers',
      current: cashToSuppliers,
      prior: priorCashToSuppliers,
      accountId: apMeta?.accountId ?? invMeta?.accountId,
      accountCode: apMeta?.code ?? invMeta?.code,
    },
    {
      label: 'Cash paid for operating expenses',
      current: cashForOpex,
      prior: priorCashForOpex,
      accountId: prepMeta?.accountId,
      accountCode: prepMeta?.code,
    },
    {
      label: 'Cash paid for interest',
      current: cashForInterest,
      prior: priorCashForInterest,
      accountId: intMeta?.accountId,
      accountCode: intMeta?.code,
    },
    {
      label: 'Cash paid for taxes',
      current: cashForTax,
      prior: priorCashForTax,
      accountId: taxMeta?.accountId,
      accountCode: taxMeta?.code,
    },
  ];

  // Add residual if non-trivial
  if (Math.abs(residual) > 0.01 || Math.abs(priorResidual) > 0.01) {
    directOperatingItems.push({
      label: 'Other operating cash movements',
      current: residual,
      prior: priorResidual,
    });
  }

  const directOperatingSection: CFSection = {
    id: 'operating',
    title: 'Operating Activities (Direct)',
    description: 'Actual cash receipts and payments from operations',
    items: directOperatingItems,
    subtotal: operatingCF,
    priorSubtotal: priorOperatingCF,
  };

  // Investing and financing sections are the same for both methods
  return {
    sections: [directOperatingSection, indirectResult.sections[1], indirectResult.sections[2]],
    netChange: indirectResult.netChange,
    priorNetChange: indirectResult.priorNetChange,
    openingCash: indirectResult.openingCash,
    closingCash: indirectResult.closingCash,
    priorOpeningCash: indirectResult.priorOpeningCash,
    priorClosingCash: indirectResult.priorClosingCash,
    cashReconciles: indirectResult.cashReconciles,
  };
}

function buildCashFlowSections(
  netProfit: number,
  priorNetProfit: number,
  depreciation: number,
  priorDepreciation: number,
  currentBS: BSSection[],
  priorBS: BSSection[],
  prePriorBS: BSSection[],
): CashFlowResult {
  const getAccount = (sections: BSSection[], cls: string, name: string) => {
    const section = sections.find((s) => s.class === cls);
    return section?.accounts.find((a) => a.name === name);
  };

  const getAccountMeta = (sections: BSSection[], cls: string, name: string) => {
    const section = sections.find((s) => s.class === cls);
    return section?.accounts.find((a) => a.name === name);
  };

  // Collect all unique accounts with their metadata across all periods
  const allAccounts = new Map<string, { name: string; class: string; type: string; accountId: string; code: string }>();
  for (const bs of [currentBS, priorBS, prePriorBS]) {
    for (const section of bs) {
      for (const acc of section.accounts) {
        if (!allAccounts.has(acc.name)) {
          allAccounts.set(acc.name, { name: acc.name, class: section.class, type: acc.type, accountId: acc.accountId, code: acc.code });
        }
      }
    }
  }

  // Helper: compute working capital changes between two BS snapshots
  function computeChanges(
    laterBS: BSSection[],
    earlierBS: BSSection[],
    filterFn: (acc: { name: string; class: string; type: string }) => boolean,
    classFilter: string,
    signFn: (curAmt: number, priorAmt: number) => number,
  ): { items: CFLineItem[]; total: number } {
    const section1 = laterBS.find((s) => s.class === classFilter);
    const section2 = earlierBS.find((s) => s.class === classFilter);
    const names = new Set<string>();
    section1?.accounts.forEach((a) => names.add(a.name));
    section2?.accounts.forEach((a) => names.add(a.name));

    const items: CFLineItem[] = [];
    let total = 0;
    for (const name of Array.from(names).sort()) {
      const meta = allAccounts.get(name);
      if (!meta || !filterFn(meta)) continue;
      const curAmt = getAccount(laterBS, classFilter, name)?.amount ?? 0;
      const priorAmt = getAccount(earlierBS, classFilter, name)?.amount ?? 0;
      const change = signFn(curAmt, priorAmt);
      total += change;
      const curAcc = getAccount(laterBS, classFilter, name);
      const priorAcc = getAccount(earlierBS, classFilter, name);
      items.push({
        label: name,
        current: change,
        prior: 0, // placeholder, overwritten below for prior period
        accountId: curAcc?.accountId ?? priorAcc?.accountId,
        accountCode: curAcc?.code ?? priorAcc?.code,
      });
    }
    return { items, total };
  }

  // ─── Operating Activities ───
  const operatingItems: CFLineItem[] = [];
  operatingItems.push({ label: 'Net Profit', current: netProfit, prior: priorNetProfit });

  // Depreciation add-back
  if (depreciation > 0 || priorDepreciation > 0) {
    operatingItems.push({
      label: 'Add back: Depreciation & Amortisation',
      current: depreciation,
      prior: priorDepreciation,
    });
  }

  // Working capital: current (non-investing, non-cash) asset changes
  const isOperatingAsset = (acc: { name: string; class: string; type: string }) =>
    acc.class === 'ASSET' && !isCashAccount(acc.name) && !isInvestingAccount(acc);

  const isOperatingLiability = (acc: { name: string; class: string; type: string }) =>
    acc.class === 'LIABILITY' && !isFinancingAccount(acc);

  // Current period working capital
  const wcAssetCurrent = computeChanges(currentBS, priorBS, isOperatingAsset, 'ASSET', (cur, prior) => -(cur - prior));
  const wcLiabCurrent = computeChanges(currentBS, priorBS, isOperatingLiability, 'LIABILITY', (cur, prior) => cur - prior);

  // Prior period working capital (priorBS vs prePriorBS)
  const wcAssetPrior = computeChanges(priorBS, prePriorBS, isOperatingAsset, 'ASSET', (cur, prior) => -(cur - prior));
  const wcLiabPrior = computeChanges(priorBS, prePriorBS, isOperatingLiability, 'LIABILITY', (cur, prior) => cur - prior);

  // Merge current and prior working capital items
  const wcNames = new Set<string>();
  [...wcAssetCurrent.items, ...wcLiabCurrent.items, ...wcAssetPrior.items, ...wcLiabPrior.items].forEach((i) => wcNames.add(i.label));

  const wcCurrentMap = new Map<string, CFLineItem>();
  [...wcAssetCurrent.items, ...wcLiabCurrent.items].forEach((i) => wcCurrentMap.set(i.label, i));
  const wcPriorMap = new Map<string, CFLineItem>();
  [...wcAssetPrior.items, ...wcLiabPrior.items].forEach((i) => wcPriorMap.set(i.label, i));

  for (const name of Array.from(wcNames).sort()) {
    const cur = wcCurrentMap.get(name);
    const prior = wcPriorMap.get(name);
    operatingItems.push({
      label: `Change in ${name}`,
      current: cur?.current ?? 0,
      prior: prior?.current ?? 0,
      accountId: cur?.accountId ?? prior?.accountId,
      accountCode: cur?.accountCode ?? prior?.accountCode,
    });
  }

  const operatingCashFlow = netProfit + depreciation + wcAssetCurrent.total + wcLiabCurrent.total;
  const priorOperatingCashFlow = priorNetProfit + priorDepreciation + wcAssetPrior.total + wcLiabPrior.total;

  const operatingSection: CFSection = {
    id: 'operating',
    title: 'Operating Activities',
    description: 'Cash generated from core business operations',
    items: operatingItems,
    subtotal: operatingCashFlow,
    priorSubtotal: priorOperatingCashFlow,
  };

  // ─── Investing Activities ───
  const investCurrent = computeChanges(currentBS, priorBS, isInvestingAccount, 'ASSET', (cur, prior) => -(cur - prior));
  const investPrior = computeChanges(priorBS, prePriorBS, isInvestingAccount, 'ASSET', (cur, prior) => -(cur - prior));

  const investNames = new Set<string>();
  [...investCurrent.items, ...investPrior.items].forEach((i) => investNames.add(i.label));

  const investingItems: CFLineItem[] = [];
  for (const name of Array.from(investNames).sort()) {
    const cur = investCurrent.items.find((i) => i.label === name);
    const prior = investPrior.items.find((i) => i.label === name);
    const curVal = cur?.current ?? 0;
    const priorVal = prior?.current ?? 0;
    investingItems.push({
      label: curVal < 0 ? `Purchase of ${name}` : curVal > 0 ? `Sale of ${name}` : `Purchase/Sale of ${name}`,
      current: curVal,
      prior: priorVal,
      accountId: cur?.accountId ?? prior?.accountId,
      accountCode: cur?.accountCode ?? prior?.accountCode,
    });
  }

  const investingSection: CFSection = {
    id: 'investing',
    title: 'Investing Activities',
    description: 'Cash spent on or received from long-term assets',
    items: investingItems,
    subtotal: investCurrent.total,
    priorSubtotal: investPrior.total,
  };

  // ─── Financing Activities ───
  // Financing comes from liabilities (loans etc) and equity accounts
  const finLiabCurrent = computeChanges(currentBS, priorBS, isFinancingAccount, 'LIABILITY', (cur, prior) => cur - prior);
  const finLiabPrior = computeChanges(priorBS, prePriorBS, isFinancingAccount, 'LIABILITY', (cur, prior) => cur - prior);
  const finEquityCurrent = computeChanges(currentBS, priorBS, (acc) => acc.class === 'EQUITY' && isFinancingAccount(acc), 'EQUITY', (cur, prior) => cur - prior);
  const finEquityPrior = computeChanges(priorBS, prePriorBS, (acc) => acc.class === 'EQUITY' && isFinancingAccount(acc), 'EQUITY', (cur, prior) => cur - prior);

  const finAllCurrent = [...finLiabCurrent.items, ...finEquityCurrent.items];
  const finAllPrior = [...finLiabPrior.items, ...finEquityPrior.items];
  const finNames = new Set<string>();
  [...finAllCurrent, ...finAllPrior].forEach((i) => finNames.add(i.label));

  const financingItems: CFLineItem[] = [];
  for (const name of Array.from(finNames).sort()) {
    const cur = finAllCurrent.find((i) => i.label === name);
    const prior = finAllPrior.find((i) => i.label === name);
    const curVal = cur?.current ?? 0;
    const priorVal = prior?.current ?? 0;
    financingItems.push({
      label: curVal >= 0 ? `Proceeds from ${name}` : `Repayment of ${name}`,
      current: curVal,
      prior: priorVal,
      accountId: cur?.accountId ?? prior?.accountId,
      accountCode: cur?.accountCode ?? prior?.accountCode,
    });
  }

  const financingCashFlow = finLiabCurrent.total + finEquityCurrent.total;
  const priorFinancingCashFlow = finLiabPrior.total + finEquityPrior.total;

  const financingSection: CFSection = {
    id: 'financing',
    title: 'Financing Activities',
    description: 'Cash from borrowing, repaying debt, or equity changes',
    items: financingItems,
    subtotal: financingCashFlow,
    priorSubtotal: priorFinancingCashFlow,
  };

  const netChange = operatingCashFlow + investCurrent.total + financingCashFlow;
  const priorNetChange = priorOperatingCashFlow + investPrior.total + priorFinancingCashFlow;

  // ─── Cash Reconciliation ───
  // Opening cash = prior period closing cash (sum of cash/bank accounts)
  const cashFilter = (a: AccountEntry) => isCashAccount(a.name);
  const closingCash = (currentBS.find((s) => s.class === 'ASSET')?.accounts ?? []).filter(cashFilter).reduce((s, a) => s + a.amount, 0);
  const openingCash = (priorBS.find((s) => s.class === 'ASSET')?.accounts ?? []).filter(cashFilter).reduce((s, a) => s + a.amount, 0);
  const priorClosingCash = openingCash; // Prior closing = current opening
  const priorOpeningCash = (prePriorBS.find((s) => s.class === 'ASSET')?.accounts ?? []).filter(cashFilter).reduce((s, a) => s + a.amount, 0);

  // Does our computed closing match actual bank balance?
  const computedClosing = openingCash + netChange;
  const cashReconciles = Math.abs(computedClosing - closingCash) < 0.01;

  return {
    sections: [operatingSection, investingSection, financingSection],
    netChange,
    priorNetChange,
    openingCash,
    closingCash,
    priorOpeningCash,
    priorClosingCash,
    cashReconciles,
  };
}

export function CashFlowClient({
  connected,
  availablePeriods,
  allPnL,
  allBS,
  orgId,
  lastSyncAt,
}: Props) {
  const { format: formatCurrency } = useCurrency();
  const { yearEndMonth } = useAccountingConfig();

  const globalPeriod = useGlobalPeriodContext();
  const { openDrill } = useDrillDown();
  const [controls, setControls] = usePersistentReportState(
    'cash-flow',
    getDefaultReportState(availablePeriods, yearEndMonth),
    availablePeriods
  );

  // Cash flow method toggle
  const [method, setMethod] = useState<'indirect' | 'direct'>('indirect');

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: true,
    financing: true,
  });

  function toggleSection(id: string) {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Sync from global period selector when period OR mode changes.
  // Previously only selectedPeriods was synced — we now also sync periodMode
  // so clicking "Annual" in the global top bar updates the page-local pills too.
  const prevGlobalSigRef = useRef(`${globalPeriod.period}|${globalPeriod.mode}`);
  useEffect(() => {
    const sig = `${globalPeriod.period}|${globalPeriod.mode}`;
    if (sig !== prevGlobalSigRef.current) {
      prevGlobalSigRef.current = sig;
      const filtered = globalPeriod.selectedPeriods.filter((p) =>
        availablePeriods.includes(p)
      );
      setControls({
        ...controls,
        periodMode: globalPeriod.mode,
        selectedPeriods: filtered.length > 0 ? filtered : controls.selectedPeriods,
      });
    }
    // controls intentionally omitted — sync should fire on global change, not local
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPeriod.period, globalPeriod.mode, globalPeriod.selectedPeriods, availablePeriods]);

  // Derive current, prior, and pre-prior periods from controls.selectedPeriods
  const { currentPeriod, priorPeriod, prePriorPeriod, netProfit, priorNetProfit, depreciation, priorDepreciation, currentBS, priorBS, prePriorBS } = useMemo(() => {
    const selected = [...controls.selectedPeriods].sort();
    const current = selected.length > 0 ? selected[selected.length - 1] : null;
    const prior = selected.length > 1 ? selected[selected.length - 2] : null;
    // Pre-prior: period before the prior period in the full available periods list
    let prePrior: string | null = null;
    if (prior) {
      const priorIdx = availablePeriods.indexOf(prior);
      if (priorIdx > 0) {
        prePrior = availablePeriods[priorIdx - 1];
      }
    }
    return {
      currentPeriod: current,
      priorPeriod: prior,
      prePriorPeriod: prePrior,
      netProfit: current ? (allPnL[current]?.netProfit ?? 0) : 0,
      priorNetProfit: prior ? (allPnL[prior]?.netProfit ?? 0) : 0,
      depreciation: current ? (allPnL[current]?.depreciation ?? 0) : 0,
      priorDepreciation: prior ? (allPnL[prior]?.depreciation ?? 0) : 0,
      currentBS: current ? (allBS[current] ?? []) : [],
      priorBS: prior ? (allBS[prior] ?? []) : [],
      prePriorBS: prePrior ? (allBS[prePrior] ?? []) : [],
    };
  }, [controls.selectedPeriods, allPnL, allBS, availablePeriods]);

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

  const indirectResult = buildCashFlowSections(
    netProfit,
    priorNetProfit,
    depreciation,
    priorDepreciation,
    currentBS,
    priorBS,
    prePriorBS,
  );

  const directResult = buildDirectCashFlow(
    netProfit,
    priorNetProfit,
    depreciation,
    priorDepreciation,
    currentBS,
    priorBS,
    prePriorBS,
    indirectResult,
  );

  const activeResult = method === 'direct' ? directResult : indirectResult;
  const { sections, netChange, priorNetChange, openingCash, closingCash, priorOpeningCash, priorClosingCash, cashReconciles } = activeResult;

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
  // Reconciliation rows
  csvData.push(
    { Section: 'Reconciliation', Description: 'Opening Cash Balance', [formatPeriodLabel(currentPeriod)]: openingCash, ...(priorPeriod ? { [formatPeriodLabel(priorPeriod)]: priorOpeningCash } : {}) },
    { Section: 'Reconciliation', Description: 'Net Change in Cash', [formatPeriodLabel(currentPeriod)]: netChange, ...(priorPeriod ? { [formatPeriodLabel(priorPeriod)]: priorNetChange } : {}) },
    { Section: 'Reconciliation', Description: 'Closing Cash Balance', [formatPeriodLabel(currentPeriod)]: closingCash, ...(priorPeriod ? { [formatPeriodLabel(priorPeriod)]: priorClosingCash } : {}) },
  );

  const exportColumns: ExportColumn[] = [
    { header: 'Section', key: 'Section', format: 'text' },
    { header: 'Description', key: 'Description', format: 'text' },
    { header: formatPeriodLabel(currentPeriod), key: formatPeriodLabel(currentPeriod), format: 'currency' },
    ...(priorPeriod
      ? [{ header: formatPeriodLabel(priorPeriod), key: formatPeriodLabel(priorPeriod), format: 'currency' as const }]
      : []),
  ];

  const colCount = priorPeriod ? 5 : 3;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/financials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Financials
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-2xl font-bold">Cash Flow Statement</h2>
            <DataFreshness lastSyncAt={lastSyncAt} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {method === 'indirect' ? 'Indirect' : 'Direct'} method, as at {formatPeriodLabel(currentPeriod)}
          </p>
        </div>
        <ExportButton
          data={csvData}
          columns={exportColumns}
          filename="cash-flow-statement"
          title="Cash Flow Statement"
        />
      </div>

      {/* Data type legend */}
      <NumberLegend />

      {/* Method Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Method:</span>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              method === 'indirect'
                ? 'bg-background shadow-sm font-medium'
                : 'hover:bg-background/50'
            )}
            onClick={() => setMethod('indirect')}
          >
            Indirect
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              method === 'direct'
                ? 'bg-background shadow-sm font-medium'
                : 'hover:bg-background/50'
            )}
            onClick={() => setMethod('direct')}
          >
            Direct
          </button>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium">Indirect Method</p>
              <p className="text-xs">Starts from net profit and adjusts for non-cash items. Most common for management reporting.</p>
              <p className="font-medium mt-2">Direct Method</p>
              <p className="text-xs">Shows actual cash receipts and payments. Preferred by IFRS/FRS 102 for detailed cash analysis.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <ChallengeButton
        page="cash-flow"
        metricLabel="Cash Flow Statement"
        period={currentPeriod ?? undefined}
      />

      {/* AI Narrative Summary */}
      <NarrativeSummary
        orgId={orgId}
        period={currentPeriod ?? ''}
        narrativeEndpoint="narrative/cash-flow"
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
            label: 'Closing Cash',
            value: closingCash,
            change: priorPeriod ? closingCash - priorClosingCash : null,
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
                          <span className="uppercase text-xs tracking-wide">
                            <FinancialTooltip term={section.title} orgId={orgId}>
                              {section.title}
                            </FinancialTooltip>
                          </span>
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
                              accountName: item.label.replace('Change in ', '').replace('Purchase of ', '').replace('Sale of ', '').replace('Purchase/Sale of ', '').replace('Proceeds from ', '').replace('Repayment of ', ''),
                              accountCode: item.accountCode ?? '',
                              amount: item.current,
                              period: currentPeriod,
                            });
                          }
                        }}
                      >
                        <td className="px-4 py-2.5 pl-10">
                          <div className="flex items-center gap-1.5">
                            <span className={item.label === 'Net Profit' || item.label.startsWith('Add back:') ? 'font-medium' : 'text-muted-foreground'}>
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
                        No {section.id} activity detected for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}

            {/* Cash Reconciliation */}
            <tbody>
              {/* Opening Cash Balance */}
              <tr className="border-t-2 border-t-border bg-muted/10">
                <td className="px-4 py-3 font-semibold">
                  <FinancialTooltip term="Opening Cash Balance" orgId={orgId}>
                    Opening Cash Balance
                  </FinancialTooltip>
                </td>
                <td className="text-right px-4 py-3 font-mono text-sm font-semibold">
                  {formatCurrency(openingCash)}
                </td>
                <td />
                {priorPeriod && (
                  <td className="text-right px-4 py-3 font-mono text-xs font-semibold text-muted-foreground">
                    {formatCurrency(priorOpeningCash)}
                  </td>
                )}
                {priorPeriod && <td />}
              </tr>

              {/* Net Change in Cash */}
              <tr className="border-b bg-muted/10">
                <td className="px-4 py-3 font-semibold">
                  <FinancialTooltip term="Net Change in Cash" orgId={orgId}>
                    Net Change in Cash (Operating + Investing + Financing)
                  </FinancialTooltip>
                </td>
                <td className={`text-right px-4 py-3 font-mono text-sm font-semibold ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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

              {/* Closing Cash Balance */}
              <tr className="border-b bg-muted/20">
                <td className="px-4 py-3 font-bold text-base">
                  <div className="flex items-center gap-2">
                    <FinancialTooltip term="Closing Cash Balance" orgId={orgId}>
                      Closing Cash Balance
                    </FinancialTooltip>
                    <span className="text-sm" title={cashReconciles ? 'Closing cash matches bank balances' : 'Closing cash does not match bank balances. Check for unclassified items.'}>
                      {cashReconciles ? '\u2713' : '\u26A0\uFE0F'}
                    </span>
                  </div>
                </td>
                <td className={`text-right px-4 py-3 font-mono text-base font-bold ${closingCash >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(closingCash)}
                </td>
                <td />
                {priorPeriod && (
                  <td className="text-right px-4 py-3 font-mono text-xs font-bold text-muted-foreground">
                    {formatCurrency(priorClosingCash)}
                  </td>
                )}
                {priorPeriod && (
                  <td className={`text-right px-4 py-3 font-mono text-xs font-bold ${
                    (closingCash - priorClosingCash) > 0 ? 'text-emerald-600' : (closingCash - priorClosingCash) < 0 ? 'text-red-600' : ''
                  }`}>
                    {(closingCash - priorClosingCash) !== 0
                      ? `${(closingCash - priorClosingCash) > 0 ? '+' : ''}${formatCurrency(closingCash - priorClosingCash)}`
                      : '-'}
                  </td>
                )}
              </tr>
            </tbody>
          </tbody>
        </table>
      </div>

      {/* Cash flow equation */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium">Cash Flow Equation:</span>{' '}
        Operating ({formatCurrency(sections[0].subtotal)}) + Investing ({formatCurrency(sections[1].subtotal)}) + Financing ({formatCurrency(sections[2].subtotal)}) = Net Change ({formatCurrency(netChange)})
      </div>

      {/* Working Capital Cycle */}
      {(() => {
        // Extract receivables and payables from balance sheet data
        const receivables = (currentBS.find((s) => s.class === 'ASSET')?.accounts ?? [])
          .filter((a) => {
            const lower = a.name.toLowerCase();
            return lower.includes('receivable') || lower.includes('debtor') || lower.includes('trade debtor');
          })
          .reduce((sum, a) => sum + Math.abs(a.amount), 0);

        const payables = (currentBS.find((s) => s.class === 'LIABILITY')?.accounts ?? [])
          .filter((a) => {
            const lower = a.name.toLowerCase();
            return lower.includes('payable') || lower.includes('creditor') || lower.includes('trade creditor');
          })
          .reduce((sum, a) => sum + Math.abs(a.amount), 0);

        // Revenue and COGS from P&L (annualise the monthly figure)
        const monthlyRevenue = allPnL[currentPeriod ?? '']?.netProfit !== undefined
          ? (Object.values(allPnL).reduce((s, p) => s + (p.netProfit ?? 0), 0) / Object.keys(allPnL).length + Math.abs(Object.values(allPnL).reduce((s, p) => s + (p.netProfit ?? 0), 0) / Object.keys(allPnL).length)) || 1
          : 1;

        // Use annual revenue approximation for debtor/creditor days
        const annualRevenue = Math.abs(netProfit + sections[0].subtotal) * 12 || 1; // rough proxy
        const annualCOGS = annualRevenue * 0.5 || 1; // rough proxy if COGS not available

        const debtorDays = annualRevenue > 0 ? Math.round((receivables / annualRevenue) * 365) : 0;
        const creditorDays = annualCOGS > 0 ? Math.round((payables / annualCOGS) * 365) : 0;
        const cashConversionCycle = debtorDays - creditorDays;

        if (receivables === 0 && payables === 0) return null;

        return (
          <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
            <p className="text-xs font-semibold text-foreground mb-2">Working Capital Cycle (Estimated)</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{debtorDays}d</p>
                <p className="text-[10px] text-muted-foreground">Debtor Days</p>
                <p className="text-[9px] text-muted-foreground/70">How long customers take to pay</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{creditorDays}d</p>
                <p className="text-[10px] text-muted-foreground">Creditor Days</p>
                <p className="text-[9px] text-muted-foreground/70">How long you take to pay suppliers</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${cashConversionCycle > 60 ? 'text-red-600' : cashConversionCycle > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {cashConversionCycle}d
                </p>
                <p className="text-[10px] text-muted-foreground">Cash Conversion Cycle</p>
                <p className="text-[9px] text-muted-foreground/70">Debtor days minus creditor days</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/financials/balance-sheet" label="Balance Sheet" />
        <CrossRef href="/financials/income-statement" label="Income Statement" />
        <CrossRef href="/dashboard/financial-health" label="Financial Health" />
      </div>
    </div>
  );
}
