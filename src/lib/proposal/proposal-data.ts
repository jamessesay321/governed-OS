/* Interactive Proposal — personalised AI strategy recommendation */

export interface ProposalItem {
  id: string;
  type: 'agent' | 'module' | 'service' | 'package';
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  included: boolean;
  recommended: boolean;
  reasoning: string;
}

export interface ProposalTimeline {
  week: number;
  milestone: string;
  description: string;
}

export interface Proposal {
  items: ProposalItem[];
  totalMonthly: number;
  totalAnnual: number;
  savings: number;
  timeline: ProposalTimeline[];
  lastUpdated: string;
}

export function getMockProposal(): Proposal {
  const items: ProposalItem[] = [
    // Included (free)
    { id: 'setup-agent', type: 'agent', name: 'AI Setup Assistant', description: 'Always-on data guardian', monthlyPrice: 0, annualPrice: 0, included: true, recommended: false, reasoning: 'Free forever — configures your platform and monitors data quality.' },
    { id: 'budget-mgr', type: 'module', name: 'Budget Manager', description: 'Budget tracking by department', monthlyPrice: 0, annualPrice: 0, included: true, recommended: false, reasoning: 'Essential for variance analysis.' },
    { id: 'chart-accts', type: 'module', name: 'Chart of Accounts', description: 'Account mapping from Xero', monthlyPrice: 0, annualPrice: 0, included: true, recommended: false, reasoning: 'Required for accurate categorisation.' },
    { id: 'data-quality', type: 'module', name: 'Data Quality Monitor', description: 'Real-time data scoring', monthlyPrice: 0, annualPrice: 0, included: true, recommended: false, reasoning: 'Ensures data integrity across the platform.' },
    { id: 'fin-dashboard', type: 'module', name: 'Financial Dashboard', description: 'Core financial views', monthlyPrice: 0, annualPrice: 0, included: true, recommended: false, reasoning: 'Your financial command centre.' },
    { id: 'kpi-tracker', type: 'module', name: 'KPI Tracker', description: 'Performance tracking', monthlyPrice: 0, annualPrice: 0, included: true, recommended: false, reasoning: 'Track what matters most to your business.' },
    { id: 'governance', type: 'service', name: 'Governance Centre', description: 'Trust & compliance hub', monthlyPrice: 0, annualPrice: 0, included: true, recommended: false, reasoning: 'Full transparency and control over AI operations.' },
    // Recommended
    { id: 'finance-agent', type: 'agent', name: 'Finance Agent', description: 'Automated CFO assistant', monthlyPrice: 14900, annualPrice: 149000, included: false, recommended: true, reasoning: 'ALONUKO processes 84+ transactions daily — this agent automates reconciliation, catches duplicates, and manages cash flow forecasting.' },
    { id: 'marketing-agent', type: 'agent', name: 'Marketing Agent', description: 'AI growth engine', monthlyPrice: 12900, annualPrice: 129000, included: false, recommended: true, reasoning: 'With trunk shows and multi-channel presence, the Marketing Agent scores leads, manages campaigns, and tracks competitor pricing.' },
    { id: 'cash-forecaster', type: 'module', name: 'Cash Flow Forecaster', description: 'Rolling cash projection', monthlyPrice: 2900, annualPrice: 29000, included: false, recommended: true, reasoning: 'Critical for seasonal bridal business — plan around wedding season peaks and trunk show expenses.' },
    // Optional
    { id: 'strategy-agent', type: 'agent', name: 'Strategy Agent', description: 'Board-level intelligence', monthlyPrice: 17900, annualPrice: 179000, included: false, recommended: false, reasoning: 'Prepare for US expansion with market analysis and investment readiness scoring.' },
    { id: 'secretarial-agent', type: 'agent', name: 'Secretarial Agent', description: 'Compliance autopilot', monthlyPrice: 9900, annualPrice: 99000, included: false, recommended: false, reasoning: 'Automates Companies House filings, insurance tracking, and contract management.' },
    { id: 'gov-pack', type: 'package', name: 'Growth Governance Pack', description: 'Full stack audit + monthly reviews', monthlyPrice: 34900, annualPrice: 349000, included: false, recommended: false, reasoning: 'Recommended if using 5+ AI tools across the business for unified governance.' },
  ];

  const timeline: ProposalTimeline[] = [
    { week: 1, milestone: 'Foundation Setup', description: 'Setup Agent configures platform, essential modules activated, data quality baseline established.' },
    { week: 2, milestone: 'Finance Agent Active', description: 'Automated reconciliation, cash flow monitoring, and anomaly detection running 24/7.' },
    { week: 3, milestone: 'Marketing Agent Active', description: 'Lead scoring, campaign automation, and competitor monitoring operational.' },
    { week: 4, milestone: 'Full Optimisation', description: 'All systems tuned, first board pack generated, ROI review with your account team.' },
  ];

  const recommended = items.filter((i) => i.recommended);
  const totalMonthly = recommended.reduce((s, i) => s + i.monthlyPrice, 0);

  return {
    items,
    totalMonthly,
    totalAnnual: totalMonthly * 10, // 2 months free
    savings: totalMonthly * 2,
    timeline,
    lastUpdated: '2026-03-21',
  };
}
