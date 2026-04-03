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
import { X, ChevronRight, ArrowLeft, Download, ExternalLink } from 'lucide-react';
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

  const openDrill = useCallback((ctx: DrillContext) => {
    setContext(ctx);
    setBreadcrumbs([]);
    setTransactions([]);
    setTxAccount(null);
    setIsOpen(true);
  }, []);

  const closeDrill = useCallback(() => {
    setIsOpen(false);
    setContext(null);
    setBreadcrumbs([]);
    setTransactions([]);
    setTxAccount(null);
  }, []);

  const pushLevel = useCallback((label: string, newContext: DrillContext) => {
    if (context) {
      setBreadcrumbs((prev) => [...prev, { label: getContextTitle(context), context }]);
    }
    setContext(newContext);
    setTransactions([]);
    setTxAccount(null);
  }, [context]);

  const popLevel = useCallback(() => {
    if (breadcrumbs.length > 0) {
      const prev = breadcrumbs[breadcrumbs.length - 1];
      setBreadcrumbs((crumbs) => crumbs.slice(0, -1));
      setContext(prev.context);
      setTransactions([]);
      setTxAccount(null);
    }
  }, [breadcrumbs]);

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
          onClose={closeDrill}
          onPushLevel={pushLevel}
          onPopLevel={popLevel}
          onFetchTransactions={fetchTransactions}
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
    case 'pnl_section': return `${ctx.section.rows.length} accounts in ${formatPeriodLabel(ctx.period)}`;
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
  onClose: () => void;
  onPushLevel: (label: string, ctx: DrillContext) => void;
  onPopLevel: () => void;
  onFetchTransactions: (accountId: string, period: string, account: { name: string; code: string; amount: number }) => void;
}

function DrillDownSheet({
  context,
  breadcrumbs,
  transactions,
  loadingTx,
  txAccount,
  onClose,
  onPushLevel,
  onPopLevel,
  onFetchTransactions,
}: DrillDownSheetProps) {
  const showingTransactions = txAccount !== null;

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
                {showingTransactions ? txAccount.name : getContextTitle(context)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {(breadcrumbs.length > 0 || showingTransactions) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => {
                    if (showingTransactions) {
                      // Go back to account list, handled by clearing txAccount via popLevel or reset
                      // This is a "soft" back within the same context level
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
                  {showingTransactions ? txAccount.name : getContextTitle(context)}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {showingTransactions
                    ? `${txAccount.code} · ${formatCurrency(txAccount.amount)}`
                    : getContextSubtitle(context)
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
          {showingTransactions ? (
            <TransactionList
              transactions={transactions}
              loading={loadingTx}
            />
          ) : (
            <ContextContent
              context={context}
              onPushLevel={onPushLevel}
              onFetchTransactions={onFetchTransactions}
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
}: {
  context: DrillContext;
  onPushLevel: (label: string, ctx: DrillContext) => void;
  onFetchTransactions: (accountId: string, period: string, account: { name: string; code: string; amount: number }) => void;
}) {
  switch (context.type) {
    case 'pnl_section':
      return (
        <PnLSectionContent
          section={context.section}
          period={context.period}
          onAccountClick={(row) => {
            onFetchTransactions(row.accountId, context.period, {
              name: row.accountName,
              code: row.accountCode,
              amount: row.amount,
            });
            onPushLevel(context.section.label, context);
          }}
        />
      );

    case 'account':
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Loading account details...
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

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {section.rows.length} accounts in {formatPeriodLabel(period)}
        </span>
        <span className="font-semibold">{formatCurrency(section.total)}</span>
      </div>

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
  return (
    <div className="space-y-4">
      {/* KPI summary card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold mt-1">{formattedValue}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatPeriodLabel(period)}</p>
      </div>

      {/* Explanation */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium">What makes up this number</p>
        <p className="text-xs text-muted-foreground">
          This KPI ({kpiKey}) is calculated from your financial data for {formatPeriodLabel(period)}.
          Click into the accounts on the financial statements page to see the source transactions.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs" asChild>
          <a href={`/financials/income-statement`}>
            <ExternalLink className="h-3 w-3 mr-1.5" />
            View Income Statement
          </a>
        </Button>
        <Button variant="outline" size="sm" className="text-xs" asChild>
          <a href={`/kpi`}>
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
