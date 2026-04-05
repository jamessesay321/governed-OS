'use client';

/**
 * CMD+K Command Palette (F-076)
 *
 * Two modes:
 * 1. Navigate — type page names, fuzzy-match against SEARCH_INDEX
 * 2. Query   — if input looks like a question, ask AI for structured data
 *
 * Query results render inline as mini-charts, data tables, or single values.
 * Supports "Save as Widget" and "Open in full page" actions on query results.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MiniSparkline } from '@/components/data-primitives/mini-sparkline';
import { formatCurrency } from '@/lib/formatting/currency';

/* ------------------------------------------------------------------ */
/*  Search Index (Navigation items)                                   */
/* ------------------------------------------------------------------ */

interface SearchItem {
  label: string;
  href: string;
  keywords: string[];
  category: string;
  icon?: string;
}

const SEARCH_INDEX: SearchItem[] = [
  { label: 'Dashboard', href: '/dashboard', keywords: ['dashboard', 'overview', 'summary', 'ceo'], category: 'Dashboard', icon: 'bar-chart' },
  { label: 'Key Actions', href: '/dashboard/key-actions', keywords: ['key actions', 'briefing', 'daily', 'priorities', 'focus'], category: 'Dashboard', icon: 'lightbulb' },
  { label: 'Executive Summary', href: '/dashboard/executive-summary', keywords: ['executive', 'summary', 'overview'], category: 'Dashboard', icon: 'file-text' },
  { label: 'Income Statement', href: '/financials/income-statement', keywords: ['income statement', 'p&l', 'profit and loss', 'revenue', 'expenses'], category: 'Financials', icon: 'trending-up' },
  { label: 'Balance Sheet', href: '/financials/balance-sheet', keywords: ['balance sheet', 'assets', 'liabilities', 'equity'], category: 'Financials', icon: 'scale' },
  { label: 'Cash Flow', href: '/financials/cash-flow', keywords: ['cash flow', 'cash', 'operating', 'investing', 'financing', 'runway'], category: 'Financials', icon: 'wallet' },
  { label: 'Budget vs Actual', href: '/financials/budget', keywords: ['budget', 'actual', 'variance'], category: 'Financials', icon: 'target' },
  { label: 'KPI Dashboard', href: '/kpi', keywords: ['kpi', 'key performance', 'metrics', 'indicators'], category: 'KPIs', icon: 'activity' },
  { label: 'Variance Analysis', href: '/variance', keywords: ['variance', 'comparison', 'period'], category: 'Variance', icon: 'git-compare' },
  { label: 'Graph Builder', href: '/graphs/builder', keywords: ['graph', 'chart', 'build', 'visualise', 'bar', 'pie', 'line'], category: 'Graph Studio', icon: 'bar-chart' },
  { label: 'AI Insights', href: '/intelligence', keywords: ['intelligence', 'insights', 'ai', 'analysis'], category: 'Intelligence', icon: 'sparkles' },
  { label: 'Anomaly Detection', href: '/intelligence/anomalies', keywords: ['anomaly', 'unusual', 'outlier', 'spike'], category: 'Intelligence', icon: 'alert-triangle' },
  { label: 'Scenario Builder', href: '/scenarios', keywords: ['scenario', 'what if', 'forecast', 'model'], category: 'Scenarios', icon: 'layers' },
  { label: 'Goalseek', href: '/scenarios/goalseek', keywords: ['goalseek', 'target', 'reverse', 'break even'], category: 'Scenarios', icon: 'target' },
  { label: 'Playbook', href: '/playbook', keywords: ['playbook', 'actions', 'priorities'], category: 'Playbook', icon: 'compass' },
  { label: 'Reports', href: '/reports', keywords: ['reports', 'board pack', 'pdf', 'export'], category: 'Reports', icon: 'file-text' },
  { label: 'Knowledge Vault', href: '/vault', keywords: ['vault', 'documents', 'knowledge'], category: 'Vault', icon: 'archive' },
  { label: 'Integrations', href: '/integrations', keywords: ['integrations', 'xero', 'connect'], category: 'Settings', icon: 'plug' },
  { label: 'Settings', href: '/settings', keywords: ['settings', 'account', 'preferences'], category: 'Settings', icon: 'settings' },
  { label: 'Team & Roles', href: '/settings/team', keywords: ['team', 'roles', 'members', 'invite'], category: 'Settings', icon: 'users' },
  { label: 'Health Check', href: '/health', keywords: ['health', 'score', 'financial health'], category: 'Health', icon: 'heart' },
  { label: 'Billing', href: '/billing', keywords: ['billing', 'subscription', 'payment'], category: 'Billing', icon: 'credit-card' },
  { label: 'Audit Log', href: '/audit', keywords: ['audit', 'log', 'trail', 'history'], category: 'Admin', icon: 'shield' },
];

