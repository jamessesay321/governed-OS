/**
 * Vault Starter Content — pre-loaded guides for new organisations.
 * These provide immediate value before users upload their own documents.
 */

export type VaultGuide = {
  title: string;
  type: 'guide' | 'template' | 'checklist';
  contentSummary: string;
  tags: string[];
};

export const VAULT_STARTER_GUIDES: VaultGuide[] = [
  {
    title: 'Understanding Your Financial Statements',
    type: 'guide',
    contentSummary:
      'A plain-English walkthrough of the three core financial statements: Profit & Loss, Balance Sheet, and Cash Flow. Covers what each line means, how they connect, and the five numbers every SME owner should check monthly.',
    tags: ['fundamentals', 'p&l', 'balance-sheet', 'cash-flow'],
  },
  {
    title: 'KPI Guide for SME Owners',
    type: 'guide',
    contentSummary:
      'Explains the most important financial and operational KPIs for small and medium businesses. Includes benchmarks by industry, how to set realistic targets, and a recommended monthly review cadence.',
    tags: ['kpi', 'benchmarks', 'targets', 'performance'],
  },
  {
    title: 'How to Read a Variance Report',
    type: 'guide',
    contentSummary:
      'Breaks down budget-vs-actual variance analysis into actionable steps. Covers favourable and adverse variances, materiality thresholds, and how to investigate the root cause of significant deviations.',
    tags: ['variance', 'budget', 'analysis', 'reporting'],
  },
  {
    title: 'Board Pack Best Practices',
    type: 'template',
    contentSummary:
      'A recommended structure for monthly board packs including financial summary, KPI dashboard, cash position, risk register, and strategic updates. Includes tips on presentation and common pitfalls to avoid.',
    tags: ['board-pack', 'governance', 'reporting', 'template'],
  },
  {
    title: 'Cash Flow Forecasting 101',
    type: 'guide',
    contentSummary:
      'Step-by-step guide to building a 13-week rolling cash flow forecast. Covers direct vs indirect methods, scenario planning for best/worst case, and early warning signs of cash pressure.',
    tags: ['cash-flow', 'forecasting', 'planning', 'liquidity'],
  },
];
