/* Essential Modules — free modules included with every account */

export interface EssentialModule {
  slug: string;
  name: string;
  description: string;
  icon: string;
  requiredBy: string[];
  setupTime: string;
  status: 'active';
}

const ESSENTIAL_MODULES: EssentialModule[] = [
  {
    slug: 'budget-manager',
    name: 'Budget Manager',
    description: 'Set and track budgets by department and category. Required for variance analysis.',
    icon: 'Calculator',
    requiredBy: ['Variance Analysis', 'Scenario Modelling'],
    setupTime: '~5 min with Setup Agent',
    status: 'active',
  },
  {
    slug: 'chart-of-accounts',
    name: 'Chart of Accounts',
    description: 'Map Xero accounts to platform categories. Required for accurate reporting.',
    icon: 'ListTree',
    requiredBy: ['Financial Dashboard', 'Reports', 'KPI Tracking'],
    setupTime: '~3 min with Setup Agent',
    status: 'active',
  },
  {
    slug: 'data-quality-monitor',
    name: 'Data Quality Monitor',
    description: 'Real-time data quality scoring, gap detection, and duplicate alerts.',
    icon: 'ShieldCheck',
    requiredBy: ['Intelligence Engine', 'All Reporting'],
    setupTime: 'Automatic',
    status: 'active',
  },
  {
    slug: 'financial-dashboard',
    name: 'Financial Dashboard',
    description: 'Core P&L, balance sheet, and cash position views.',
    icon: 'BarChart',
    requiredBy: ['Board Packs', 'KPI Tracking'],
    setupTime: '~2 min with Setup Agent',
    status: 'active',
  },
  {
    slug: 'kpi-tracker',
    name: 'KPI Tracker',
    description: 'Standard and custom KPI tracking with targets and trend analysis.',
    icon: 'Target',
    requiredBy: ['Playbook Assessment', 'Reports'],
    setupTime: '~3 min to set targets',
    status: 'active',
  },
];

export function getEssentialModules(): EssentialModule[] {
  return ESSENTIAL_MODULES;
}

export function isEssentialModule(slug: string): boolean {
  return ESSENTIAL_MODULES.some((m) => m.slug === slug);
}
