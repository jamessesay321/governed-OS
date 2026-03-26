'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  type: 'navigation' | 'data' | 'action' | 'ai';
  label: string;
  description?: string;
  href?: string;
  icon?: string;
  value?: string;
}

const NAV_ITEMS: SearchResult[] = [
  { type: 'navigation', label: 'Dashboard', description: 'Financial overview', href: '/dashboard', icon: '📊' },
  { type: 'navigation', label: 'Financials', description: 'P&L, balance sheet, cash flow', href: '/financials', icon: '💰' },
  { type: 'navigation', label: 'Income Statement', description: 'Profit & loss detail', href: '/financials/income-statement', icon: '📈' },
  { type: 'navigation', label: 'Balance Sheet', description: 'Assets, liabilities, equity', href: '/financials/balance-sheet', icon: '⚖️' },
  { type: 'navigation', label: 'Cash Flow', description: 'Cash flow statement', href: '/financials/cash-flow', icon: '💵' },
  { type: 'navigation', label: 'Budget', description: 'Budget vs actual', href: '/financials/budget', icon: '🎯' },
  { type: 'navigation', label: 'KPI Dashboard', description: 'Key performance indicators', href: '/kpi', icon: '📉' },
  { type: 'navigation', label: 'KPI Targets', description: 'Set and track targets', href: '/kpi/targets', icon: '🎯' },
  { type: 'navigation', label: 'Scenarios', description: 'Financial scenario modelling', href: '/scenarios', icon: '🔮' },
  { type: 'navigation', label: 'Goal Seek', description: 'Reverse-engineer targets', href: '/scenarios/goalseek', icon: '🎯' },
  { type: 'navigation', label: 'Compare Scenarios', description: 'Side-by-side comparison', href: '/scenarios/compare', icon: '⚡' },
  { type: 'navigation', label: 'Variance Analysis', description: 'Budget vs actual variance', href: '/variance', icon: '📊' },
  { type: 'navigation', label: 'Playbook', description: 'Financial governance actions', href: '/playbook', icon: '📋' },
  { type: 'navigation', label: 'Reports', description: 'Generate financial reports', href: '/reports', icon: '📄' },
  { type: 'navigation', label: 'AI Intelligence', description: 'AI-powered insights', href: '/intelligence', icon: '🤖' },
  { type: 'navigation', label: 'Graphs', description: 'Chart builder', href: '/graphs', icon: '📈' },
  { type: 'navigation', label: 'Vault', description: 'Document storage', href: '/vault', icon: '🔒' },
  { type: 'navigation', label: 'Integrations', description: 'Connect Xero and more', href: '/integrations', icon: '🔗' },
  { type: 'navigation', label: 'Settings', description: 'Account settings', href: '/settings', icon: '⚙️' },
  { type: 'navigation', label: 'Team', description: 'Team management', href: '/settings/team', icon: '👥' },
  { type: 'navigation', label: 'Billing', description: 'Subscription and billing', href: '/billing', icon: '💳' },
  { type: 'navigation', label: 'Audit Log', description: 'Activity audit trail', href: '/audit', icon: '📝' },
  { type: 'navigation', label: 'Health Check', description: 'Financial health score', href: '/health', icon: '❤️' },
  { type: 'navigation', label: 'Governance', description: 'Governance framework', href: '/governance', icon: '🏛️' },
];

const QUICK_ACTIONS: SearchResult[] = [
  { type: 'action', label: 'Generate Report', description: 'Create a new financial report', href: '/reports/new', icon: '📄' },
  { type: 'action', label: 'New Scenario', description: 'Model a what-if scenario', href: '/scenarios', icon: '🔮' },
  { type: 'action', label: 'Connect Xero', description: 'Link your accounting data', href: '/integrations', icon: '🔗' },
  { type: 'action', label: 'Run Health Check', description: 'Assess financial health', href: '/health', icon: '❤️' },
  { type: 'action', label: 'View Anomalies', description: 'Check AI-detected anomalies', href: '/intelligence/anomalies', icon: '⚠️' },
];

