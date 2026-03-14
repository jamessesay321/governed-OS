/**
 * KPI Definitions — deterministic calculation functions per business type.
 * All financial math is pure TypeScript, no AI involved.
 */

export type KPIFormat = 'currency' | 'percentage' | 'months' | 'ratio' | 'number' | 'days';
export type BusinessType = 'universal' | 'saas' | 'ecommerce' | 'services';

export type KPIDefinition = {
  key: string;
  label: string;
  description: string;
  formula: (data: KPIInputData) => number | null;
  format: KPIFormat;
  business_types: BusinessType[];
  higher_is_better: boolean;
};

/**
 * Input data shape for KPI calculations.
 * All monetary values in pence for precision.
 */
export type KPIInputData = {
  // P&L data
  revenue: number;
  previous_revenue: number;
  cost_of_sales: number;
  operating_expenses: number;
  net_profit: number;
  gross_profit: number;

  // Balance sheet / cash
  cash_position: number;
  accounts_receivable: number;
  accounts_payable: number;
  current_assets: number;
  current_liabilities: number;
  total_debt: number;

  // Operational
  employee_count: number;
  monthly_burn_rate: number;

  // SaaS-specific
  mrr: number;
  previous_mrr: number;
  churned_mrr: number;
  expansion_mrr: number;
  new_customers: number;
  churned_customers: number;
  total_customers: number;
  total_marketing_spend: number;
  average_customer_lifetime_months: number;

  // Ecommerce-specific
  gmv: number;
  total_orders: number;
  repeat_orders: number;
  shipping_costs: number;

  // Services-specific
  billable_hours: number;
  available_hours: number;
  services_revenue: number;
  project_costs: number;
};

/**
 * Create an empty KPI input data object with zero defaults.
 */
export function emptyKPIInputData(): KPIInputData {
  return {
    revenue: 0,
    previous_revenue: 0,
    cost_of_sales: 0,
    operating_expenses: 0,
    net_profit: 0,
    gross_profit: 0,
    cash_position: 0,
    accounts_receivable: 0,
    accounts_payable: 0,
    current_assets: 0,
    current_liabilities: 0,
    total_debt: 0,
    employee_count: 0,
    monthly_burn_rate: 0,
    mrr: 0,
    previous_mrr: 0,
    churned_mrr: 0,
    expansion_mrr: 0,
    new_customers: 0,
    churned_customers: 0,
    total_customers: 0,
    total_marketing_spend: 0,
    average_customer_lifetime_months: 0,
    gmv: 0,
    total_orders: 0,
    repeat_orders: 0,
    shipping_costs: 0,
    billable_hours: 0,
    available_hours: 0,
    services_revenue: 0,
    project_costs: 0,
  };
}

// Helper: safe division to avoid NaN/Infinity
function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

