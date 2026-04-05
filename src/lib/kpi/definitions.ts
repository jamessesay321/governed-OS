/**
 * KPI Definitions — deterministic calculation functions per business type.
 * All financial math is pure TypeScript, no AI involved.
 */

export type KPIFormat = 'currency' | 'percentage' | 'months' | 'ratio' | 'number' | 'days';
export type BusinessType = 'universal' | 'saas' | 'ecommerce' | 'services' | 'fashion';

export type KPIDefinition = {
  key: string;
  label: string;
  description: string;
  /** One-liner a non-finance business owner can immediately understand */
  plainEnglish: string;
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
    plainEnglish: 'How much money came in this month',
    formula: (d) => d.revenue,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'revenue_growth',
    label: 'Revenue Growth',
    description: 'Period-over-period revenue growth rate',
    plainEnglish: 'Is the business earning more or less than last month?',
    formula: (d) => round4(safeDivide(d.revenue - d.previous_revenue, d.previous_revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'gross_margin',
    label: 'Gross Margin',
    description: 'Gross profit as a percentage of revenue',
    plainEnglish: 'How much you keep from each pound after paying for what you sell',
    formula: (d) => round4(safeDivide(d.gross_profit, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'operating_margin',
    label: 'Operating Margin',
    description: 'Operating profit as a percentage of revenue',
    plainEnglish: 'How much you keep after paying for everything to run the business',
    formula: (d) => round4(safeDivide(d.revenue - d.cost_of_sales - d.operating_expenses, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'net_margin',
    label: 'Net Margin',
    description: 'Net profit as a percentage of revenue',
    plainEnglish: 'The actual profit you take home from every pound earned',
    formula: (d) => round4(safeDivide(d.net_profit, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'burn_rate',
    label: 'Burn Rate',
    description: 'Monthly cash burn rate',
    plainEnglish: 'How much cash the business uses each month beyond what it earns',
    formula: (d) => d.monthly_burn_rate,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'cash_runway_months',
    label: 'Cash Runway',
    description: 'Months of cash remaining at current burn rate',
    plainEnglish: 'How many months until the cash runs out at this rate',
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
    plainEnglish: 'How much cash is in the bank right now',
    formula: (d) => d.cash_position,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'ar_days',
    label: 'AR Days',
    description: 'Average days to collect accounts receivable',
    plainEnglish: 'How long it takes customers to pay you, on average',
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
    plainEnglish: 'How long you take to pay your suppliers, on average',
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
    plainEnglish: 'The cash cushion available to cover day-to-day bills',
    formula: (d) => d.current_assets - d.current_liabilities,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'revenue_per_employee',
    label: 'Revenue per Employee',
    description: 'Annual revenue divided by headcount',
    plainEnglish: 'How much revenue each person in the team generates per year',
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
    plainEnglish: 'What share of your income goes to running costs',
    formula: (d) => round4(safeDivide(d.operating_expenses, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'current_ratio',
    label: 'Current Ratio',
    description: 'Current assets divided by current liabilities — measures short-term liquidity',
    plainEnglish: 'Can you cover your short-term debts with what you have? Above 1.0 is healthy',
    formula: (d) => round4(safeDivide(d.current_assets, d.current_liabilities)),
    format: 'ratio',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'quick_ratio',
    label: 'Quick Ratio',
    description: 'Cash plus receivables divided by current liabilities — acid test of liquidity',
    plainEnglish: 'Could you pay all bills today using only cash and money owed to you?',
    formula: (d) => round4(safeDivide(d.cash_position + d.accounts_receivable, d.current_liabilities)),
    format: 'ratio',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'debt_to_equity',
    label: 'Debt to Equity',
    description: 'Total debt divided by equity (approximated as assets minus liabilities)',
    plainEnglish: 'How much the business relies on borrowed money vs its own resources',
    formula: (d) => {
      const equity = d.current_assets - d.current_liabilities;
      if (equity <= 0) return null;
      return round4(safeDivide(d.total_debt, equity));
    },
    format: 'ratio',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'ebitda',
    label: 'EBITDA',
    description: 'Earnings before interest, taxes, depreciation and amortisation',
    plainEnglish: 'The core operating profit, ignoring accounting and tax adjustments',
    formula: (d) => d.revenue - d.cost_of_sales - d.operating_expenses,
    format: 'currency',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'ebitda_margin',
    label: 'EBITDA Margin',
    description: 'EBITDA as a percentage of revenue',
    plainEnglish: 'What percentage of revenue turns into core operating profit',
    formula: (d) => {
      const ebitda = d.revenue - d.cost_of_sales - d.operating_expenses;
      return round4(safeDivide(ebitda, d.revenue));
    },
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: true,
  },
  {
    key: 'cash_conversion_cycle',
    label: 'Cash Conversion Cycle',
    description: 'AR Days + Inventory Days - AP Days — how quickly cash cycles through the business',
    plainEnglish: 'How many days between paying your suppliers and getting paid by customers',
    formula: (d) => {
      const dailyRevenue = safeDivide(d.revenue, 30);
      const dailyCosts = safeDivide(d.cost_of_sales + d.operating_expenses, 30);
      if (dailyRevenue === null || dailyCosts === null) return null;
      const arDays = safeDivide(d.accounts_receivable, dailyRevenue) ?? 0;
      const apDays = safeDivide(d.accounts_payable, dailyCosts) ?? 0;
      return Math.round(arDays - apDays);
    },
    format: 'days',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'cost_of_revenue_ratio',
    label: 'Cost of Revenue Ratio',
    description: 'Cost of sales as a percentage of revenue',
    plainEnglish: 'How much of every pound goes straight to delivering what you sell',
    formula: (d) => round4(safeDivide(d.cost_of_sales, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'employee_cost_ratio',
    label: 'Employee Cost Ratio',
    description: 'Staff costs as a percentage of revenue (approx from operating expenses)',
    plainEnglish: 'How much of your income goes to paying the team',
    formula: (d) => round4(safeDivide(d.operating_expenses * 0.6, d.revenue)),
    format: 'percentage',
    business_types: ['universal'],
    higher_is_better: false,
  },

  // ── UK Compliance-Aware KPIs ──────────────────────────────────────

  {
    key: 'vat_threshold_proximity',
    label: 'VAT Threshold Proximity',
    description: 'Annualised revenue vs the £90,000 UK VAT registration threshold. Returns 1.0 when at threshold.',
    plainEnglish: 'How close you are to needing to register for VAT (1.0 = at threshold, above = must register)',
    formula: (d) => {
      // Revenue values are in pence, threshold in pounds
      const annualisedRevenue = (d.revenue * 12) / 100;
      if (annualisedRevenue <= 0) return null;
      return round4(safeDivide(annualisedRevenue, 90_000));
    },
    format: 'ratio',
    business_types: ['universal'],
    higher_is_better: false,
  },
  {
    key: 'going_concern_ratio',
    label: 'Going Concern Ratio',
    description: 'Current ratio as a going concern indicator (ISA 570). Below 1.0 signals liquidity risk.',
    plainEnglish: 'Can the business pay its short-term bills? Below 1.0 is a red flag for going concern',
    formula: (d) => {
      if (d.current_liabilities <= 0) return null;
      return round4(safeDivide(d.current_assets, d.current_liabilities));
    },
    format: 'ratio',
    business_types: ['universal'],
    higher_is_better: true,
  },
];

// === SaaS KPIs ===

const saasKPIs: KPIDefinition[] = [
  {
    key: 'mrr',
    label: 'MRR',
    description: 'Monthly Recurring Revenue',
    plainEnglish: 'The predictable subscription income you can count on each month',
    formula: (d) => d.mrr,
    format: 'currency',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'arr',
    label: 'ARR',
    description: 'Annual Recurring Revenue (MRR x 12)',
    plainEnglish: 'Your yearly subscription run rate if nothing changed',
    formula: (d) => d.mrr * 12,
    format: 'currency',
    business_types: ['saas'],
    higher_is_better: true,
  },
  {
    key: 'nrr',
    label: 'Net Revenue Retention',
    description: 'Revenue retained from existing customers including expansion',
    plainEnglish: 'Are existing customers spending more or less than before? Over 100% is great',
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
    plainEnglish: 'How much existing subscription revenue you kept (ignoring upsells)',
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
    plainEnglish: 'How much it costs to win one new customer',
    formula: (d) => round4(safeDivide(d.total_marketing_spend, d.new_customers)),
    format: 'currency',
    business_types: ['saas'],
    higher_is_better: false,
  },
  {
    key: 'ltv',
    label: 'LTV',
    description: 'Customer Lifetime Value',
    plainEnglish: 'How much profit a typical customer brings over their entire relationship',
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
    plainEnglish: 'For every pound spent getting a customer, how many pounds do you earn back? 3x+ is healthy',
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
    plainEnglish: 'How many months until a new customer pays for themselves',
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
    plainEnglish: 'The total value of everything sold through your store',
    formula: (d) => d.gmv,
    format: 'currency',
    business_types: ['ecommerce'],
    higher_is_better: true,
  },
  {
    key: 'aov',
    label: 'AOV',
    description: 'Average Order Value',
    plainEnglish: 'How much a typical customer spends per order',
    formula: (d) => round4(safeDivide(d.gmv, d.total_orders)),
    format: 'currency',
    business_types: ['ecommerce'],
    higher_is_better: true,
  },
  {
    key: 'repeat_purchase_rate',
    label: 'Repeat Purchase Rate',
    description: 'Percentage of orders from returning customers',
    plainEnglish: 'How many orders come from customers who have bought before',
    formula: (d) => round4(safeDivide(d.repeat_orders, d.total_orders)),
    format: 'percentage',
    business_types: ['ecommerce'],
    higher_is_better: true,
  },
  {
    key: 'shipping_cost_ratio',
    label: 'Shipping Cost Ratio',
    description: 'Shipping costs as a percentage of GMV',
    plainEnglish: 'How much of each sale goes to shipping and delivery',
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
    plainEnglish: 'What percentage of your team\'s time is being billed to clients',
    formula: (d) => round4(safeDivide(d.billable_hours, d.available_hours)),
    format: 'percentage',
    business_types: ['services'],
    higher_is_better: true,
  },
  {
    key: 'average_hourly_rate',
    label: 'Avg Hourly Rate',
    description: 'Average revenue per billable hour',
    plainEnglish: 'How much you earn for each hour of client work',
    formula: (d) => round4(safeDivide(d.services_revenue, d.billable_hours)),
    format: 'currency',
    business_types: ['services'],
    higher_is_better: true,
  },
  {
    key: 'project_margin',
    label: 'Project Margin',
    description: 'Project profit as a percentage of project revenue',
    plainEnglish: 'How much profit you make on each project after paying for delivery',
    formula: (d) => round4(safeDivide(d.services_revenue - d.project_costs, d.services_revenue)),
    format: 'percentage',
    business_types: ['services'],
    higher_is_better: true,
  },
];

// === Fashion / Luxury KPIs ===
// These are placeholder definitions for the KPI engine; actual product-level
// KPIs are calculated by the Product Intelligence layer (industry-kpis.ts)
// using line-item data. These definitions allow the engine to include
// fashion-specific financial ratios that don't require line-item parsing.

const fashionKPIs: KPIDefinition[] = [
  {
    key: 'cogs_material_ratio',
    label: 'Material Cost Ratio',
    description: 'Cost of sales (materials) as a percentage of revenue',
    plainEnglish: 'How much of each pound goes to fabrics, materials, and direct costs',
    formula: (d) => round4(safeDivide(d.cost_of_sales, d.revenue)),
    format: 'percentage',
    business_types: ['fashion'],
    higher_is_better: false,
  },
  {
    key: 'opex_to_revenue',
    label: 'Studio Cost Ratio',
    description: 'Operating expenses as a percentage of revenue',
    plainEnglish: 'How much of your revenue goes to running the studio and business',
    formula: (d) => round4(safeDivide(d.operating_expenses, d.revenue)),
    format: 'percentage',
    business_types: ['fashion'],
    higher_is_better: false,
  },
  {
    key: 'revenue_per_head',
    label: 'Revenue per Team Member',
    description: 'Revenue divided by employee count',
    plainEnglish: 'How much revenue each team member generates',
    formula: (d) => {
      if (d.employee_count === 0) return null;
      return round4(safeDivide(d.revenue, d.employee_count));
    },
    format: 'currency',
    business_types: ['fashion'],
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
  ...fashionKPIs,
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
