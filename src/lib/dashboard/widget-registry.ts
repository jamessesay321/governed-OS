/**
 * Widget Registry — Central map of all available widget types.
 *
 * Each widget type has metadata for the template selector, drag-and-drop,
 * and the widget grid renderer.
 */

export type WidgetCategory = 'financial' | 'operational' | 'risk' | 'growth' | 'custom';

export type WidgetSize = 'full' | 'half' | 'third';

export interface WidgetMeta {
  title: string;
  description: string;
  icon: string; // lucide icon name
  defaultSize: WidgetSize;
  category: WidgetCategory;
}

/**
 * Extended WidgetType — includes original 12 types plus 14 new widget types.
 */
export type ExtendedWidgetType =
  // Original types
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
  | 'custom_kpis'
  // New F-069/070 types
  | 'debt_maturity'
  | 'working_capital'
  | 'headcount_cost'
  | 'revenue_concentration'
  | 'margin_trend'
  | 'runway'
  | 'top_customers'
  | 'top_expenses'
  | 'budget_variance'
  | 'payroll_summary'
  | 'seasonal_pattern'
  | 'growth_metrics'
  | 'industry_benchmark'
  | 'alert_summary';

/**
 * Full widget registry with metadata for every widget type.
 */
export const FULL_WIDGET_REGISTRY: Record<ExtendedWidgetType, WidgetMeta> = {
  // ── Original widgets ──
  narrative_summary: {
    title: 'AI Narrative Summary',
    description: 'Claude-generated financial insight',
    icon: 'MessageSquareText',
    defaultSize: 'full',
    category: 'financial',
  },
  kpi_cards: {
    title: 'KPI Cards',
    description: 'Key performance indicator cards with trends',
    icon: 'BarChart3',
    defaultSize: 'full',
    category: 'financial',
  },
  pnl_table: {
    title: 'Profit & Loss',
    description: 'Full P&L table with drill-down',
    icon: 'Table',
    defaultSize: 'half',
    category: 'financial',
  },
  waterfall_chart: {
    title: 'Waterfall Chart',
    description: 'Revenue to net profit bridge',
    icon: 'BarChart',
    defaultSize: 'half',
    category: 'financial',
  },
  cash_forecast: {
    title: 'Cash Forecast',
    description: '13-week rolling cash flow projection',
    icon: 'TrendingUp',
    defaultSize: 'full',
    category: 'financial',
  },
  variance_summary: {
    title: 'Variance Analysis',
    description: 'Period-over-period variance breakdown',
    icon: 'ArrowUpDown',
    defaultSize: 'full',
    category: 'financial',
  },
  data_freshness: {
    title: 'Data Freshness',
    description: 'Last sync time and data currency indicator',
    icon: 'RefreshCw',
    defaultSize: 'full',
    category: 'operational',
  },
  tax_summary: {
    title: 'Tax Summary',
    description: 'UK tax obligations overview',
    icon: 'Receipt',
    defaultSize: 'half',
    category: 'financial',
  },
  ar_ap_aging: {
    title: 'AR/AP Aging',
    description: 'Accounts receivable and payable aging buckets',
    icon: 'Clock',
    defaultSize: 'full',
    category: 'operational',
  },
  expense_breakdown: {
    title: 'Expense Breakdown',
    description: 'Operating expense category breakdown',
    icon: 'PieChart',
    defaultSize: 'half',
    category: 'financial',
  },
  revenue_trend: {
    title: 'Revenue Trend',
    description: 'Multi-period revenue trend chart',
    icon: 'LineChart',
    defaultSize: 'half',
    category: 'growth',
  },
  custom_kpis: {
    title: 'Custom KPIs',
    description: 'User-defined custom KPI metrics',
    icon: 'Settings',
    defaultSize: 'full',
    category: 'custom',
  },

  // ── New F-069/070 widgets ──
  debt_maturity: {
    title: 'Debt Maturity',
    description: 'Upcoming debt maturities as horizontal timeline bars',
    icon: 'Calendar',
    defaultSize: 'half',
    category: 'risk',
  },
  working_capital: {
    title: 'Working Capital',
    description: 'Current assets vs current liabilities with working capital number',
    icon: 'Scale',
    defaultSize: 'half',
    category: 'financial',
  },
  headcount_cost: {
    title: 'Headcount Cost',
    description: 'Total payroll cost, cost per head, trend sparkline',
    icon: 'Users',
    defaultSize: 'half',
    category: 'operational',
  },
  revenue_concentration: {
    title: 'Revenue Concentration',
    description: 'Top 5 customers as percentage of total revenue',
    icon: 'Target',
    defaultSize: 'half',
    category: 'risk',
  },
  margin_trend: {
    title: 'Margin Trend',
    description: '6-month gross/net margin trend with area chart',
    icon: 'TrendingUp',
    defaultSize: 'half',
    category: 'financial',
  },
  runway: {
    title: 'Cash Runway',
    description: 'Cash runway in months (bullet graph style)',
    icon: 'Timer',
    defaultSize: 'half',
    category: 'risk',
  },
  top_customers: {
    title: 'Top Customers',
    description: 'Top 5 customers by revenue with amount and percentage',
    icon: 'Users',
    defaultSize: 'half',
    category: 'growth',
  },
  top_expenses: {
    title: 'Top Expenses',
    description: 'Top 5 expense categories with amount and trend direction',
    icon: 'ArrowDownCircle',
    defaultSize: 'half',
    category: 'financial',
  },
  budget_variance: {
    title: 'Budget Variance',
    description: 'Actual vs budget for top 5 items with variance bars',
    icon: 'BarChart3',
    defaultSize: 'half',
    category: 'financial',
  },
  payroll_summary: {
    title: 'Payroll Summary',
    description: 'Total payroll, employer NI, pension, trend',
    icon: 'Wallet',
    defaultSize: 'half',
    category: 'operational',
  },
  seasonal_pattern: {
    title: 'Seasonal Pattern',
    description: '12-month revenue overlay (current year vs last year)',
    icon: 'CalendarDays',
    defaultSize: 'half',
    category: 'growth',
  },
  growth_metrics: {
    title: 'Growth Metrics',
    description: 'MoM growth, YoY growth, compound monthly growth rate',
    icon: 'Rocket',
    defaultSize: 'half',
    category: 'growth',
  },
  industry_benchmark: {
    title: 'Industry Benchmark',
    description: 'Key ratios vs industry averages',
    icon: 'Award',
    defaultSize: 'half',
    category: 'custom',
  },
  alert_summary: {
    title: 'Alert Summary',
    description: 'Active alert count by severity and recent triggered alerts',
    icon: 'Bell',
    defaultSize: 'half',
    category: 'operational',
  },
};

/**
 * Get all widget types for a given category.
 */
export function getWidgetsByCategory(category: WidgetCategory): ExtendedWidgetType[] {
  return (Object.entries(FULL_WIDGET_REGISTRY) as [ExtendedWidgetType, WidgetMeta][])
    .filter(([, meta]) => meta.category === category)
    .map(([type]) => type);
}

/**
 * All extended widget types as an array.
 */
export const ALL_EXTENDED_WIDGET_TYPES = Object.keys(FULL_WIDGET_REGISTRY) as ExtendedWidgetType[];