/* ------------------------------------------------------------------ */
/*  Query mode detection                                              */
/* ------------------------------------------------------------------ */

const QUERY_TRIGGERS = ['what', 'how', 'show', 'compare', 'why', 'which', 'when', 'where', 'who', 'total', 'sum', 'average', 'count', 'list'];

function isQueryMode(input: string): boolean {
  const lower = input.toLowerCase().trim();
  if (lower.includes('?')) return true;
  if (lower.length > 15) {
    return QUERY_TRIGGERS.some((t) => lower.startsWith(t) || lower.includes(` ${t} `));
  }
  return QUERY_TRIGGERS.some((t) => lower.startsWith(t));
}

/* ------------------------------------------------------------------ */
/*  Recent queries (persisted to localStorage)                        */
/* ------------------------------------------------------------------ */

const RECENT_KEY = 'advisory-os-recent-queries';
const MAX_RECENT = 5;

function getRecentQueries(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

function addRecentQuery(query: string) {
  if (typeof window === 'undefined') return;
  const recent = getRecentQueries().filter((q) => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

/* ------------------------------------------------------------------ */
/*  Query result types                                                */
/* ------------------------------------------------------------------ */

interface QueryResult {
  type: 'chart' | 'table' | 'number' | 'text';
  data: unknown;
  chartType?: 'bar' | 'line' | 'pie';
  title: string;
  summary?: string;
}

/* ------------------------------------------------------------------ */
/*  Command Palette Component                                         */
/* ------------------------------------------------------------------ */

interface CommandPaletteProps {
  orgId?: string;
}

export function CommandPalette({ orgId }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const inQueryMode = useMemo(() => isQueryMode(query), [query]);

  // Load recent queries on mount
  useEffect(() => {
    setRecentQueries(getRecentQueries());
  }, []);

  // Keyboard shortcut: CMD+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setQueryResult(null);
      setQueryError(null);
      setRecentQueries(getRecentQueries());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  // Filter nav results
  const navResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return SEARCH_INDEX
      .map((item) => {
        let score = 0;
        if (item.label.toLowerCase().includes(q)) score += 10;
        for (const kw of item.keywords) {
          if (kw.includes(q)) score += 5;
          if (kw.startsWith(q)) score += 3;
        }
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [query]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIdx(0);
    setQueryResult(null);
    setQueryError(null);
  }, [query]);

  // Execute AI query
  const executeAIQuery = useCallback(async () => {
    if (!query.trim() || !orgId) return;
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      addRecentQuery(query.trim());
      setRecentQueries(getRecentQueries());

      const res = await fetch('/api/command/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), orgId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Query failed');
      }

      const result = await res.json();
      setQueryResult(result as QueryResult);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setQueryLoading(false);
    }
  }, [query, orgId]);

  // Navigate to selected item or execute query
  const handleSelect = useCallback(
    (idx: number) => {
      if (inQueryMode) {
        executeAIQuery();
        return;
      }
      const item = navResults[idx];
      if (item) {
        router.push(item.href);
        setOpen(false);
      }
    },
    [inQueryMode, navResults, executeAIQuery, router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, navResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(selectedIdx);
      }
    },
    [navResults.length, selectedIdx, handleSelect]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette container */}
      <div className="relative w-full max-w-xl bg-background rounded-xl shadow-2xl border overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <svg className="h-5 w-5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, run actions, or ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {inQueryMode && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
              AI Query
            </span>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Query result */}
        {queryLoading && (
          <div className="px-4 py-4 border-b bg-violet-50/50">
            <div className="flex items-center gap-2 text-sm text-violet-600">
              <div className="h-3 w-3 rounded-full bg-violet-400 animate-pulse" />
              Querying your data...
            </div>
          </div>
        )}

        {queryError && (
          <div className="px-4 py-3 border-b bg-red-50/50">
            <p className="text-sm text-red-600">{queryError}</p>
          </div>
        )}

        {queryResult && (
          <div className="px-4 py-3 border-b bg-violet-50/50">
            <div className="flex items-center gap-1.5 text-xs text-violet-500 mb-2 font-medium">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {queryResult.title}
            </div>

            {/* Render by type */}
            {queryResult.type === 'number' && (
              <div className="text-2xl font-bold text-foreground">
                {typeof (queryResult.data as Record<string, unknown>)?.value === 'number'
                  ? formatCurrency((queryResult.data as Record<string, unknown>).value as number)
                  : String((queryResult.data as Record<string, unknown>)?.value ?? '')}
              </div>
            )}

            {queryResult.type === 'text' && (
              <p className="text-sm text-foreground">
                {queryResult.summary ?? queryResult.title}
              </p>
            )}

            {queryResult.type === 'chart' && Array.isArray(queryResult.data) && (
              <div className="flex items-center gap-4">
                <MiniSparkline
                  data={(queryResult.data as Record<string, unknown>[])
                    .map((d) => {
                      const numKeys = Object.keys(d).filter((k) => typeof d[k] === 'number');
                      return Number(d[numKeys[0]] ?? 0);
                    })}
                  width={200}
                  height={40}
                  color="#8b5cf6"
                  showDot
                  showFill
                />
                <span className="text-xs text-muted-foreground">
                  {(queryResult.data as unknown[]).length} data points
                </span>
              </div>
            )}

            {queryResult.type === 'table' && Array.isArray(queryResult.data) && (
              <div className="max-h-[120px] overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <tbody>
                    {(queryResult.data as Record<string, unknown>[]).slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-violet-100 last:border-0">
                        {Object.values(row).slice(0, 4).map((val, j) => (
                          <td key={j} className="py-1 pr-3 text-foreground">
                            {typeof val === 'number' ? val.toLocaleString() : String(val ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(queryResult.data as unknown[]).length > 5 && (
                  <p className="text-muted-foreground mt-1">
                    +{(queryResult.data as unknown[]).length - 5} more rows
                  </p>
                )}
              </div>
            )}

            {queryResult.summary && queryResult.type !== 'text' && (
              <p className="text-xs text-muted-foreground mt-1">{queryResult.summary}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  router.push(`/graphs/builder`);
                  setOpen(false);
                }}
                className="text-[10px] font-medium px-2 py-1 rounded bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
              >
                Open in full page
              </button>
            </div>
          </div>
        )}

        {/* Navigation results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {/* Show recent queries when input is empty */}
          {!query.trim() && recentQueries.length > 0 && (
            <>
              <div className="px-4 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Recent queries
              </div>
              {recentQueries.map((rq, i) => (
                <button
                  key={`recent-${i}`}
                  onClick={() => { setQuery(rq); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted transition-colors"
                >
                  <svg className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-foreground truncate">{rq}</span>
                </button>
              ))}
              <div className="border-b my-1" />
            </>
          )}

          {/* Navigation results */}
          {navResults.length > 0 && (
            <>
              {!query.trim() ? null : (
                <div className="px-4 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Pages
                </div>
              )}
              {navResults.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors',
                    i === selectedIdx ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {item.category}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Query mode hint */}
          {inQueryMode && !queryResult && !queryLoading && (
            <div className="px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                Press <kbd className="rounded border px-1 py-0.5 text-xs font-medium">Enter</kbd> to query your data with AI
              </p>
            </div>
          )}

          {/* Empty state */}
          {query.trim() && navResults.length === 0 && !inQueryMode && !queryResult && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No pages found. Try asking a question instead.
            </div>
          )}

          {/* Default items when no query */}
          {!query.trim() && recentQueries.length === 0 && (
            <>
              <div className="px-4 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Quick links
              </div>
              {SEARCH_INDEX.slice(0, 6).map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {item.category}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1 py-0.5 font-medium">&#x2191;&#x2193;</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1 py-0.5 font-medium">&#x21B5;</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1 py-0.5 font-medium">esc</kbd> close
          </span>
          <span className="ml-auto">Powered by Advisory OS AI</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Trigger button for the command palette.
 * Displays "Search or ask... CMD+K" in the header.
 */
export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
        );
      }}
      className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="hidden sm:inline">Search or ask...</span>
      <kbd className="hidden sm:inline-flex items-center rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">
        &#x2318;K
      </kbd>
    </button>
  );
}
