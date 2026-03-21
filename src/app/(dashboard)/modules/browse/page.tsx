'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type BrowseModule = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  categorySlug: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  credits: number;
  monthlyPrice: number | null;
  rating: number;
  installs: number;
};

const CATEGORIES = [
  { slug: 'all', label: 'All', count: 16 },
  { slug: 'financial-analysis', label: 'Financial Analysis', count: 5 },
  { slug: 'forecasting-planning', label: 'Forecasting & Planning', count: 4 },
  { slug: 'compliance-governance', label: 'Compliance & Governance', count: 3 },
  { slug: 'growth-strategy', label: 'Growth & Strategy', count: 2 },
  { slug: 'industry-packs', label: 'Industry Packs', count: 2 },
];

const BROWSE_MODULES: BrowseModule[] = [
  { id: 'mod-health-check', name: 'Financial Health Check', slug: 'health-check', description: 'Traffic light scoring across profitability, liquidity, efficiency and growth.', category: 'Financial Analysis', categorySlug: 'financial-analysis', tier: 'free', credits: 0, monthlyPrice: null, rating: 4.8, installs: 1247 },
  { id: 'mod-cash-forecaster', name: 'Cash Flow Forecaster', slug: 'cash-forecaster', description: '13-week rolling cash flow projection with burn rate and runway calculator.', category: 'Financial Analysis', categorySlug: 'financial-analysis', tier: 'starter', credits: 5, monthlyPrice: 29, rating: 4.7, installs: 983 },
  { id: 'mod-investment-readiness', name: 'Investment Readiness', slug: 'investment-readiness', description: 'Scored assessment evaluating readiness for investment.', category: 'Financial Analysis', categorySlug: 'financial-analysis', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.6, installs: 542 },
  { id: 'mod-pricing-analyser', name: 'Pricing & Margin Analyser', slug: 'pricing-analyser', description: 'Margin profiles, what-if modelling and break-even analysis.', category: 'Financial Analysis', categorySlug: 'financial-analysis', tier: 'starter', credits: 5, monthlyPrice: 29, rating: 4.5, installs: 728 },
  { id: 'mod-revenue-recognition', name: 'Revenue Recognition Engine', slug: 'revenue-recognition', description: 'Automate revenue recognition with IFRS 15 / ASC 606 compliance.', category: 'Financial Analysis', categorySlug: 'financial-analysis', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.4, installs: 312 },
  { id: 'mod-three-way-forecasting', name: 'Three-Way Forecasting', slug: 'three-way-forecasting', description: 'Integrated P&L, balance sheet and cash flow forecasting.', category: 'Forecasting & Planning', categorySlug: 'forecasting-planning', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.9, installs: 864 },
  { id: 'mod-workforce-planning', name: 'Workforce Planning', slug: 'workforce-planning', description: 'Model headcount scenarios and forecast payroll costs.', category: 'Forecasting & Planning', categorySlug: 'forecasting-planning', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.5, installs: 456 },
  { id: 'mod-budget-builder', name: 'Budget Builder', slug: 'budget-builder', description: 'Departmental budgets with approval workflows and variance alerts.', category: 'Forecasting & Planning', categorySlug: 'forecasting-planning', tier: 'starter', credits: 5, monthlyPrice: 29, rating: 4.6, installs: 691 },
  { id: 'mod-scenario-modelling-pro', name: 'Scenario Modelling Pro', slug: 'scenario-modelling-pro', description: 'Monte Carlo simulation with sensitivity analysis.', category: 'Forecasting & Planning', categorySlug: 'forecasting-planning', tier: 'enterprise', credits: 15, monthlyPrice: 79, rating: 4.8, installs: 287 },
  { id: 'mod-tax-planning', name: 'Tax Planning Assistant', slug: 'tax-planning', description: 'AI-powered corporation tax estimator with R&D credit identification.', category: 'Compliance & Governance', categorySlug: 'compliance-governance', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.7, installs: 523 },
  { id: 'mod-audit-trail', name: 'Audit Trail Pro', slug: 'audit-trail', description: 'Comprehensive audit logging with tamper-proof records.', category: 'Compliance & Governance', categorySlug: 'compliance-governance', tier: 'starter', credits: 5, monthlyPrice: 29, rating: 4.3, installs: 398 },
  { id: 'mod-regulatory-compliance', name: 'Regulatory Compliance', slug: 'regulatory-compliance', description: 'Automated compliance checks and filing reminders.', category: 'Compliance & Governance', categorySlug: 'compliance-governance', tier: 'enterprise', credits: 15, monthlyPrice: 79, rating: 4.6, installs: 215 },
  { id: 'mod-fundraising-toolkit', name: 'Fundraising Toolkit', slug: 'fundraising-toolkit', description: 'Investor deck builder, data room organiser and valuation benchmarking.', category: 'Growth & Strategy', categorySlug: 'growth-strategy', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.8, installs: 376 },
  { id: 'mod-ma-due-diligence', name: 'M&A Due Diligence', slug: 'ma-due-diligence', description: 'Structured due diligence workspace for mergers and acquisitions.', category: 'Growth & Strategy', categorySlug: 'growth-strategy', tier: 'enterprise', credits: 20, monthlyPrice: 149, rating: 4.9, installs: 94 },
  { id: 'mod-ecommerce-analytics', name: 'E-Commerce Analytics', slug: 'ecommerce-analytics', description: 'Unit economics, channel profitability and inventory forecasting.', category: 'Industry Packs', categorySlug: 'industry-packs', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.5, installs: 432 },
  { id: 'mod-saas-metrics', name: 'SaaS Metrics Suite', slug: 'saas-metrics', description: 'MRR, ARR, churn, LTV, CAC with investor-grade dashboards.', category: 'Industry Packs', categorySlug: 'industry-packs', tier: 'professional', credits: 10, monthlyPrice: 49, rating: 4.7, installs: 567 },
];

