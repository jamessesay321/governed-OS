/* ------------------------------------------------------------------ */
/*  Billing Data:mock billing, invoices, bundles, debt overview      */
/* ------------------------------------------------------------------ */

// === Invoice Types ===

export interface InvoiceLineItem {
  description: string;
  fullValue: number;
  amount: number;
  included: boolean;
  complimentary: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  period: string;
  lineItems: InvoiceLineItem[];
  subtotalValue: number;
  totalCharged: number;
  savings: number;
  status: 'paid' | 'pending' | 'overdue';
}

// === Service Breakdown ===

export interface ServiceBreakdown {
  platform: { name: string; marketValue: number; included: boolean }[];
  modules: { name: string; credits: number; monthlyPrice: number; active: boolean }[];
  agents: { name: string; monthlyPrice: number; active: boolean }[];
  totalMonthlyValue: number;
  totalMonthlyCharge: number;
  nextBillingDate: string;
  currentPlan: string;
}

// === Bundle Recommendations ===

export interface RecommendedBundle {
  id: string;
  name: string;
  description: string;
  tagline: string;
  color: string;
  modules: string[];
  agents: string[];
  monthlyPrice: number;
  fullPrice: number;
  savings: number;
  recommended: boolean;
  features: string[];
}

// === Debt Overview ===

export interface DebtOverviewItem {
  id: string;
  creditor: string;
  type: 'loan' | 'credit_line' | 'invoice_finance' | 'lease' | 'overdraft';
  originalAmount: number;
  outstandingBalance: number;
  monthlyPayment: number;
  interestRate: number;
  maturityDate: string;
  status: 'current' | 'attention' | 'overdue';
}

// === Constants ===

const PLATFORM_FEATURES = [
  { name: 'Financial Dashboard', marketValue: 49, included: true },
  { name: 'KPI Tracking & Alerts', marketValue: 29, included: true },
  { name: 'Variance Analysis', marketValue: 39, included: true },
  { name: 'Report Builder', marketValue: 29, included: true },
  { name: 'Knowledge Vault', marketValue: 19, included: true },
  { name: 'AI Intelligence Engine', marketValue: 49, included: true },
  { name: 'Scenario Modelling', marketValue: 39, included: true },
  { name: 'Maturity Playbook', marketValue: 29, included: true },
];

// === Public API ===

export function getMockServiceBreakdown(): ServiceBreakdown {
  const platformValue = PLATFORM_FEATURES.reduce((s, f) => s + f.marketValue, 0);
  const modulesCharge = 29 + 49; // Cash Flow + SaaS Metrics
  const agentsCharge = 149 + 99; // Finance + Secretarial

  return {
    platform: PLATFORM_FEATURES,
    modules: [
      { name: 'Financial Health Check', credits: 0, monthlyPrice: 0, active: true },
      { name: 'Cash Flow Forecaster', credits: 5, monthlyPrice: 29, active: true },
      { name: 'SaaS Metrics Suite', credits: 10, monthlyPrice: 49, active: true },
    ],
    agents: [
      { name: 'Finance Agent', monthlyPrice: 149, active: true },
      { name: 'Marketing Agent', monthlyPrice: 129, active: false },
      { name: 'Project Management Agent', monthlyPrice: 119, active: false },
      { name: 'Strategy Agent', monthlyPrice: 179, active: false },
      { name: 'Secretarial Agent', monthlyPrice: 99, active: true },
    ],
    totalMonthlyValue: platformValue + modulesCharge + agentsCharge,
    totalMonthlyCharge: 79 + agentsCharge, // Professional plan + active agents
    nextBillingDate: '2026-03-28',
    currentPlan: 'Professional',
  };
}

function buildInvoiceLineItems(includeAll: boolean): InvoiceLineItem[] {
  const items: InvoiceLineItem[] = [];

  // Platform features:always included
  for (const f of PLATFORM_FEATURES) {
    items.push({ description: f.name, fullValue: f.marketValue, amount: 0, included: true, complimentary: false });
  }

  // Modules
  items.push({ description: 'Financial Health Check (Complimentary)', fullValue: 29, amount: 0, included: false, complimentary: true });
  items.push({ description: 'Cash Flow Forecaster:5 credits', fullValue: 29, amount: 29, included: false, complimentary: false });
  if (includeAll) {
    items.push({ description: 'SaaS Metrics Suite:10 credits', fullValue: 49, amount: 49, included: false, complimentary: false });
  }

  // Agents
  items.push({ description: 'Finance Agent:Monthly subscription', fullValue: 149, amount: 149, included: false, complimentary: false });
  items.push({ description: 'Secretarial Agent:Monthly subscription', fullValue: 99, amount: 99, included: false, complimentary: false });

  // Plan
  items.push({ description: 'Professional Plan (250 credits)', fullValue: 79, amount: 79, included: false, complimentary: false });

  return items;
}

