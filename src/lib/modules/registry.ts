import type { ModuleDefinition } from '@/types/playbook';

// === Module Definitions:16 modules across 5 categories ===

const MODULES: ModuleDefinition[] = [
  // ─── Financial Analysis (5) ─────────────────────────────────
  {
    id: 'mod-health-check',
    slug: 'health-check',
    name: 'Financial Health Check',
    description:
      'Auto-generated financial health assessment with traffic light scoring across profitability, liquidity, efficiency, and growth:benchmarked against sector averages.',
    category: 'financial-analysis',
    icon: 'HeartPulse',
    features: [
      'Traffic light scoring across 4 categories',
      'Sector benchmark comparison',
      'AI narrative summary',
      'Top 3 recommended actions',
      'Exportable one-page summary',
    ],
    isActive: false,
    tier: 'free',
    credits: 0,
    monthlyPrice: null,
  },
  {
    id: 'mod-cash-forecaster',
    slug: 'cash-forecaster',
    name: 'Cash Flow Forecaster',
    description:
      '13-week rolling cash flow projection with burn rate tracking, runway calculator, and configurable alert thresholds.',
    category: 'financial-analysis',
    icon: 'TrendingUp',
    features: [
      '13-week rolling projection',
      'Cash runway calculator',
      'Burn rate indicator',
      'Alert threshold configuration',
      'AR/AP pattern analysis',
    ],
    isActive: false,
    tier: 'starter',
    credits: 5,
    monthlyPrice: 29,
  },
  {
    id: 'mod-investment-readiness',
    slug: 'investment-readiness',
    name: 'Investment Readiness',
    description:
      'Scored assessment evaluating your readiness for investment across financial health, data quality, growth metrics, and governance.',
    category: 'financial-analysis',
    icon: 'Target',
    features: [
      'Scored assessment (0-100)',
      'Gap analysis with actionable items',
      'Investor-ready metrics dashboard',
      'Four evaluation categories',
      'Improvement recommendations',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },
  {
    id: 'mod-pricing-analyser',
    slug: 'pricing-analyser',
    name: 'Pricing & Margin Analyser',
    description:
      'Analyse your margin profile, test pricing scenarios with what-if modelling, and find your break-even volume.',
    category: 'financial-analysis',
    icon: 'Calculator',
    features: [
      'Margin profile by category',
      'What-if pricing slider',
      'Margin trend over time',
      'Break-even volume calculator',
      'Revenue impact modelling',
    ],
    isActive: false,
    tier: 'starter',
    credits: 5,
    monthlyPrice: 29,
  },
  {
    id: 'mod-revenue-recognition',
    slug: 'revenue-recognition',
    name: 'Revenue Recognition Engine',
    description:
      'Automate revenue recognition across contracts, subscriptions and milestones with IFRS 15 / ASC 606 compliance checks.',
    category: 'financial-analysis',
    icon: 'Receipt',
    features: [
      'IFRS 15 / ASC 606 compliance',
      'Subscription revenue scheduling',
      'Contract milestone tracking',
      'Deferred revenue waterfall',
      'Auditor-ready reports',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },

  // ─── Forecasting & Planning (4) ─────────────────────────────
  {
    id: 'mod-three-way-forecasting',
    slug: 'three-way-forecasting',
    name: 'Three-Way Forecasting',
    description:
      'Integrated P&L, balance sheet and cash flow forecasting with automatic reconciliation and variance analysis.',
    category: 'forecasting-planning',
    icon: 'Layers',
    features: [
      'Integrated P&L, BS & cash flow',
      'Automatic three-way reconciliation',
      'Monthly & quarterly roll-forward',
      'Variance-to-actual analysis',
      'Board-ready presentation export',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },
  {
    id: 'mod-workforce-planning',
    slug: 'workforce-planning',
    name: 'Workforce Planning',
    description:
      'Model headcount scenarios, forecast payroll costs and plan hiring timelines aligned with revenue projections.',
    category: 'forecasting-planning',
    icon: 'Users',
    features: [
      'Headcount scenario modelling',
      'Payroll cost forecasting',
      'Hiring timeline planner',
      'Employer cost calculator (NI, pension)',
      'Revenue-per-employee tracking',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },
  {
    id: 'mod-budget-builder',
    slug: 'budget-builder',
    name: 'Budget Builder',
    description:
      'Create and manage departmental budgets with approval workflows, real-time tracking and variance alerts.',
    category: 'forecasting-planning',
    icon: 'ClipboardList',
    features: [
      'Departmental budget creation',
      'Approval workflow engine',
      'Real-time spend tracking',
      'Variance alerts & notifications',
      'Historical budget comparison',
    ],
    isActive: false,
    tier: 'starter',
    credits: 5,
    monthlyPrice: 29,
  },
  {
    id: 'mod-scenario-modelling-pro',
    slug: 'scenario-modelling-pro',
    name: 'Scenario Modelling Pro',
    description:
      'Advanced multi-variable scenario engine with Monte Carlo simulation, sensitivity analysis, and probability-weighted outcomes.',
    category: 'forecasting-planning',
    icon: 'GitBranch',
    features: [
      'Monte Carlo simulation engine',
      'Multi-variable sensitivity analysis',
      'Probability-weighted outcomes',
      'Side-by-side scenario comparison',
      'Exportable board presentations',
    ],
    isActive: false,
    tier: 'enterprise',
    credits: 15,
    monthlyPrice: 79,
  },

  // ─── Compliance & Governance (3) ────────────────────────────
  {
    id: 'mod-tax-planning',
    slug: 'tax-planning',
    name: 'Tax Planning Assistant',
    description:
      'AI-powered corporation tax estimator with R&D tax credit identification, capital allowances and quarterly provisioning.',
    category: 'compliance-governance',
    icon: 'Landmark',
    features: [
      'Corporation tax estimator',
      'R&D tax credit identification',
      'Capital allowances optimiser',
      'Quarterly tax provisioning',
      'Year-end planning checklist',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },
  {
    id: 'mod-audit-trail',
    slug: 'audit-trail',
    name: 'Audit Trail Pro',
    description:
      'Comprehensive audit logging with tamper-proof records, user activity tracking and compliance-ready exports.',
    category: 'compliance-governance',
    icon: 'Shield',
    features: [
      'Tamper-proof audit records',
      'User activity timeline',
      'Change history for all entities',
      'Compliance-ready PDF exports',
      'Configurable retention policies',
    ],
    isActive: false,
    tier: 'starter',
    credits: 5,
    monthlyPrice: 29,
  },
  {
    id: 'mod-regulatory-compliance',
    slug: 'regulatory-compliance',
    name: 'Regulatory Compliance',
    description:
      'Stay ahead of regulatory requirements with automated compliance checks, filing reminders and governance dashboards.',
    category: 'compliance-governance',
    icon: 'Scale',
    features: [
      'Automated compliance checking',
      'Filing deadline reminders',
      'Governance policy templates',
      'Risk register management',
      'Regulator-ready reporting',
    ],
    isActive: false,
    tier: 'enterprise',
    credits: 15,
    monthlyPrice: 79,
  },

  // ─── Growth & Strategy (2) ──────────────────────────────────
  {
    id: 'mod-fundraising-toolkit',
    slug: 'fundraising-toolkit',
    name: 'Fundraising Toolkit',
    description:
      'End-to-end fundraising preparation: investor deck builder, data room organiser and valuation benchmarking.',
    category: 'growth-strategy',
    icon: 'Rocket',
    features: [
      'Investor deck auto-builder',
      'Virtual data room organiser',
      'Valuation range benchmarking',
      'Term sheet comparison tool',
      'Fundraising timeline tracker',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },
  {
    id: 'mod-ma-due-diligence',
    slug: 'ma-due-diligence',
    name: 'M&A Due Diligence',
    description:
      'Structured due diligence workspace for mergers and acquisitions with automated financial analysis and risk scoring.',
    category: 'growth-strategy',
    icon: 'Briefcase',
    features: [
      'Due diligence checklist engine',
      'Financial analysis automation',
      'Risk scoring framework',
      'Deal comparison dashboard',
      'Confidential data room',
    ],
    isActive: false,
    tier: 'enterprise',
    credits: 20,
    monthlyPrice: 149,
  },

  // ─── Industry Packs (2) ─────────────────────────────────────
  {
    id: 'mod-ecommerce-analytics',
    slug: 'ecommerce-analytics',
    name: 'E-Commerce Analytics',
    description:
      'Purpose-built financial analytics for e-commerce businesses:unit economics, channel profitability and inventory forecasting.',
    category: 'industry-packs',
    icon: 'ShoppingCart',
    features: [
      'Unit economics calculator',
      'Channel profitability breakdown',
      'Inventory turnover forecasting',
      'Customer acquisition cost tracker',
      'Seasonal demand modelling',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },
  {
    id: 'mod-saas-metrics',
    slug: 'saas-metrics',
    name: 'SaaS Metrics Suite',
    description:
      'Track MRR, ARR, churn, LTV, CAC and 20+ SaaS KPIs with investor-grade dashboards and cohort analysis.',
    category: 'industry-packs',
    icon: 'BarChart',
    features: [
      'MRR/ARR tracking & forecasting',
      'Churn & retention cohort analysis',
      'LTV:CAC ratio monitoring',
      'Net revenue retention dashboard',
      'Investor-grade SaaS metrics pack',
    ],
    isActive: false,
    tier: 'professional',
    credits: 10,
    monthlyPrice: 49,
  },
];

// In-memory activation store (would be DB-backed in production)
const activations = new Map<string, Set<string>>(); // orgId -> Set<moduleId>

// === Registry Functions ===

/**
 * Get all available modules.
 */
export function getAvailableModules(): ModuleDefinition[] {
  return MODULES;
}

/**
 * Get a single module by slug.
 */
export function getModuleBySlug(slug: string): ModuleDefinition | null {
  return MODULES.find((m) => m.slug === slug) ?? null;
}

/**
 * Get a single module by ID.
 */
export function getModuleById(id: string): ModuleDefinition | null {
  return MODULES.find((m) => m.id === id) ?? null;
}

/**
 * Get all modules for an org with activation status.
 */
export function getModulesForOrg(orgId: string): ModuleDefinition[] {
  const orgActivations = activations.get(orgId) ?? new Set();

  return MODULES.map((m) => ({
    ...m,
    isActive: orgActivations.has(m.id),
  }));
}

/**
 * Get only active modules for an org.
 */
export function getActiveModules(orgId: string): ModuleDefinition[] {
  return getModulesForOrg(orgId).filter((m) => m.isActive);
}

/**
 * Get modules filtered by category.
 */
export function getModulesByCategory(
  orgId: string,
  category: string
): ModuleDefinition[] {
  return getModulesForOrg(orgId).filter((m) => m.category === category);
}

/**
 * Activate a module for an org.
 */
export function activateModule(orgId: string, moduleId: string): boolean {
  const mod = getModuleById(moduleId);
  if (!mod) return false;

  if (!activations.has(orgId)) {
    activations.set(orgId, new Set());
  }
  activations.get(orgId)!.add(moduleId);
  return true;
}

/**
 * Deactivate a module for an org.
 */
export function deactivateModule(orgId: string, moduleId: string): boolean {
  const orgActivations = activations.get(orgId);
  if (!orgActivations) return false;
  return orgActivations.delete(moduleId);
}