const AI_QUERIES: SearchResult[] = [
  { type: 'ai', label: 'What was our revenue last month?', description: 'AI will answer from your data', icon: '✨' },
  { type: 'ai', label: 'Why did margins change?', description: 'AI analysis of margin trends', icon: '✨' },
  { type: 'ai', label: 'What is our cash runway?', description: 'AI calculates from your data', icon: '✨' },
  { type: 'ai', label: 'Show top expenses this quarter', description: 'AI breakdown of costs', icon: '✨' },
  { type: 'ai', label: 'How are we tracking against budget?', description: 'AI variance summary', icon: '✨' },
];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  // Simple fuzzy: check if all chars appear in order
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setAiResponse(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build filtered results
  const getResults = useCallback((): SearchResult[] => {
    if (!query.trim()) {
      return [
        ...QUICK_ACTIONS.slice(0, 3),
        ...NAV_ITEMS.slice(0, 5),
      ];
    }

    const q = query.trim();
    const navMatches = NAV_ITEMS.filter(
      (item) => fuzzyMatch(item.label, q) || fuzzyMatch(item.description || '', q)
    );
    const actionMatches = QUICK_ACTIONS.filter(
      (item) => fuzzyMatch(item.label, q) || fuzzyMatch(item.description || '', q)
    );

    const results = [...actionMatches, ...navMatches].slice(0, 8);

    // If query looks like a question, add AI suggestion
    if (q.length > 10 || q.includes('?') || q.startsWith('what') || q.startsWith('why') || q.startsWith('how') || q.startsWith('show')) {
      results.push({
        type: 'ai',
        label: `Ask AI: "${q}"`,
        description: 'Get an intelligent answer from your data',
        icon: '✨',
      });
    }

    // If no results, show AI suggestions
    if (results.length === 0) {
      return AI_QUERIES.slice(0, 3);
    }

    return results;
  }, [query]);

  const results = getResults();

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  async function handleSelect(result: SearchResult) {
    if (result.type === 'ai') {
      setAiLoading(true);
      setAiResponse(null);
      try {
        const res = await fetch('/api/intelligence/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: result.label.replace('Ask AI: "', '').replace('"', '') }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiResponse(data.answer || data.response || 'No answer available');
        } else {
          setAiResponse('AI analysis is available in the Intelligence section');
        }
      } catch {
        setAiResponse('Head to AI Intelligence for detailed analysis');
      } finally {
        setAiLoading(false);
      }
    } else if (result.href) {
      setOpen(false);
      router.push(result.href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <svg className="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, run actions, or ask AI anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            ESC
          </kbd>
        </div>

        {/* AI Response */}
        {(aiLoading || aiResponse) && (
          <div className="px-4 py-3 border-b border-slate-100 bg-violet-50">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-sm text-violet-600">
                <div className="h-3 w-3 rounded-full bg-violet-400 animate-pulse" />
                Thinking...
              </div>
            ) : (
              <div className="text-sm text-violet-900">
                <div className="flex items-center gap-1.5 text-xs text-violet-500 mb-1 font-medium">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI Answer
                </div>
                {aiResponse}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No results found. Try a different search.
            </div>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.label}-${i}`}
                onClick={() => handleSelect(result)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-base flex-shrink-0 w-6 text-center">{result.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{result.label}</div>
                  {result.description && (
                    <div className="text-xs text-slate-400 truncate">{result.description}</div>
                  )}
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  result.type === 'navigation' ? 'bg-slate-100 text-slate-500' :
                  result.type === 'action' ? 'bg-amber-50 text-amber-600' :
                  'bg-violet-50 text-violet-600'
                }`}>
                  {result.type === 'navigation' ? 'Go to' :
                   result.type === 'action' ? 'Action' : 'AI'}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-medium">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-medium">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-medium">esc</kbd> close
          </span>
          <span className="ml-auto flex items-center gap-1">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Powered by Grove AI
          </span>
        </div>
      </div>
    </div>
  );
}

/** Small trigger button to put in the top nav */
export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="hidden sm:inline">Search or ask AI...</span>
      <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium">
        ⌘K
      </kbd>
    </button>
  );
}