const TIER_CONFIG = {
  free: { label: 'Free', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  starter: { label: 'Starter', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  professional: { label: 'Pro', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  enterprise: { label: 'Enterprise', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
};

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Alphabetical' },
];

export default function BrowsePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState('popular');
  const [search, setSearch] = useState('');

  const filtered = BROWSE_MODULES
    .filter((m) => selectedCategory === 'all' || m.categorySlug === selectedCategory)
    .filter((m) => selectedTier === 'all' || m.tier === selectedTier)
    .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular': return b.installs - a.installs;
        case 'rating': return b.rating - a.rating;
        case 'price-asc': return a.credits - b.credits;
        case 'price-desc': return b.credits - a.credits;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/modules" className="hover:text-foreground">Marketplace</Link>
        <span>/</span>
        <span className="text-foreground">Browse</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Browse Modules</h1>
        <p className="text-muted-foreground">Explore all {BROWSE_MODULES.length} modules by category, tier, or search.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Filters */}
        <aside className="w-full shrink-0 space-y-6 lg:w-64">
          {/* Search */}
          <div>
            <label htmlFor="module-search" className="mb-1.5 block text-sm font-medium">Search</label>
            <input
              id="module-search"
              type="text"
              placeholder="Search modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Categories */}
          <div>
            <p className="mb-2 text-sm font-medium">Category</p>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                    selectedCategory === cat.slug
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span>{cat.label}</span>
                  <span className="text-xs">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tier Filter */}
          <div>
            <p className="mb-2 text-sm font-medium">Tier</p>
            <div className="space-y-1">
              {[{ value: 'all', label: 'All Tiers' }, { value: 'free', label: 'Free' }, { value: 'starter', label: 'Starter' }, { value: 'professional', label: 'Professional' }, { value: 'enterprise', label: 'Enterprise' }].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedTier(t.value)}
                  className={cn(
                    'flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors',
                    selectedTier === t.value
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 space-y-4">
          {/* Sort bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filtered.length} modules</p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Module grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((mod) => {
              const tierCfg = TIER_CONFIG[mod.tier];
              return (
                <div key={mod.id} className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{mod.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{mod.category}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', tierCfg.bg, tierCfg.color)}>
                      {tierCfg.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{mod.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5 fill-amber-400" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {mod.rating}
                      </span>
                      <span>{mod.installs.toLocaleString()} installs</span>
                    </div>
                    <div className="text-sm font-semibold">
                      {mod.credits === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Free</span>
                      ) : (
                        <span>{mod.credits} credits/mo</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href="/modules"
                      className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">No modules match your filters.</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSelectedTier('all'); setSearch(''); }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
