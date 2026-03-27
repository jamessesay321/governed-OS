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
  {
    id: 'agent-procurement',
    slug: 'procurement',
    name: 'Procurement Agent',
    title: 'Your sharp-eyed buying partner',
    tagline: 'Your sharp-eyed buying partner',
    description:
      'Finds the right suppliers, compares quotes side by side, and keeps your spend under control. Generates RFQs, reviews contract terms, and tracks purchase orders so you always know where the money is going and whether you are getting a fair deal.',
    icon: 'ShoppingCart',
    color: 'orange',
    monthlyPrice: 119,
    isFree: false,
    capabilities: [
      'Supplier research & shortlisting',
      'Spend analysis & cost benchmarking',
      'RFQ generation & comparison',
      'Contract term review & flagging',
      'Purchase order tracking',
    ],
    category: 'operations',
    status: 'coming_soon',
    metrics: [
      { label: 'Suppliers evaluated', value: '18' },
      { label: 'Spend tracked', value: '£42K' },
      { label: 'Open POs', value: '7' },
    ],
  },
  {
    id: 'agent-social-media',
    slug: 'social-media',
    name: 'Social Media Agent',
    title: 'Your organic social sidekick',
    tagline: 'Your organic social sidekick',
    description:
      'Keeps an eye on your social channels so you do not have to. Tracks engagement, spots trending conversations, suggests content ideas, and monitors brand mentions across platforms. Think of it as a social media manager who never sleeps.',
    icon: 'Share2',
    color: 'pink',
    monthlyPrice: 99,
    isFree: false,
    capabilities: [
      'Engagement analysis & trend spotting',
      'Content idea suggestions',
      'Posting schedule optimisation',
      'Audience insights & growth tracking',
      'Brand mention monitoring',
    ],
    category: 'marketing',
    status: 'coming_soon',
    metrics: [
      { label: 'Engagement rate', value: '4.2%' },
      { label: 'Mentions this week', value: '34' },
      { label: 'Content ideas queued', value: '12' },
    ],
  },
  {
    id: 'agent-data-steward',
    slug: 'data-steward',
    name: 'Data Steward Agent',
    title: 'Your data quality watchdog',
    tagline: 'Your data quality watchdog',
    description:
      'Quietly monitors every data feed coming into your platform, flags anomalies before they cause headaches, and keeps reconciliation on track. Scores data quality across integrations and alerts you the moment something looks off so you can fix it fast.',
    icon: 'ShieldCheck',
    color: 'cyan',
    monthlyPrice: 109,
    isFree: false,
    capabilities: [
      'Anomaly detection & alerting',
      'Cross-source reconciliation',
      'Data quality scoring & reporting',
      'Integration source monitoring',
      'Duplicate & drift detection',
    ],
    category: 'operations',
    status: 'coming_soon',
    metrics: [
      { label: 'Quality score', value: '91/100' },
      { label: 'Anomalies flagged', value: '5' },
      { label: 'Sources monitored', value: '8' },
    ],
  },
  {
    id: 'agent-investor-relations',
    slug: 'investor-relations',
    name: 'Investor Relations Agent',
    title: 'Your fundraising co-pilot',
    tagline: 'Your fundraising co-pilot',
    description:
      'Takes the heavy lifting out of investor communications. Drafts monthly updates, tracks cap table changes, generates board packs, and keeps fundraising metrics in one place. Lets you spend more time building and less time formatting slide decks.',
    icon: 'Handshake',
    color: 'violet',
    monthlyPrice: 149,
    isFree: false,
    capabilities: [
      'Investor update drafting',
      'Cap table change tracking',
      'Board pack generation',
      'Fundraising metric monitoring',
      'Investor communication logs',
    ],
    category: 'strategy',
    status: 'coming_soon',
    metrics: [
      { label: 'Next update due', value: 'In 4 days' },
      { label: 'Cap table changes', value: '2 pending' },
      { label: 'Board pack status', value: 'Draft ready' },
    ],
  },
  {
    id: 'agent-spreadsheet',
    slug: 'spreadsheet',
    name: 'Spreadsheet Agent',
    title: 'Your financial modelling buddy',
    tagline: 'Your financial modelling buddy',
    description:
      'Builds and maintains the financial models your team relies on. Audits formulas, generates templates, transforms messy data into clean reports, and automates the Excel workflows that eat up your afternoons. Like having a spreadsheet wizard on call.',
    icon: 'Table',
    color: 'lime',
    monthlyPrice: 99,
    isFree: false,
    capabilities: [
      'Financial model building & maintenance',
      'Formula auditing & error detection',
      'Template generation & standardisation',
      'Data transformation & cleanup',
      'Automated report generation',
    ],
    category: 'finance',
    status: 'coming_soon',
    metrics: [
      { label: 'Models maintained', value: '6' },
      { label: 'Formulas audited', value: '312' },
      { label: 'Reports generated', value: '8' },
    ],
  },
  {
    id: 'agent-compliance',
    slug: 'compliance',
    name: 'Compliance Agent',
    title: 'Your regulatory early warning system',
    tagline: 'Your regulatory early warning system',
    description:
      'Keeps tabs on the regulations that matter to your business, tracks filing deadlines, reviews internal policies, and flags compliance risks before they become fines. Works quietly in the background so you can sleep easy knowing nothing has been missed.',
    icon: 'Scale',
    color: 'slate',
    monthlyPrice: 129,
    isFree: false,
    capabilities: [
      'Regulation monitoring & updates',
      'Filing deadline tracking & reminders',
      'Policy review & gap analysis',
      'Compliance risk assessment & scoring',
      'Audit trail management',
    ],
    category: 'admin',
    status: 'coming_soon',
    metrics: [
      { label: 'Deadlines this quarter', value: '4' },
      { label: 'Policies reviewed', value: '11' },
      { label: 'Risk score', value: 'Low' },
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
