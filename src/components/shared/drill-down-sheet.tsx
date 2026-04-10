'use client';

/**
 * Universal Drill-Down Sheet (DataRails-style)
 *
 * A shared slide-over panel that can be triggered from ANY clickable number
 * on the platform. Supports multiple drill contexts:
 * - P&L section → accounts → transactions
 * - KPI metric → contributing accounts → transactions
 * - Variance item → drivers → transactions
 * - Any DrillableNumber → source trail
 *
 * Usage:
 *   <DrillDownProvider orgId={orgId}>
 *     <YourPage />
 *     <DrillDownSheet />
 *   </DrillDownProvider>
 *
 * Then from any child component:
 *   const { openDrill } = useDrillDown();
 *   openDrill({ type: 'pnl_section', section, period });
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { X, ChevronRight, ArrowLeft, Download, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PnLRow, PnLSection } from '@/lib/financial/aggregate';
import { formatCurrency } from '@/lib/formatting/currency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Contexts that can trigger the drill-down panel */
export type DrillContext =
  | { type: 'pnl_section'; section: PnLSection; period: string }
  | { type: 'account'; accountId: string; accountName: string; accountCode: string; amount: number; period: string }
  | { type: 'kpi'; kpiKey: string; label: string; value: number; formattedValue: string; period: string; accountIds?: string[] }
  | { type: 'variance'; metric: string; current: number; previous: number; period: string; drivers?: VarianceDriver[] }
  | { type: 'custom'; title: string; subtitle?: string; rows: CustomDrillRow[] };

export interface VarianceDriver {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
  explanation: string;
  accountId?: string;
  period?: string;
}

export interface CustomDrillRow {
  label: string;
  value: string;
  sublabel?: string;
  onClick?: () => void;
}

interface Transaction {
  id: string;
  date: string;
  reference: string;
  contact_name: string;
  description: string;
  amount: number;
  type: string;
}

/** Invoice-level line item returned by /api/financials/account-detail */
interface InvoiceLineItem {
  id: string;
  date: string;
  contactName: string;
  description: string;
  reference: string;
  amount: number;
  type: string;
}

