/* ------------------------------------------------------------------ */
/*  Agent Registry: AI agents that actively manage business operations */
/* ------------------------------------------------------------------ */

export interface AgentDefinition {
  id: string;
  slug: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  monthlyPrice: number;
  isFree: boolean;
  capabilities: string[];
  category: 'finance' | 'marketing' | 'operations' | 'strategy' | 'admin' | 'setup';
  status: 'available' | 'coming_soon' | 'beta' | 'active';
  metrics?: { label: string; value: string }[];
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'agent-setup',
    slug: 'setup',
    name: 'AI Setup Assistant',
    title: 'Your always-on data guardian',
    tagline: 'Configure, monitor, and maintain your data',
    description: 'Your always-on data guardian. Configures your platform from Xero data, sets reasonable defaults, monitors data quality, and flags issues before they become problems.',
    icon: 'Wrench',
    color: 'teal',
    monthlyPrice: 0,
    isFree: true,
    capabilities: [
      'Data import & cleaning',
      'Chart of accounts mapping',
      'Budget baseline generation',
      'Data quality monitoring',
      'Xero reconciliation check',
      'Assumption configuration',
    ],
    category: 'setup',
    status: 'active',
    metrics: [
      { label: 'Accounts mapped', value: '47' },
      { label: 'Data quality', value: '82/100' },
      { label: 'Issues resolved', value: '12' },
    ],
  },
  {
    id: 'agent-finance',
    slug: 'finance',
    name: 'Finance Agent',
    title: 'Your always-on CFO assistant',
    tagline: 'Your always-on CFO assistant',
    description:
      'Your always-on CFO assistant. Handles month-end close, reconciliation, cash flow monitoring, and vendor payments so your team can focus on growth. Watches every transaction, flags anomalies in real time, and generates the reports your board actually wants to read.',
    icon: 'PoundSterling',
    color: 'blue',
    monthlyPrice: 149,
    isFree: false,
    capabilities: [
      'Automated monthly close & reconciliation',
      'Real-time cash flow monitoring & alerts',
      'Vendor payment optimisation',
      'Tax deadline tracking & preparation',
      'Financial report generation',
    ],
    category: 'finance',
    status: 'available',
    metrics: [
      { label: 'Reconciled today', value: '23 transactions' },
      { label: 'Saved this month', value: '£4.2K' },
      { label: 'Reports generated', value: '3' },
    ],
  },
  {
    id: 'agent-marketing',
    slug: 'marketing',
    name: 'Marketing Agent',
    title: 'AI-powered growth engine',
    tagline: 'AI-powered growth engine',
    description:
      'Runs your inbound engine end-to-end, from SEO and content strategy to lead scoring and email campaigns. Monitors competitors, identifies opportunities, and turns data into pipeline so your team can close deals instead of writing newsletters.',
    icon: 'Megaphone',
    color: 'purple',
    monthlyPrice: 129,
    isFree: false,
    capabilities: [
      'SEO optimisation & content strategy',
      'Social media scheduling & analytics',
      'Lead generation & scoring',
      'Email campaign automation',
      'Competitor monitoring & alerts',
    ],
    category: 'marketing',
    status: 'available',
    metrics: [
      { label: 'Leads generated', value: '156' },
      { label: 'Organic traffic', value: '+32%' },
      { label: 'Cost per lead', value: '£2.80' },
    ],
  },
  {
    id: 'agent-project',
    slug: 'project-management',
    name: 'Project Management Agent',
    title: 'EOS-powered execution system',
    tagline: 'EOS-powered execution system',
    description:
      'Implements the Entrepreneurial Operating System (EOS) methodology across your organisation. Tracks quarterly rocks, prepares L10 meetings, automates scorecards, and runs IDS (Identify, Discuss, Solve) issue resolution, keeping every team member accountable.',
    icon: 'Target',
    color: 'emerald',
    monthlyPrice: 119,
    isFree: false,
    capabilities: [
      'EOS (Entrepreneurial Operating System) methodology',
      'Quarterly rock tracking & L10 meeting prep',
      'Scorecard automation',
      'Issue tracking & prioritisation (IDS)',
      'Team accountability dashboard',
    ],
    category: 'operations',
    status: 'beta',
    metrics: [
      { label: 'Rocks on track', value: '4/5' },
      { label: 'Issues resolved', value: '12' },
      { label: 'Scorecard completion', value: '92%' },
    ],
  },
  {
    id: 'agent-strategy',
    slug: 'strategy',
    name: 'Strategy Agent',
    title: 'Board-level strategic intelligence',
    tagline: 'Board-level strategic intelligence',
    description:
      'The Strategy Agent delivers the kind of market analysis and strategic planning that usually costs £2K/day from a consultancy. It prepares board packs, tracks OKRs, scores investment readiness, and surfaces growth opportunities before your competitors see them.',
    icon: 'Telescope',
    color: 'amber',
    monthlyPrice: 179,
    isFree: false,
    capabilities: [
      'Market analysis & competitive intelligence',
      'Strategic planning & OKR tracking',
      'Board pack preparation',
      'Investment readiness scoring',
      'Growth opportunity identification',
    ],
    category: 'strategy',
    status: 'coming_soon',
    metrics: [
      { label: 'Opportunities found', value: '3' },
      { label: 'Board pack due', value: 'In 5 days' },
    ],
  },
  {
    id: 'agent-secretarial',
    slug: 'secretarial',
    name: 'Secretarial Agent',
    title: 'Company admin on autopilot',
    tagline: 'Company admin on autopilot',
    description:
      'Handles the admin that keeps your company legally compliant and operationally sound. Tracks Companies House filings, renews licences, manages insurance policies, monitors contract expiry dates, and maintains your compliance calendar so nothing falls through the cracks.',
    icon: 'Stamp',
    color: 'rose',
    monthlyPrice: 99,
    isFree: false,
    capabilities: [
      'Companies House filings & reminders',
      'License & registration renewals',
      'Insurance policy tracking',
      'Contract management & expiry alerts',
      'Compliance calendar management',
    ],
    category: 'admin',
    status: 'available',
    metrics: [
      { label: 'Filings due', value: '2 this month' },
      { label: 'Licenses', value: 'All current' },
      { label: 'Contracts expiring', value: '3 in Q2' },
    ],
  },
  {
    id: 'agent-hr',
    slug: 'hr',
    name: 'HR & People Agent',
    title: 'Your people operations partner',
    tagline: 'Your people operations partner',
    description:
      'Manages your team operations end-to-end, from leave tracking and payroll compliance to hiring pipeline management, employee onboarding, performance reviews, and HR policy enforcement. Keeps your people processes running smoothly so you can focus on building a great team.',
    icon: 'Users',
    color: 'indigo',
    monthlyPrice: 109,
    isFree: false,
    capabilities: [
      'Team management & org charts',
      'Leave tracking & approval workflows',
      'Payroll compliance monitoring',
      'Hiring pipeline & recruitment',
      'Employee onboarding checklists',
      'Performance review scheduling',
    ],
    category: 'operations',
    status: 'available',
    metrics: [
      { label: 'Team size', value: '12' },
      { label: 'Leave requests', value: '3 pending' },
      { label: 'Next review cycle', value: 'In 2 weeks' },
    ],
  },
];

/** Total price if all agents purchased individually */
export const AGENTS_TOTAL_PRICE = AGENTS.filter((a) => !a.isFree).reduce((sum, a) => sum + a.monthlyPrice, 0);

/** Bundle price */
export const BUNDLE_PRICE = 499;
export const BUNDLE_SAVINGS = AGENTS_TOTAL_PRICE - BUNDLE_PRICE;

/** Look up an agent by slug */
export function getAgentBySlug(slug: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export function getFreeAgents(): AgentDefinition[] {
  return AGENTS.filter((a) => a.isFree);
}

export function getPaidAgents(): AgentDefinition[] {
  return AGENTS.filter((a) => !a.isFree);
}