export function getMockInvoices(): Invoice[] {
  const months = [
    { id: 'INV-2026-03', date: '2026-03-01', period: 'March 2026', status: 'pending' as const },
    { id: 'INV-2026-02', date: '2026-02-01', period: 'February 2026', status: 'paid' as const },
    { id: 'INV-2026-01', date: '2026-01-01', period: 'January 2026', status: 'paid' as const },
    { id: 'INV-2025-12', date: '2025-12-01', period: 'December 2025', status: 'paid' as const },
    { id: 'INV-2025-11', date: '2025-11-01', period: 'November 2025', status: 'paid' as const },
    { id: 'INV-2025-10', date: '2025-10-01', period: 'October 2025', status: 'paid' as const },
  ];

  return months.map((m, i) => {
    const items = buildInvoiceLineItems(i < 4); // SaaS Metrics added in Dec
    const subtotalValue = items.reduce((s, it) => s + it.fullValue, 0);
    const totalCharged = items.reduce((s, it) => s + it.amount, 0);
    return {
      ...m,
      lineItems: items,
      subtotalValue,
      totalCharged,
      savings: subtotalValue - totalCharged,
    };
  });
}

export function getRecommendedBundles(): RecommendedBundle[] {
  return [
    {
      id: 'bundle-growth',
      name: 'Growth Essentials',
      description: 'Perfect for scaling luxury brands:core financial tools with compliance autopilot.',
      tagline: 'Most popular with emerging brands',
      color: 'amber',
      modules: ['Cash Flow Forecaster', 'Budget Builder', 'Financial Health Check'],
      agents: ['Finance Agent', 'Secretarial Agent'],
      monthlyPrice: 349,
      fullPrice: 385,
      savings: 36,
      recommended: false,
      features: [
        'Seasonal cash flow planning for wedding peaks',
        'Companies House & compliance autopilot',
        'Showroom expense tracking & reconciliation',
        'Automated VAT preparation',
      ],
    },
    {
      id: 'bundle-creative',
      name: 'Creative Empire',
      description: 'Built for multi-channel luxury businesses ready to scale internationally.',
      tagline: 'Recommended for ALONUKO',
      color: 'purple',
      modules: ['Cash Flow Forecaster', 'SaaS Metrics Suite', 'Investment Readiness', 'Pricing & Margin Analyser', 'Revenue Recognition'],
      agents: ['Finance Agent', 'Marketing Agent', 'Secretarial Agent'],
      monthlyPrice: 549,
      fullPrice: 654,
      savings: 105,
      recommended: true,
      features: [
        'Trunk show ROI & channel profitability tracking',
        'Bridal collection margin analysis by line',
        'Instagram-to-revenue pipeline attribution',
        'Investor-ready financial reporting',
        'Automated lead scoring & follow-up',
      ],
    },
    {
      id: 'bundle-enterprise',
      name: 'Enterprise Command',
      description: 'Full operational control for ambitious founders building global brands.',
      tagline: 'For teams scaling fast',
      color: 'emerald',
      modules: ['All 16 modules (Enterprise Plan)'],
      agents: ['All 5 agents (Full Suite)'],
      monthlyPrice: 899,
      fullPrice: 1198,
      savings: 299,
      recommended: false,
      features: [
        'Everything in Creative Empire',
        'All 16 specialist modules unlocked',
        'All 5 AI agents working 24/7',
        'Priority support & dedicated account manager',
        'Custom integrations & API access',
      ],
    },
  ];
}

export function getMockDebtOverview(): DebtOverviewItem[] {
  return [
    {
      id: 'debt-1',
      creditor: 'Barclays Business',
      type: 'loan',
      originalAmount: 75000,
      outstandingBalance: 48000,
      monthlyPayment: 1450,
      interestRate: 6.5,
      maturityDate: '2029-06-15',
      status: 'current',
    },
    {
      id: 'debt-2',
      creditor: 'HSBC',
      type: 'invoice_finance',
      originalAmount: 30000,
      outstandingBalance: 12500,
      monthlyPayment: 850,
      interestRate: 4.2,
      maturityDate: '2026-12-01',
      status: 'current',
    },
    {
      id: 'debt-3',
      creditor: 'Lombard Finance',
      type: 'lease',
      originalAmount: 15000,
      outstandingBalance: 8200,
      monthlyPayment: 420,
      interestRate: 5.8,
      maturityDate: '2027-09-30',
      status: 'current',
    },
    {
      id: 'debt-4',
      creditor: 'Barclays Business',
      type: 'overdraft',
      originalAmount: 20000,
      outstandingBalance: 3400,
      monthlyPayment: 0,
      interestRate: 8.9,
      maturityDate: '2026-09-01',
      status: 'attention',
    },
  ];
}

export const DEBT_TYPE_LABELS: Record<string, string> = {
  loan: 'Business Loan',
  credit_line: 'Credit Line',
  invoice_finance: 'Invoice Finance',
  lease: 'Equipment Lease',
  overdraft: 'Overdraft',
};

// === Free Tier ===

export interface FreeTierDefinition {
  name: string;
  description: string;
  features: string[];
}

export function getFreeTier(): FreeTierDefinition {
  return {
    name: 'Foundation (Free Forever)',
    description: 'Everything you need to get started with AI-powered financial governance.',
    features: [
      'AI Setup Assistant',
      'Budget Manager',
      'Chart of Accounts',
      'Data Quality Monitor',
      'Financial Dashboard',
      'KPI Tracker',
      'Governance Centre',
      'Activation Roadmap',
      'Free AI Stack Audit',
    ],
  };
}
