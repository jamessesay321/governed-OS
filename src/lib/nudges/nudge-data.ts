/* Progress Nudges — contextual banners per page */

export interface Nudge {
  id: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  section: string;
  priority: 'info' | 'action' | 'celebration';
}

const ALL_NUDGES: Nudge[] = [
  { id: 'connect-xero', message: 'Connect Xero to see real financial data across your dashboard.', actionLabel: 'Connect Xero', actionHref: '/xero', section: 'dashboard', priority: 'action' },
  { id: 'set-budgets', message: 'Set budget baselines to unlock variance analysis and scenario modelling.', actionLabel: 'Set Budgets', actionHref: '/roadmap', section: 'dashboard', priority: 'action' },
  { id: 'map-accounts', message: 'Map your chart of accounts for accurate financial categorisation.', actionLabel: 'Map Accounts', actionHref: '/roadmap', section: 'financials', priority: 'action' },
  { id: 'configure-kpis', message: 'Configure KPI targets for meaningful reports and tracking.', actionLabel: 'Set Targets', actionHref: '/kpi/targets', section: 'reports', priority: 'action' },
  { id: 'setup-agent-free', message: 'Your AI Setup Agent is free forever — see what it has already configured for you.', actionLabel: 'View Agent', actionHref: '/agents/setup', section: 'agents', priority: 'info' },
  { id: 'explore-intelligence', message: 'Your AI has found 3 new insights about your business this week.', actionLabel: 'View Insights', actionHref: '/intelligence', section: 'dashboard', priority: 'info' },
  { id: 'budget-set', message: 'Budget baselines are set! Variance analysis is now available.', actionLabel: 'View Variance', actionHref: '/variance', section: 'financials', priority: 'celebration' },
  { id: 'quality-good', message: 'Data quality score: 82/100 — your data is in great shape.', actionLabel: 'View Details', actionHref: '/integrations/health', section: 'dashboard', priority: 'celebration' },
  { id: 'try-scenario', message: 'Try modelling a pricing change to see its impact on your forecast.', actionLabel: 'Build Scenario', actionHref: '/scenarios', section: 'scenarios', priority: 'info' },
  { id: 'governance-setup', message: 'Review your AI governance settings to stay compliant and in control.', actionLabel: 'Trust Centre', actionHref: '/governance', section: 'governance', priority: 'info' },
];

export function getNudgesForPage(section: string): Nudge[] {
  return ALL_NUDGES.filter((n) => n.section === section);
}
