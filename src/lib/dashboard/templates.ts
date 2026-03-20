/**
 * Dashboard Template Definitions
 * Pre-built dashboard layouts for different user roles and use cases.
 *
 * Inspired by DataRails' customisable dashboards and Fathom's preset views.
 * Templates define which widgets appear and their layout order.
 */

export type WidgetType =
  | 'narrative_summary'
  | 'kpi_cards'
  | 'pnl_table'
  | 'waterfall_chart'
  | 'cash_forecast'
  | 'variance_summary'
  | 'data_freshness'
  | 'tax_summary'
  | 'ar_ap_aging'
  | 'expense_breakdown'
  | 'revenue_trend'
  | 'custom_kpis';

export type WidgetSize = 'full' | 'half' | 'third';

export interface DashboardWidget {
  type: WidgetType;
  label: string;
  size: WidgetSize;
  order: number;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  role: 'owner' | 'advisor' | 'investor' | 'bookkeeper';
  widgets: DashboardWidget[];
  isDefault: boolean;
}

/**
 * Owner Dashboard — full overview with emphasis on narrative and cash position.
 */
const ownerTemplate: DashboardTemplate = {
  id: 'owner-default',
  name: 'Business Owner',
  description: 'Complete financial overview with AI insights, P&L, and cash position',
  role: 'owner',
  isDefault: true,
  widgets: [
    { type: 'data_freshness', label: 'Data Freshness', size: 'full', order: 1 },
    { type: 'narrative_summary', label: 'AI Summary', size: 'full', order: 2 },
    { type: 'kpi_cards', label: 'Key Metrics', size: 'full', order: 3 },
    { type: 'pnl_table', label: 'Profit & Loss', size: 'half', order: 4 },
    { type: 'waterfall_chart', label: 'Profit Bridge', size: 'half', order: 5 },
    { type: 'cash_forecast', label: '13-Week Cash Flow', size: 'full', order: 6 },
    { type: 'expense_breakdown', label: 'Expense Breakdown', size: 'half', order: 7 },
    { type: 'tax_summary', label: 'Tax Obligations', size: 'half', order: 8 },
  ],
};

/**
 * Advisor Dashboard — emphasis on variance analysis and KPI trends.
 */
const advisorTemplate: DashboardTemplate = {
  id: 'advisor-default',
  name: 'Fractional CFO / Advisor',
  description: 'Variance analysis, KPI trends, and drill-down focused',
  role: 'advisor',
  isDefault: true,
  widgets: [
    { type: 'data_freshness', label: 'Data Freshness', size: 'full', order: 1 },
    { type: 'narrative_summary', label: 'AI Summary', size: 'full', order: 2 },
    { type: 'variance_summary', label: 'Variance Analysis', size: 'full', order: 3 },
    { type: 'kpi_cards', label: 'Key Metrics', size: 'full', order: 4 },
    { type: 'pnl_table', label: 'Profit & Loss', size: 'full', order: 5 },
    { type: 'waterfall_chart', label: 'Profit Bridge', size: 'half', order: 6 },
    { type: 'revenue_trend', label: 'Revenue Trend', size: 'half', order: 7 },
    { type: 'cash_forecast', label: '13-Week Cash Flow', size: 'full', order: 8 },
    { type: 'custom_kpis', label: 'Custom KPIs', size: 'full', order: 9 },
  ],
};

/**
 * Investor Dashboard — high-level metrics, growth, and cash runway.
 */
const investorTemplate: DashboardTemplate = {
  id: 'investor-default',
  name: 'Investor / Board',
  description: 'High-level KPIs, growth metrics, and cash runway',
  role: 'investor',
  isDefault: true,
  widgets: [
    { type: 'narrative_summary', label: 'AI Summary', size: 'full', order: 1 },
    { type: 'kpi_cards', label: 'Key Metrics', size: 'full', order: 2 },
    { type: 'revenue_trend', label: 'Revenue Trend', size: 'half', order: 3 },
    { type: 'waterfall_chart', label: 'Profit Bridge', size: 'half', order: 4 },
    { type: 'cash_forecast', label: 'Cash Runway', size: 'full', order: 5 },
    { type: 'variance_summary', label: 'Key Variances', size: 'full', order: 6 },
  ],
};

/**
 * Bookkeeper Dashboard — focused on data accuracy and reconciliation.
 */
const bookkeeperTemplate: DashboardTemplate = {
  id: 'bookkeeper-default',
  name: 'Bookkeeper',
  description: 'Data freshness, P&L detail, and AR/AP aging',
  role: 'bookkeeper',
  isDefault: true,
  widgets: [
    { type: 'data_freshness', label: 'Data Freshness', size: 'full', order: 1 },
    { type: 'pnl_table', label: 'Profit & Loss', size: 'full', order: 2 },
    { type: 'ar_ap_aging', label: 'AR/AP Aging', size: 'full', order: 3 },
    { type: 'expense_breakdown', label: 'Expense Breakdown', size: 'half', order: 4 },
    { type: 'tax_summary', label: 'Tax Summary', size: 'half', order: 5 },
  ],
};

/**
 * All built-in dashboard templates.
 */
export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  ownerTemplate,
  advisorTemplate,
  investorTemplate,
  bookkeeperTemplate,
];

/**
 * Get the default template for a given role.
 */
export function getDefaultTemplate(role: string): DashboardTemplate {
  const template = DASHBOARD_TEMPLATES.find(
    (t) => t.role === role && t.isDefault
  );
  return template ?? ownerTemplate;
}

/**
 * Get a template by ID.
 */
export function getTemplateById(id: string): DashboardTemplate | undefined {
  return DASHBOARD_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all available templates.
 */
export function getAllTemplates(): DashboardTemplate[] {
  return DASHBOARD_TEMPLATES;
}

/**
 * All available widget types with metadata.
 */
export const WIDGET_REGISTRY: Record<WidgetType, { label: string; description: string }> = {
  narrative_summary: { label: 'AI Narrative Summary', description: 'Claude-generated financial insight' },
  kpi_cards: { label: 'KPI Cards', description: 'Key performance indicator cards with trends' },
  pnl_table: { label: 'Profit & Loss', description: 'Full P&L table with drill-down' },
  waterfall_chart: { label: 'Waterfall Chart', description: 'Revenue to net profit bridge' },
  cash_forecast: { label: 'Cash Forecast', description: '13-week rolling cash flow projection' },
  variance_summary: { label: 'Variance Analysis', description: 'Period-over-period variance breakdown' },
  data_freshness: { label: 'Data Freshness', description: 'Last sync time and data currency indicator' },
  tax_summary: { label: 'Tax Summary', description: 'UK tax obligations overview' },
  ar_ap_aging: { label: 'AR/AP Aging', description: 'Accounts receivable and payable aging buckets' },
  expense_breakdown: { label: 'Expense Breakdown', description: 'Operating expense category breakdown' },
  revenue_trend: { label: 'Revenue Trend', description: 'Multi-period revenue trend chart' },
  custom_kpis: { label: 'Custom KPIs', description: 'User-defined custom KPI metrics' },
};
