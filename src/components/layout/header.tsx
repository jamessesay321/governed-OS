'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from './notification-bell';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Search index — every page/feature mapped to searchable terms      */
/* ------------------------------------------------------------------ */

interface SearchItem {
  label: string;
  href: string;
  keywords: string[];
  category: string;
}

const SEARCH_INDEX: SearchItem[] = [
  // Home
  { label: 'Home Overview', href: '/home', keywords: ['home', 'overview', 'start', 'welcome', 'command centre'], category: 'Home' },
  { label: 'Getting Started', href: '/home/getting-started', keywords: ['getting started', 'setup', 'onboarding', 'guide', 'tutorial'], category: 'Home' },
  { label: 'Recent Activity', href: '/home/activity', keywords: ['activity', 'recent', 'history', 'feed'], category: 'Home' },

  // Dashboard
  { label: 'Dashboard', href: '/dashboard', keywords: ['dashboard', 'overview', 'summary', 'ceo', 'snapshot', 'kpi cards'], category: 'Dashboard' },
  { label: 'Dashboard Widgets', href: '/dashboard/widgets', keywords: ['widgets', 'customise', 'dashboard', 'layout', 'cards'], category: 'Dashboard' },
  { label: 'Alerts & Notifications', href: '/dashboard/alerts', keywords: ['alerts', 'notifications', 'threshold', 'warnings'], category: 'Dashboard' },

  // Financials
  { label: 'Financials Summary', href: '/financials', keywords: ['financials', 'financial', 'accounts', 'data', 'transactions'], category: 'Financials' },
  { label: 'Income Statement (P&L)', href: '/financials/income-statement', keywords: ['income statement', 'p&l', 'profit and loss', 'revenue', 'expenses', 'net profit', 'ebitda'], category: 'Financials' },
  { label: 'Balance Sheet', href: '/financials/balance-sheet', keywords: ['balance sheet', 'assets', 'liabilities', 'equity', 'net assets', 'current ratio'], category: 'Financials' },
  { label: 'Cash Flow Statement', href: '/financials/cash-flow', keywords: ['cash flow', 'cash', 'operating', 'investing', 'financing', 'runway', 'burn rate'], category: 'Financials' },
  { label: 'Budget vs Actual', href: '/financials/budget', keywords: ['budget', 'actual', 'budget vs actual', 'variance', 'over budget', 'under budget'], category: 'Financials' },

  // KPIs
  { label: 'KPI Dashboard', href: '/kpi', keywords: ['kpi', 'key performance', 'metrics', 'indicators', 'performance'], category: 'KPIs' },
  { label: 'KPI Targets', href: '/kpi/targets', keywords: ['targets', 'goals', 'benchmarks', 'kpi targets'], category: 'KPIs' },
  { label: 'Custom KPIs', href: '/kpi/custom', keywords: ['custom kpi', 'create kpi', 'formula', 'custom metrics'], category: 'KPIs' },

  // Variance
  { label: 'Variance Analysis', href: '/variance', keywords: ['variance', 'comparison', 'period', 'difference', 'change'], category: 'Variance' },
  { label: 'Budget vs Actual Variance', href: '/variance/budget', keywords: ['budget variance', 'budget vs actual', 'over under'], category: 'Variance' },
  { label: 'Variance Drill-Down', href: '/variance/drill-down', keywords: ['drill down', 'detail', 'breakdown', 'account level'], category: 'Variance' },

  // Graph Studio
  { label: 'Graph Studio Gallery', href: '/graphs', keywords: ['graphs', 'charts', 'visualise', 'visualisation', 'graph studio', 'gallery'], category: 'Graph Studio' },
  { label: 'Graph Builder', href: '/graphs/builder', keywords: ['build graph', 'create chart', 'graph builder', 'bar chart', 'pie chart', 'waterfall', 'line chart'], category: 'Graph Studio' },
  { label: 'Saved Charts', href: '/graphs/saved', keywords: ['saved charts', 'favourites', 'my charts'], category: 'Graph Studio' },

  // Intelligence
  { label: 'AI Insights', href: '/intelligence', keywords: ['intelligence', 'insights', 'ai', 'analysis', 'recommendations', 'explain'], category: 'Intelligence' },
  { label: 'Anomaly Detection', href: '/intelligence/anomalies', keywords: ['anomaly', 'anomalies', 'unusual', 'outlier', 'spike', 'duplicate'], category: 'Intelligence' },
  { label: 'Trend Analysis', href: '/intelligence/trends', keywords: ['trends', 'trending', 'growth', 'decline', 'pattern'], category: 'Intelligence' },

  // Financial Health
  { label: 'Health Score', href: '/health', keywords: ['health', 'health score', 'financial health', 'health check', 'score', 'rating'], category: 'Financial Health' },
  { label: 'Industry Benchmarks', href: '/health/benchmarks', keywords: ['benchmarks', 'industry', 'compare', 'comparison', 'average', 'peer'], category: 'Financial Health' },
  { label: 'Recommendations', href: '/health/recommendations', keywords: ['recommendations', 'actions', 'improve', 'suggestions'], category: 'Financial Health' },

  // Scenarios
  { label: 'Scenario Builder', href: '/scenarios', keywords: ['scenarios', 'what if', 'forecast', 'projection', 'model', 'planning'], category: 'Scenarios' },
  { label: 'Goalseek', href: '/scenarios/goalseek', keywords: ['goalseek', 'goal seek', 'target', 'reverse', 'what do i need', 'break even', 'margin target'], category: 'Scenarios' },
  { label: 'Compare Scenarios', href: '/scenarios/compare', keywords: ['compare', 'comparison', 'scenarios compare', 'side by side'], category: 'Scenarios' },

  // Playbook
  { label: 'Playbook Actions', href: '/playbook', keywords: ['playbook', 'actions', 'todo', 'priorities', 'action plan'], category: 'Playbook' },
  { label: 'Run Assessment', href: '/playbook/assessment', keywords: ['assessment', 'run assessment', 'analyse', 'evaluate'], category: 'Playbook' },
  { label: 'Assessment History', href: '/playbook/history', keywords: ['history', 'past assessments', 'previous'], category: 'Playbook' },

  // Reports
  { label: 'Board Packs & Reports', href: '/reports', keywords: ['reports', 'board pack', 'board', 'pdf', 'export', 'generate report'], category: 'Reports' },
  { label: 'Create Report', href: '/reports/new', keywords: ['create report', 'new report', 'custom report', 'build report'], category: 'Reports' },
  { label: 'Report Templates', href: '/reports/templates', keywords: ['templates', 'report template', 'monthly', 'investor update', 'management'], category: 'Reports' },

  // Knowledge Vault
  { label: 'Knowledge Vault', href: '/vault', keywords: ['vault', 'knowledge', 'documents', 'library', 'archive'], category: 'Knowledge Vault' },
  { label: 'Guides & Resources', href: '/vault/guides', keywords: ['guides', 'resources', 'learn', 'education', 'help', 'how to'], category: 'Knowledge Vault' },
  { label: 'AI Outputs Archive', href: '/vault/ai-outputs', keywords: ['ai outputs', 'generated', 'ai archive', 'provenance'], category: 'Knowledge Vault' },

  // Business Profile
  { label: 'Business Profile', href: '/interview', keywords: ['business profile', 'company info', 'profile', 'about', 'company name', 'industry'], category: 'Business Profile' },
  { label: 'Team Info', href: '/interview/team', keywords: ['team', 'people', 'employees', 'staff'], category: 'Business Profile' },
  { label: 'Upload Documents', href: '/interview/documents', keywords: ['upload', 'documents', 'files', 'import'], category: 'Business Profile' },

  // Integrations
  { label: 'Integrations', href: '/integrations', keywords: ['integrations', 'connect', 'xero', 'quickbooks', 'salesforce', 'hubspot', 'stripe'], category: 'Integrations' },
  { label: 'Integration Catalogue', href: '/integrations/catalogue', keywords: ['catalogue', 'marketplace', 'apps', 'plugins', 'available'], category: 'Integrations' },
  { label: 'Data Health', href: '/integrations/health', keywords: ['data health', 'sync status', 'freshness', 'quality'], category: 'Integrations' },

  // Settings
  { label: 'Account Settings', href: '/settings', keywords: ['settings', 'account', 'preferences', 'profile settings'], category: 'Settings' },
  { label: 'Team & Roles', href: '/settings/team', keywords: ['team settings', 'roles', 'permissions', 'invite', 'members'], category: 'Settings' },
  { label: 'Modules', href: '/settings/modules', keywords: ['modules', 'features', 'enable', 'disable', 'activate', 'tax', 'debt'], category: 'Settings' },
  { label: 'Audit Log', href: '/audit', keywords: ['audit', 'log', 'trail', 'history', 'who did what', 'governance'], category: 'Admin' },

  // Billing & Marketplace
  { label: 'Billing Overview', href: '/billing', keywords: ['billing', 'subscription', 'payment', 'invoice', 'cost', 'spend', 'charges'], category: 'Billing' },
  { label: 'Pricing & Bundles', href: '/billing/pricing', keywords: ['pricing', 'plans', 'bundles', 'packages', 'how much', 'investment', 'estimate'], category: 'Billing' },
  { label: 'Advisory Network', href: '/billing/referrals', keywords: ['referral', 'referrals', 'invite', 'advisory network', 'credits', 'refer a friend'], category: 'Billing' },

  // Preferences & Support
  { label: 'Language & Preferences', href: '/settings/preferences', keywords: ['language', 'preferences', 'date format', 'timezone', 'locale', 'regional', 'notifications', 'number format'], category: 'Settings' },
  { label: 'Data Exports', href: '/settings/exports', keywords: ['export', 'download', 'csv', 'pdf', 'excel', 'data export', 'api', 'api key'], category: 'Settings' },
  { label: 'Help & Support', href: '/help', keywords: ['help', 'support', 'faq', 'contact', 'chat', 'documentation', 'guide', 'how to', 'troubleshoot'], category: 'Help' },

  // Common natural language queries
  { label: 'Check my revenue', href: '/financials/income-statement', keywords: ['revenue', 'sales', 'top line', 'how much revenue', 'check revenue', 'my revenue', 'what is my revenue', 'show revenue'], category: 'Quick Answer' },
  { label: 'See my cash position', href: '/financials/cash-flow', keywords: ['cash position', 'how much cash', 'bank balance', 'cash runway', 'am i running out', 'cash flow', 'how much money', 'running out of cash'], category: 'Quick Answer' },
  { label: 'Check top sales', href: '/graphs/builder', keywords: ['top sales', 'top clients', 'best customers', 'biggest deals', 'top 10'], category: 'Quick Answer' },
  { label: 'Am I profitable?', href: '/kpi', keywords: ['profitable', 'profitability', 'making money', 'net profit', 'am i profitable', 'margin', 'break even', 'gross margin'], category: 'Quick Answer' },
  { label: 'What should I focus on?', href: '/playbook', keywords: ['focus', 'priorities', 'what should i do', 'next steps', 'action items', 'advice', 'recommend', 'suggestions'], category: 'Quick Answer' },
  { label: 'Build a graph', href: '/graphs/builder', keywords: ['build graph', 'make chart', 'create visualisation', 'show me a chart', 'draw', 'visualise', 'bar chart', 'pie chart'], category: 'Quick Answer' },
  { label: 'Run a scenario', href: '/scenarios', keywords: ['run scenario', 'what if', 'what happens if', 'simulate', 'forecast', 'project', 'plan ahead', 'model'], category: 'Quick Answer' },
  { label: 'Generate a report', href: '/reports/new', keywords: ['generate report', 'make report', 'create board pack', 'export', 'pdf', 'board report', 'investor update'], category: 'Quick Answer' },
  { label: 'How is my business doing?', href: '/health', keywords: ['how is my business', 'business health', 'health check', 'overall', 'performance', 'how are we doing', 'business performance'], category: 'Quick Answer' },
  { label: 'What are my biggest expenses?', href: '/financials/income-statement', keywords: ['biggest expenses', 'highest costs', 'where is money going', 'spending', 'cost breakdown', 'reduce costs'], category: 'Quick Answer' },
  { label: 'Do I have any overdue invoices?', href: '/intelligence/anomalies', keywords: ['overdue', 'overdue invoices', 'late payments', 'outstanding', 'unpaid', 'accounts receivable', 'who owes me'], category: 'Quick Answer' },
  { label: 'How much debt do I have?', href: '/billing', keywords: ['debt', 'loans', 'borrowing', 'how much debt', 'liabilities', 'owe', 'credit', 'financing'], category: 'Quick Answer' },
  { label: 'What are my KPIs?', href: '/kpi', keywords: ['what are my kpis', 'key metrics', 'performance indicators', 'tracking', 'metrics dashboard'], category: 'Quick Answer' },
  { label: 'Can I afford to hire?', href: '/scenarios', keywords: ['can i afford', 'hire', 'new employee', 'headcount', 'salary', 'can i afford to hire', 'staffing'], category: 'Quick Answer' },
  { label: 'Show my agent activity', href: '/agents', keywords: ['agent activity', 'what did agents do', 'ai agents', 'agent tasks', 'timesheet', 'agent work'], category: 'Quick Answer' },
  { label: 'Change currency', href: '/settings/preferences', keywords: ['change currency', 'switch currency', 'usd', 'gbp', 'eur', 'currency setting'], category: 'Quick Answer' },
  { label: 'Change language', href: '/settings/preferences', keywords: ['change language', 'switch language', 'french', 'spanish', 'german', 'translate', 'language setting'], category: 'Quick Answer' },
];