/** Breadcrumb level for multi-level navigation */
interface BreadcrumbLevel {
  label: string;
  context: DrillContext;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DrillDownContextValue {
  openDrill: (context: DrillContext) => void;
  closeDrill: () => void;
  isOpen: boolean;
}

const DrillDownContext = createContext<DrillDownContextValue | null>(null);

export function useDrillDown() {
  const ctx = useContext(DrillDownContext);
  if (!ctx) throw new Error('useDrillDown must be used within <DrillDownProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface DrillDownProviderProps {
  orgId: string;
  children: ReactNode;
}

export function DrillDownProvider({ orgId, children }: DrillDownProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<DrillContext | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbLevel[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txAccount, setTxAccount] = useState<{ name: string; code: string; amount: number } | null>(null);

  // Invoice-level drill-down state
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineItem[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceAccount, setInvoiceAccount] = useState<{ name: string; code: string; amount: number } | null>(null);

  const openDrill = useCallback((ctx: DrillContext) => {
    setContext(ctx);
    setBreadcrumbs([]);
    setTransactions([]);
    setTxAccount(null);
    setInvoiceLines([]);
    setInvoiceAccount(null);
    setIsOpen(true);

    // Auto-fetch invoice-level detail for account drill-down
    if (ctx.type === 'account') {
      const periodMonth = ctx.period.length === 7 ? ctx.period : ctx.period.slice(0, 7);
      const [yr, mo] = periodMonth.split('-').map(Number);
      const periodStart = `${periodMonth}-01`;
      const lastDay = new Date(yr, mo, 0).getDate();
      const periodEnd = `${periodMonth}-${String(lastDay).padStart(2, '0')}`;

      setLoadingInvoices(true);
      setInvoiceAccount({ name: ctx.accountName, code: ctx.accountCode, amount: ctx.amount });
      const params = new URLSearchParams({ orgId, accountId: ctx.accountId, periodStart, periodEnd });
      fetch(`/api/financials/account-detail?${params}`)
        .then((res) => (res.ok ? res.json() : { lineItems: [] }))
        .then((data) => setInvoiceLines(data.lineItems ?? []))
        .catch(() => setInvoiceLines([]))
        .finally(() => setLoadingInvoices(false));
    }
  }, [orgId]);

  const closeDrill = useCallback(() => {
    setIsOpen(false);
    setContext(null);
    setBreadcrumbs([]);
    setTransactions([]);
    setTxAccount(null);
    setInvoiceLines([]);
    setInvoiceAccount(null);
  }, []);

  const pushLevel = useCallback((label: string, newContext: DrillContext) => {
    if (context) {
      setBreadcrumbs((prev) => [...prev, { label: getContextTitle(context), context }]);
    }
    setContext(newContext);
    setTransactions([]);
    setTxAccount(null);
    setInvoiceLines([]);
    setInvoiceAccount(null);
  }, [context]);

  const popLevel = useCallback(() => {
    // If showing invoice detail, just clear invoice state to return to account list
    if (invoiceAccount !== null) {
      setInvoiceLines([]);
      setInvoiceAccount(null);
      return;
    }
    // If showing transactions, just clear transaction state
    if (txAccount !== null) {
      setTransactions([]);
      setTxAccount(null);
      return;
    }
    if (breadcrumbs.length > 0) {
      const prev = breadcrumbs[breadcrumbs.length - 1];
      setBreadcrumbs((crumbs) => crumbs.slice(0, -1));
      setContext(prev.context);
      setTransactions([]);
      setTxAccount(null);
      setInvoiceLines([]);
      setInvoiceAccount(null);
    }
  }, [breadcrumbs, invoiceAccount, txAccount]);

  const fetchTransactions = useCallback(async (accountId: string, period: string, account: { name: string; code: string; amount: number }) => {
    setLoadingTx(true);
    setTxAccount(account);
    try {
      const periodFormatted = period.length === 7 ? period : period.slice(0, 7);
      const res = await fetch(`/api/transactions/${orgId}?accountId=${accountId}&period=${periodFormatted}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions ?? []);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  }, [orgId]);

  /** Fetch invoice-level line items for an account within a period (uses /api/financials/account-detail) */
  const fetchInvoiceDetail = useCallback(async (
    accountId: string,
    period: string,
    account: { name: string; code: string; amount: number }
  ) => {
    setLoadingInvoices(true);
    setInvoiceAccount(account);
    try {
      // Convert period (YYYY-MM or YYYY-MM-DD) to start/end of month
      const periodMonth = period.length === 7 ? period : period.slice(0, 7);
      const [year, month] = periodMonth.split('-').map(Number);
      const periodStart = `${periodMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const periodEnd = `${periodMonth}-${String(lastDay).padStart(2, '0')}`;

      const params = new URLSearchParams({
        orgId,
        accountId,
        periodStart,
        periodEnd,
      });
      const res = await fetch(`/api/financials/account-detail?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoiceLines(data.lineItems ?? []);
      }
    } catch {
      setInvoiceLines([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [orgId]);

  return (
    <DrillDownContext.Provider value={{ openDrill, closeDrill, isOpen }}>
      {children}
      {isOpen && context && (
        <DrillDownSheet
          context={context}
          breadcrumbs={breadcrumbs}
          transactions={transactions}
          loadingTx={loadingTx}
          txAccount={txAccount}
          invoiceLines={invoiceLines}
          loadingInvoices={loadingInvoices}
          invoiceAccount={invoiceAccount}
          onClose={closeDrill}
          onPushLevel={pushLevel}
          onPopLevel={popLevel}
          onFetchTransactions={fetchTransactions}
          onFetchInvoiceDetail={fetchInvoiceDetail}
        />
      )}
    </DrillDownContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// formatCurrency imported from @/lib/formatting/currency at top of file

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPeriodLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function getContextTitle(ctx: DrillContext): string {
  switch (ctx.type) {
    case 'pnl_section': return ctx.section.label;
    case 'account': return ctx.accountName;
    case 'kpi': return ctx.label;
    case 'variance': return `${ctx.metric} Variance`;
    case 'custom': return ctx.title;
  }
}

function getContextSubtitle(ctx: DrillContext): string {
  switch (ctx.type) {
    case 'pnl_section': return `${ctx.section.rows.length} ${ctx.section.rows.length === 1 ? 'account' : 'accounts'} in ${formatPeriodLabel(ctx.period)}`;
    case 'account': return `${ctx.accountCode} in ${formatPeriodLabel(ctx.period)}`;
    case 'kpi': return `${ctx.formattedValue} for ${formatPeriodLabel(ctx.period)}`;
    case 'variance': return `${formatCurrency(ctx.current)} vs ${formatCurrency(ctx.previous)}`;
    case 'custom': return ctx.subtitle ?? '';
  }
}

function exportTransactionsCSV(transactions: Transaction[], accountName: string) {
  if (transactions.length === 0) return;
  const headers = ['Date', 'Contact', 'Description', 'Reference', 'Amount', 'Type'];
  const rows = transactions.map((tx) => [
    tx.date,
    tx.contact_name,
    tx.description,
    tx.reference,
    tx.amount.toString(),
    tx.type,
  ].map((v) => `"${(v ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${accountName.replace(/\s+/g, '_')}_transactions.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sheet Component
// ---------------------------------------------------------------------------

interface DrillDownSheetProps {
  context: DrillContext;
  breadcrumbs: BreadcrumbLevel[];
  transactions: Transaction[];
  loadingTx: boolean;
  txAccount: { name: string; code: string; amount: number } | null;
  invoiceLines: InvoiceLineItem[];
  loadingInvoices: boolean;
  invoiceAccount: { name: string; code: string; amount: number } | null;
  onClose: () => void;
  onPushLevel: (label: string, ctx: DrillContext) => void;
  onPopLevel: () => void;
  onFetchTransactions: (accountId: string, period: string, account: { name: string; code: string; amount: number }) => void;
  onFetchInvoiceDetail: (accountId: string, period: string, account: { name: string; code: string; amount: number }) => void;
}

function DrillDownSheet({
  context,
  breadcrumbs,
  transactions,
  loadingTx,
  txAccount,
  invoiceLines,
  loadingInvoices,
  invoiceAccount,
  onClose,
  onPushLevel,
  onPopLevel,
  onFetchTransactions,
  onFetchInvoiceDetail,
}: DrillDownSheetProps) {
  const showingTransactions = txAccount !== null;
  const showingInvoiceDetail = invoiceAccount !== null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-hidden border-l bg-background shadow-2xl animate-in slide-in-from-right duration-300 sm:max-w-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-background">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 px-4 pt-3 text-xs text-muted-foreground overflow-x-auto">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={onPopLevel}
                    className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                  >
                    {crumb.label}
                  </button>
                  <ChevronRight className="h-3 w-3" />
                </span>
              ))}
              <span className="text-foreground font-medium shrink-0">
                {showingInvoiceDetail
                  ? invoiceAccount?.name
                  : showingTransactions
                    ? txAccount.name
                    : getContextTitle(context)
                }
              </span>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {(breadcrumbs.length > 0 || showingTransactions || showingInvoiceDetail) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => {
                    if (showingTransactions || showingInvoiceDetail) {
                      // Go back to account list, handled by clearing state via popLevel
                      onPopLevel();
                    } else {
                      onPopLevel();
                    }
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold truncate">
                  {showingInvoiceDetail
                    ? `${invoiceAccount?.name ?? 'Account'} - Invoice Detail`
                    : showingTransactions
                      ? txAccount.name
                      : getContextTitle(context)
                  }
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {showingInvoiceDetail
                    ? `${invoiceAccount?.code ?? ''} · ${formatCurrency(invoiceAccount?.amount ?? 0)}`
                    : showingTransactions
                      ? `${txAccount.code} · ${formatCurrency(txAccount.amount)}`
                      : getContextSubtitle(context)
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {showingInvoiceDetail && invoiceLines.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Export invoice detail as CSV"
                  onClick={() => exportInvoiceDetailCSV(invoiceLines, invoiceAccount?.name ?? 'account')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {showingTransactions && transactions.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Export transactions as CSV"
                  onClick={() => exportTransactionsCSV(transactions, txAccount.name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] p-4">
          {showingInvoiceDetail ? (
            <InvoiceDetailList
              lineItems={invoiceLines}
              loading={loadingInvoices}
              account={invoiceAccount}
            />
          ) : showingTransactions ? (
            <TransactionList
              transactions={transactions}
              loading={loadingTx}
            />
          ) : (
            <ContextContent
              context={context}
              onPushLevel={onPushLevel}
              onFetchTransactions={onFetchTransactions}
              onFetchInvoiceDetail={onFetchInvoiceDetail}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Context-specific content renderers
// ---------------------------------------------------------------------------

function ContextContent({
  context,
  onPushLevel,
  onFetchTransactions,
  onFetchInvoiceDetail,
}: {
  context: DrillContext;
  onPushLevel: (label: string, ctx: DrillContext) => void;
  onFetchTransactions: (accountId: string, period: string, account: { name: string; code: string; amount: number }) => void;
  onFetchInvoiceDetail: (accountId: string, period: string, account: { name: string; code: string; amount: number }) => void;
}) {
  switch (context.type) {
    case 'pnl_section':
      return (
        <PnLSectionContent
          section={context.section}
          period={context.period}
          onAccountClick={(row) => {
            // Drill into invoice-level detail for this account.
            // Do NOT call onPushLevel — it clears invoiceAccount/invoiceLines.
            // The invoice detail view replaces the content in-place, and the
            // back button (popLevel / clear invoiceAccount) returns here.
            onFetchInvoiceDetail(row.accountId, context.period, {
              name: row.accountName,
              code: row.accountCode,
              amount: row.amount,
            });
          }}
        />
      );

    case 'account':
      // Account transactions are auto-fetched by openDrill; rendered by the
      // transaction table in DrillDownSheet (below the context content).
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{context.accountName}</p>
              {context.accountCode && (
                <p className="text-xs text-muted-foreground">Code: {context.accountCode}</p>
              )}
            </div>
            <p className="text-lg font-bold">{formatCurrency(context.amount)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatPeriodLabel(context.period)} – Transactions loaded below
          </p>
        </div>
      );

    case 'kpi':
      return (
        <KPIContent
          kpiKey={context.kpiKey}
          label={context.label}
          value={context.value}
          formattedValue={context.formattedValue}
          period={context.period}
        />
      );

    case 'variance':
      return (
        <VarianceContent
          metric={context.metric}
          current={context.current}
          previous={context.previous}
          drivers={context.drivers}
          period={context.period}
          onDriverClick={(driver) => {
            if (driver.accountId && driver.period) {
              onFetchTransactions(driver.accountId, driver.period, {
                name: driver.factor,
                code: '',
                amount: driver.impact,
              });
              onPushLevel(`${context.metric} Variance`, context);
            }
          }}
        />
      );

    case 'custom':
      return <CustomContent rows={context.rows} />;
  }
}

// ---------------------------------------------------------------------------
// P&L Section Content (account breakdown)
// ---------------------------------------------------------------------------

function PnLSectionContent({
  section,
  period,
  onAccountClick,
}: {
  section: PnLSection;
  period: string;
  onAccountClick: (row: PnLRow) => void;
}) {
  const sorted = [...section.rows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const MIN_ACCOUNTS_FOR_GRANULARITY = 4;
  const hasLowGranularity = section.rows.length > 0 && section.rows.length < MIN_ACCOUNTS_FOR_GRANULARITY;
  const isSingleAccount = section.rows.length === 1;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {section.rows.length} {section.rows.length === 1 ? 'account' : 'accounts'} in {formatPeriodLabel(period)}
        </span>
        <span className="font-semibold">{formatCurrency(section.total)}</span>
      </div>

      {/* Granularity nudge — encourage better chart of accounts structure */}
      {hasLowGranularity && Math.abs(section.total) > 0 && (
        <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${
          isSingleAccount
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
            : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200'
        }`}>
          {isSingleAccount ? (
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {isSingleAccount
                ? 'Low visibility — only 1 account in this section'
                : `Only ${section.rows.length} accounts in this section`}
            </p>
            <p className="mt-0.5 opacity-80">
              {isSingleAccount
                ? `All ${section.label} spend is grouped under "${sorted[0]?.accountName}". Consider splitting this into sub-accounts in Xero (e.g. materials, packaging, labour) for better cost visibility and trend analysis.`
                : `For better financial visibility, consider adding more detail in your chart of accounts. Most businesses benefit from 4+ accounts per major section.`}
            </p>
          </div>
        </div>
      )}

      {/* Account table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px]">Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right w-[50px]">%</TableHead>
            <TableHead className="text-right w-[50px]">Txns</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const pct = section.total !== 0
              ? ((Math.abs(row.amount) / Math.abs(section.total)) * 100).toFixed(1)
              : '0';
            return (
              <TableRow
                key={row.accountId}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onAccountClick(row)}
              >
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {row.accountCode}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{row.accountName}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium font-mono text-sm">
                  {formatCurrency(row.amount)}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {pct}%
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {row.transactionCount}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Content
// ---------------------------------------------------------------------------

/** Maps KPI keys to the P&L section classes that feed them */
const KPI_SECTION_MAP: Record<string, { sections: string[]; description: string }> = {
  revenue: { sections: ['REVENUE'], description: 'Sum of all revenue accounts' },
  gross_margin: { sections: ['REVENUE', 'DIRECTCOSTS'], description: 'Revenue minus cost of goods sold, as a percentage' },
  gross_profit: { sections: ['REVENUE', 'DIRECTCOSTS'], description: 'Revenue minus cost of goods sold' },
  expenses: { sections: ['EXPENSE', 'OVERHEADS'], description: 'Sum of operating expenses and overheads' },
  net_profit: { sections: ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'], description: 'Revenue minus all costs and expenses' },
  net_margin: { sections: ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'], description: 'Net profit as a percentage of revenue' },
};

function KPIContent({
  kpiKey,
  label,
  value,
  formattedValue,
  period,
}: {
  kpiKey: string;
  label: string;
  value: number;
  formattedValue: string;
  period: string;
}) {
  const mapping = KPI_SECTION_MAP[kpiKey];

  return (
    <div className="space-y-4">
      {/* KPI summary card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold mt-1">{formattedValue}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatPeriodLabel(period)}</p>
      </div>

      {/* Breakdown explanation */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium">What makes up this number</p>
        {mapping ? (
          <>
            <p className="text-xs text-muted-foreground">{mapping.description}</p>
            <div className="space-y-1 mt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Contributing sections</p>
              {mapping.sections.map((section) => {
                const sectionLabels: Record<string, string> = {
                  REVENUE: 'Revenue',
                  DIRECTCOSTS: 'Cost of Goods Sold',
                  EXPENSE: 'Operating Expenses',
                  OVERHEADS: 'Overheads',
                };
                return (
                  <a
                    key={section}
                    href="/financials/income-statement"
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <span>{sectionLabels[section] ?? section}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            This KPI ({kpiKey}) is calculated from your financial data for {formatPeriodLabel(period)}.
            View the income statement for full account-level detail.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs" asChild>
          <a href="/financials/income-statement">
            <ExternalLink className="h-3 w-3 mr-1.5" />
            View Income Statement
          </a>
        </Button>
        <Button variant="outline" size="sm" className="text-xs" asChild>
          <a href="/kpi">
            <ExternalLink className="h-3 w-3 mr-1.5" />
            View All KPIs
          </a>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variance Content (driver breakdown)
// ---------------------------------------------------------------------------

function VarianceContent({
  metric,
  current,
  previous,
  drivers,
  period,
  onDriverClick,
}: {
  metric: string;
  current: number;
  previous: number;
  drivers?: VarianceDriver[];
  period: string;
  onDriverClick: (driver: VarianceDriver) => void;
}) {
  const change = current - previous;
  const changePct = previous !== 0 ? ((change / Math.abs(previous)) * 100).toFixed(1) : 'N/A';
  const isFavourable = change >= 0;

  return (
    <div className="space-y-4">
      {/* Variance summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Current</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(current)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Previous</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(previous)}</p>
        </div>
        <div className={`rounded-lg border p-3 ${isFavourable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Change</p>
          <p className={`text-lg font-bold mt-1 ${isFavourable ? 'text-green-700' : 'text-red-700'}`}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)}
          </p>
          <p className={`text-[10px] ${isFavourable ? 'text-green-600' : 'text-red-600'}`}>
            {changePct}%
          </p>
        </div>
      </div>

      {/* Drivers */}
      {drivers && drivers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Variance drivers</p>
          <div className="space-y-1">
            {drivers.map((driver, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  driver.accountId ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
                onClick={() => driver.accountId && onDriverClick(driver)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{driver.factor}</span>
                    {driver.accountId && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>
                  {driver.explanation && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{driver.explanation}</p>
                  )}
                </div>
                <div className={`shrink-0 ml-3 font-medium font-mono ${
                  driver.direction === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {driver.impact >= 0 ? '+' : ''}{formatCurrency(driver.impact)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Content
// ---------------------------------------------------------------------------

function CustomContent({ rows }: { rows: CustomDrillRow[] }) {
  return (
    <div className="space-y-1">
      {rows.map((row, idx) => (
        <div
          key={idx}
          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
            row.onClick ? 'cursor-pointer hover:bg-muted/50' : ''
          }`}
          onClick={row.onClick}
        >
          <div>
            <span className="text-sm">{row.label}</span>
            {row.sublabel && <p className="text-xs text-muted-foreground">{row.sublabel}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium font-mono">{row.value}</span>
            {row.onClick && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction List (deepest drill level)
// ---------------------------------------------------------------------------

function TransactionList({
  transactions,
  loading,
}: {
  transactions: Transaction[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm text-muted-foreground">No individual transactions available.</p>
        <p className="text-xs text-muted-foreground">
          Transaction detail is populated from your Xero sync. Make sure your data is synced.
        </p>
      </div>
    );
  }

  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{transactions.length} transactions</span>
        <span className="font-medium text-foreground">{formatCurrency(total)}</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[90px]">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(tx.date)}
              </TableCell>
              <TableCell>
                <div className="text-sm">{tx.contact_name || tx.description || 'No description'}</div>
                {tx.reference && (
                  <div className="text-[10px] text-muted-foreground">{tx.reference}</div>
                )}
              </TableCell>
              <TableCell className="text-right font-medium font-mono text-sm">
                {formatCurrency(tx.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail List (invoice-level drill-down)
// ---------------------------------------------------------------------------

function exportInvoiceDetailCSV(lineItems: InvoiceLineItem[], accountName: string) {
  if (lineItems.length === 0) return;
  const headers = ['Date', 'Contact/Customer', 'Description', 'Reference', 'Amount', 'Type'];
  const rows = lineItems.map((li) => [
    li.date,
    li.contactName,
    li.description,
    li.reference,
    li.amount.toString(),
    li.type,
  ].map((v) => `"${(v ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${accountName.replace(/\s+/g, '_')}_invoice_detail.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function InvoiceDetailList({
  lineItems,
  loading,
  account,
}: {
  lineItems: InvoiceLineItem[];
  loading: boolean;
  account: { name: string; code: string; amount: number } | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading invoice detail...</p>
        </div>
      </div>
    );
  }

  if (lineItems.length === 0) {
    return (
      <div className="space-y-4">
        {/* Account summary */}
        {account && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{account.name}</p>
              <p className="text-xs text-muted-foreground">Code: {account.code}</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(account.amount)}</p>
          </div>
        )}
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-muted-foreground">No invoice line items found for this account.</p>
          <p className="text-xs text-muted-foreground">
            Invoice detail is populated from Xero invoices and bills. Make sure your data is synced.
          </p>
        </div>
      </div>
    );
  }

  const total = lineItems.reduce((sum, li) => sum + li.amount, 0);

  return (
    <div className="space-y-3">
      {/* Account summary card */}
      {account && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{account.name}</p>
            <p className="text-xs text-muted-foreground">Code: {account.code}</p>
          </div>
          <p className="text-lg font-bold">{formatCurrency(account.amount)}</p>
        </div>
      )}

      {/* Line item count and total */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{lineItems.length} invoice line items</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{formatCurrency(total)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Export invoice detail as CSV"
            onClick={() => exportInvoiceDetailCSV(lineItems, account?.name ?? 'account')}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Invoice line items table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[85px]">Date</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[80px]">Ref</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((li) => (
            <TableRow key={li.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(li.date)}
              </TableCell>
              <TableCell className="text-sm">
                {li.contactName || <span className="text-muted-foreground italic">Unknown</span>}
              </TableCell>
              <TableCell>
                <div className="text-sm truncate max-w-[200px]" title={li.description}>
                  {li.description || <span className="text-muted-foreground italic">No description</span>}
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[80px]" title={li.reference}>
                {li.reference || '-'}
              </TableCell>
              <TableCell className="text-right font-medium font-mono text-sm whitespace-nowrap">
                {formatCurrency(li.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