// Helper: round to 4 decimal places
function round4(value: number | null): number | null {
  if (value === null) return null;
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

// === Universal KPIs ===

const universalKPIs: KPIDefinition[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    description: 'Total revenue for the period',
    formula: (d) => d.revenue,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'revenue_growth',
    label: 'Revenue Growth',
    description: 'Period-over-period revenue growth rate',
    formula: (d) => round4(safeDivide(d.revenue - d.previous_revenue, d.previous_revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'gross_margin',
    label: 'Gross Margin',
    description: 'Gross profit as a percentage of revenue',
    formula: (d) => round4(safeDivide(d.gross_profit, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'operating_margin',
    label: 'Operating Margin',
    description: 'Operating profit as a percentage of revenue',
    formula: (d) => round4(safeDivide(d.revenue - d.cost_of_sales - d.operating_expenses, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'net_margin',
    label: 'Net Margin',
    description: 'Net profit as a percentage of revenue',
    formula: (d) => round4(safeDivide(d.net_profit, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'burn_rate',
    label: 'Burn Rate',
    description: 'Monthly cash burn rate',
    formula: (d) => d.monthly_burn_rate,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'cash_runway_months',
    label: 'Cash Runway',
    description: 'Months of cash remaining at current burn rate',
    formula: (d) => {
      if (d.monthly_burn_rate <= 0) return null;
      return Math.round(safeDivide(d.cash_position, d.monthly_burn_rate) ?? 0);
    },
    format: 'months',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'cash_position',
    label: 'Cash Position',
    description: 'Current cash and cash equivalents',
    formula: (d) => d.cash_position,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'ar_days',
    label: 'AR Days',
    description: 'Average days to collect accounts receivable',
    formula: (d) => {
      const dailyRevenue = safeDivide(d.revenue, 30);
      if (dailyRevenue === null) return null;
      return Math.round(safeDivide(d.accounts_receivable, dailyRevenue) ?? 0);
    },
    format: 'days',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'ap_days',
    label: 'AP Days',
    description: 'Average days to pay accounts payable',
    formula: (d) => {
      const dailyCosts = safeDivide(d.cost_of_sales + d.operating_expenses, 30);
      if (dailyCosts === null) return null;
      return Math.round(safeDivide(d.accounts_payable, dailyCosts) ?? 0);
    },
    format: 'days',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'working_capital',
    label: 'Working Capital',
    description: 'Current assets minus current liabilities',
    formula: (d) => d.current_assets - d.current_liabilities,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'revenue_per_employee',
    label: 'Revenue per Employee',
    description: 'Annual revenue divided by headcount',
    formula: (d) => {
      const annualised = d.revenue * 12;
      return round4(safeDivide(annualised, d.employee_count));
    },
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'opex_ratio',
    label: 'OpEx Ratio',
    description: 'Operating expenses as a percentage of revenue',
    formula: (d) => round4(safeDivide(d.operating_expenses, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: false,
  },
];

// === SaaS KPIs ===

const saasKPIs: KPIDefinition[] = [
  {
    key: 'mrr',
    label: 'MRR',
    description: 'Monthly Recurring Revenue',
    formula: (d) => d.mrr,
    format: 'currency',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'arr',
    label: 'ARR',
    description: 'Annual Recurring Revenue (MRR x 12)',
    formula: (d) => d.mrr * 12,
    format: 'currency',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'nrr',
    label: 'Net Revenue Retention',
    description: 'Revenue retained from existing customers including expansion',
    formula: (d) => {
      if (d.previous_mrr === 0) return null;
      return round4(safeDivide(d.previous_mrr - d.churned_mrr + d.expansion_mrr, d.previous_mrr));
    },
    format: 'percentage',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'grr',
    label: 'Gross Revenue Retention',
    description: 'Revenue retained from existing customers excluding expansion',
    formula: (d) => {
      if (d.previous_mrr === 0) return null;
      return round4(safeDivide(d.previous_mrr - d.churned_mrr, d.previous_mrr));
    },
    format: 'percentage',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'cac',
    label: 'CAC',
    description: 'Customer Acquisition Cost',
    formula: (d) => round4(safeDivide(d.total_marketing_spend, d.new_customers)),
    format: 'currency',
    business_types: ['saas'],
    higher_is_better: false,
  },
  {
    key: 'ltv',
    label: 'LTV',
    description: 'Customer Lifetime Value',
    formula: (d) => {
      const arpu = safeDivide(d.mrr, d.total_customers);
      if (arpu === null) return null;
      const grossMargin = safeDivide(d.gross_profit, d.revenue);
      if (grossMargin === null) return null;
      return Math.round(arpu * d.average_customer_lifetime_months * grossMargin);
    },
    format: 'currency',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'ltv_cac_ratio',
    label: 'LTV:CAC',
    description: 'Ratio of customer lifetime value to acquisition cost',
    formula: (d) => {
      const arpu = safeDivide(d.mrr, d.total_customers);
      if (arpu === null) return null;
      const grossMargin = safeDivide(d.gross_profit, d.revenue);
      if (grossMargin === null) return null;
      const ltv = arpu * d.average_customer_lifetime_months * grossMargin;
      const cac = safeDivide(d.total_marketing_spend, d.new_customers);
      if (cac === null) return null;
      return round4(safeDivide(ltv, cac));
    },
    format: 'ratio',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'payback_period',
    label: 'CAC Payback',
    description: 'Months to recover customer acquisition cost',
    formula: (d) => {
      const cac = safeDivide(d.total_marketing_spend, d.new_customers);
      if (cac === null) return null;
      const arpu = safeDivide(d.mrr, d.total_customers);
      if (arpu === null) return null;
      const grossMargin = safeDivide(d.gross_profit, d.revenue);
      if (grossMargin === null) return null;
      const monthlyValue = arpu * grossMargin;
      return Math.round(safeDivide(cac, monthlyValue) ?? 0);
    },
    format: 'months',
    business_types: ['saas'],
    higher_is_better: false,
  },
];

// === Ecommerce KPIs ===

const ecommerceKPIs: KPIDefinition[] = [
  {
    key: 'gmv',
    label: 'GMV',
    description: 'Gross Merchandise Value',
    formula: (d) => d.gmv,
    format: 'currency',
    business_types: ['ecommerce'],
    higher_is_better: true,
  },
  {
    key: 'aov',
    label: 'AOV',
    description: 'Average Order Value',
    formula: (d) => round4(safeDivide(d.gmv, d.total_orders)),
    format: 'currency',
    business_types: ['ecommerce'],
    higher_is_better: true,
  },
  {
    key: 'repeat_purchase_rate',
    label: 'Repeat Purchase Rate',
    description: 'Percentage of orders from returning customers',
    formula: (d) => round4(safeDivide(d.repeat_orders, d.total_orders)),
    format: 'percentage',
    business_types: ['ecommerce'],
    higher_is_better: true,
  },
  {
    key: 'shipping_cost_ratio',
    label: 'Shipping Cost Ratio',
    description: 'Shipping costs as a percentage of GMV',
    formula: (d) => round4(safeDivide(d.shipping_costs, d.gmv)),
    format: 'percentage',
    business_types: ['ecommerce'],
    higher_is_better: false,
  },
];

// === Services KPIs ===

const servicesKPIs: KPIDefinition[] = [
  {
    key: 'utilisation_rate',
    label: 'Utilisation Rate',
    description: 'Billable hours as a percentage of available hours',
    formula: (d) => round4(safeDivide(d.billable_hours, d.available_hours)),
    format: 'percentage',
    business_types: ['services'],
    higher_is_better: true,
  },
  {
    key: 'average_hourly_rate',
    label: 'Avg Hourly Rate',
    description: 'Average revenue per billable hour',
    formula: (d) => round4(safeDivide(d.services_revenue, d.billable_hours)),
    format: 'currency',
    business_types: ['services'],
    higher_is_better: true,
  },
  {
    key: 'project_margin',
    label: 'Project Margin',
    description: 'Project profit as a percentage of project revenue',
    formula: (d) => round4(safeDivide(d.services_revenue - d.project_costs, d.services_revenue)),
    format: 'percentage',
    business_types: ['services'],
    higher_is_better: true,
  },
];

/**
 * All KPI definitions combined.
 */
export const ALL_KPI_DEFINITIONS: KPIDefinition[] = [
  ...universalKPIs,
  ...saasKPIs,
  ...ecommerceKPIs,
  ...servicesKPIs,
];

/**
 * Get KPI definitions for a given business type.
 * Always includes universal KPIs.
 */
export function getKPIsForBusinessType(businessType: BusinessType): KPIDefinition[] {
  return ALL_KPI_DEFINITIONS.filter(
    (kpi) =>
      kpi.business_types.includes('universal') ||
      kpi.business_types.includes(businessType)
  );
}

/**
 * Get a single KPI definition by key.
 */
export function getKPIDefinition(key: string): KPIDefinition | undefined {
  return ALL_KPI_DEFINITIONS.find((kpi) => kpi.key === key);
}