/* ------------------------------------------------------------------ */
/*  Header Component                                                  */
/* ------------------------------------------------------------------ */

interface HeaderProps {
  displayName: string;
  orgName: string;
  role: string;
}

export function Header({ displayName, orgName, role }: HeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const scored = SEARCH_INDEX.map((item) => {
      let score = 0;
      // Label match (highest)
      if (item.label.toLowerCase().includes(q)) score += 10;
      // Keyword match
      for (const kw of item.keywords) {
        if (kw.includes(q)) score += 5;
        if (kw.startsWith(q)) score += 3;
      }
      return { ...item, score };
    })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return scored;
  }, [query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [results]);

  // Keyboard shortcut: Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      router.push(results[selectedIdx].href);
      setQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (href: string) => {
    router.push(href);
    setQuery('');
    setIsOpen(false);
  };

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="text-sm text-muted-foreground">
        {orgName} &middot; <span className="capitalize">{role}</span>
      </div>

      {/* Global Search */}
      <div className="relative flex-1 max-w-md mx-6" ref={dropdownRef}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search anything... (⌘K)"
            className="w-full rounded-lg border border-border bg-muted/50 pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background outline-none transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block text-[10px] font-medium text-muted-foreground bg-muted border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>

        {/* Search Results Dropdown */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden">
            {results.map((item, idx) => (
              <button
                key={item.href + item.label}
                onClick={() => handleSelect(item.href)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors',
                  idx === selectedIdx
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {isOpen && query.trim() && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 p-4 text-center">
            <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
            <p className="text-xs text-muted-foreground mt-1">Try searching for a feature, page, or ask a question</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <CurrencySelector />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="font-medium">
              {displayName}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Floating Action Button for quick actions                   */
/* ------------------------------------------------------------------ */

const MOBILE_ACTIONS = [
  { label: 'View P&L', href: '/financials', icon: '📊' },
  { label: 'Check KPIs', href: '/kpi', icon: '🎯' },
  { label: 'Run Scenario', href: '/scenarios', icon: '📈' },
  { label: 'Generate Report', href: '/reports', icon: '📄' },
  { label: 'Ask AI', href: '/intelligence', icon: '✨' },
];

export function MobileQuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 sm:hidden">
      {/* Action sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-16 right-0 w-48 rounded-xl border bg-card shadow-lg z-40 overflow-hidden mb-2">
            {MOBILE_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-base">{action.icon}</span>
                {action.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95',
          open && 'rotate-45'
        )}
        aria-label="Quick actions"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
}
