// === Report Template Engine ===
// Structured configurations for Fathom-quality management reports.

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | 'management_pack'
    | 'board_pack'
    | 'investor_update'
    | 'bank_covenant'
    | 'monthly_review';
  sections: ReportSectionConfig[];
  defaultFrequency: 'monthly' | 'quarterly' | 'annual';
}

export interface ReportSectionConfig {
  id: string;
  type:
    | 'narrative'
    | 'kpi_grid'
    | 'chart'
    | 'table'
    | 'comparison'
    | 'separator'
    | 'custom_text';
  title: string;
  config: Record<string, unknown>;
  // For narrative: { prompt: string, maxWords: number }
  // For kpi_grid: { kpis: string[], columns: 2|3|4 }
  // For chart: { chartType: 'line'|'bar'|'pie', metric: string, periods: number }
  // For table: { dataSource: string, columns: string[] }
  // For comparison: { period1: string, period2: string, metrics: string[] }
}

// ---------------------------------------------------------------------------
// Default templates
// ---------------------------------------------------------------------------

export const BUILDER_TEMPLATES: ReportTemplate[] = [
  // 1. Monthly Management Pack
  {
    id: 'monthly_management_pack',
    name: 'Monthly Management Pack',
    description:
      'Complete monthly management report with executive summary, KPI dashboard, P&L, cash position, and forward outlook.',
    category: 'management_pack',
    defaultFrequency: 'monthly',
    sections: [
      {
        id: 'mmp_exec_summary',
        type: 'narrative',
        title: 'Executive Summary',
        config: {
          prompt:
            'Write a concise executive summary for the monthly management pack. Cover headline revenue, profitability, cash position, and any material events. Keep language professional and board-ready.',
          maxWords: 200,
        },
      },
      {
        id: 'mmp_kpi_dashboard',
        type: 'kpi_grid',
        title: 'KPI Dashboard',
        config: {
          kpis: ['revenue', 'gross_margin', 'net_profit', 'operating_expenses', 'headcount', 'burn_rate'],
          columns: 3,
        },
      },
      {
        id: 'mmp_pnl_summary',
        type: 'table',
        title: 'P&L Summary',
        config: {
          dataSource: 'pnl',
          columns: ['account', 'actual', 'budget', 'variance'],
        },
      },
      {
        id: 'mmp_pnl_comparison',
        type: 'comparison',
        title: 'P&L vs Prior Month',
        config: {
          period1: 'current',
          period2: 'prior_month',
          metrics: ['revenue', 'cost_of_sales', 'gross_profit', 'operating_expenses', 'net_profit'],
        },
      },
      {
        id: 'mmp_key_movements',
        type: 'narrative',
        title: 'Key Movements',
        config: {
          prompt:
            'Identify and explain the key financial movements this month compared to prior month and budget. Highlight any material variances exceeding 10%.',
          maxWords: 250,
        },
      },
      {
        id: 'mmp_cash_position',
        type: 'kpi_grid',
        title: 'Cash Position',
        config: {
          kpis: ['closing_cash', 'cash_inflow', 'cash_outflow', 'runway_months'],
          columns: 4,
        },
      },
      {
        id: 'mmp_outlook',
        type: 'narrative',
        title: 'Outlook',
        config: {
          prompt:
            'Provide a forward-looking outlook for the next 1-3 months based on current trends, pipeline, and known commitments. Flag any risks or opportunities.',
          maxWords: 200,
        },
      },
    ],
  },

  // 2. Board Pack
  {
    id: 'board_pack',
    name: 'Board Pack',
    description:
      'Comprehensive board-level report with financial dashboard, revenue and cost analysis, cash flow, and strategic outlook.',
    category: 'board_pack',
    defaultFrequency: 'quarterly',
    sections: [
      {
        id: 'bp_highlights',
        type: 'narrative',
        title: 'Business Highlights',
        config: {
          prompt:
            'Write a board-ready business highlights section. Summarise key achievements, challenges, and strategic progress for the period. Use a professional tone suitable for non-executive directors.',
          maxWords: 300,
        },
      },
      {
        id: 'bp_financial_dashboard',
        type: 'kpi_grid',
        title: 'Financial Dashboard',
        config: {
          kpis: [
            'revenue',
            'gross_margin',
            'ebitda',
            'net_profit',
            'cash_balance',
            'revenue_growth',
            'burn_rate',
            'runway_months',
          ],
          columns: 4,
        },
      },
      {
        id: 'bp_revenue_chart',
        type: 'chart',
        title: 'Revenue Analysis',
        config: { chartType: 'bar', metric: 'revenue', periods: 12 },
      },
      {
        id: 'bp_revenue_table',
        type: 'table',
        title: 'Revenue Breakdown',
        config: {
          dataSource: 'revenue_breakdown',
          columns: ['stream', 'current', 'prior', 'change_pct'],
        },
      },
      {
        id: 'bp_cost_analysis',
        type: 'chart',
        title: 'Cost Analysis',
        config: { chartType: 'bar', metric: 'expenses', periods: 12 },
      },
      {
        id: 'bp_cash_flow',
        type: 'chart',
        title: 'Cash Flow',
        config: { chartType: 'line', metric: 'cash_balance', periods: 12 },
      },
      {
        id: 'bp_risks',
        type: 'narrative',
        title: 'Risks and Opportunities',
        config: {
          prompt:
            'Identify the top 3-5 risks and opportunities facing the business. For each, provide a brief description and recommended action.',
          maxWords: 300,
        },
      },
      {
        id: 'bp_next_quarter',
        type: 'narrative',
        title: 'Next Quarter Outlook',
        config: {
          prompt:
            'Provide a strategic outlook for the coming quarter. Cover expected revenue trajectory, planned investments, hiring plans, and key milestones.',
          maxWords: 250,
        },
      },
    ],
  },

  // 3. Investor Update
  {
    id: 'investor_update',
    name: 'Investor Update',
    description:
      'Quarterly investor update with key metrics, revenue growth, burn rate, milestones, and support requests.',
    category: 'investor_update',
    defaultFrequency: 'quarterly',
    sections: [
      {
        id: 'iu_highlights',
        type: 'narrative',
        title: 'Quarter Highlights',
        config: {
          prompt:
            'Write a compelling quarterly update for investors. Lead with the biggest wins, then cover key metrics movement. Keep the tone confident but honest.',
          maxWords: 250,
        },
      },
      {
        id: 'iu_key_metrics',
        type: 'kpi_grid',
        title: 'Key Metrics',
        config: {
          kpis: ['arr', 'mrr', 'revenue_growth', 'gross_margin', 'net_retention', 'customers'],
          columns: 3,
        },
      },
      {
        id: 'iu_revenue_growth',
        type: 'chart',
        title: 'Revenue Growth',
        config: { chartType: 'line', metric: 'revenue', periods: 12 },
      },
      {
        id: 'iu_burn_runway',
        type: 'kpi_grid',
        title: 'Burn and Runway',
        config: {
          kpis: ['monthly_burn', 'cash_balance', 'runway_months', 'ltv_cac_ratio'],
          columns: 4,
        },
      },
      {
        id: 'iu_milestones',
        type: 'custom_text',
        title: 'Milestones',
        config: {
          placeholder: 'List key milestones achieved this quarter and upcoming targets...',
        },
      },
      {
        id: 'iu_ask',
        type: 'custom_text',
        title: 'Ask / Support Needed',
        config: {
          placeholder: 'Describe any introductions, partnerships, or support needed from investors...',
        },
      },
    ],
  },

  // 4. Bank Covenant Report
  {
    id: 'bank_covenant',
    name: 'Bank Covenant Report',
    description:
      'Structured covenant compliance report with financial ratios, trend analysis, and management commentary.',
    category: 'bank_covenant',
    defaultFrequency: 'quarterly',
    sections: [
      {
        id: 'bc_covenant_summary',
        type: 'table',
        title: 'Covenant Summary',
        config: {
          dataSource: 'covenants',
          columns: ['covenant', 'required', 'actual', 'status'],
        },
      },
      {
        id: 'bc_financial_ratios',
        type: 'kpi_grid',
        title: 'Financial Ratios',
        config: {
          kpis: [
            'current_ratio',
            'debt_to_equity',
            'interest_coverage',
            'dscr',
            'quick_ratio',
            'leverage_ratio',
          ],
          columns: 3,
        },
      },
      {
        id: 'bc_trend_analysis',
        type: 'chart',
        title: 'Trend Analysis',
        config: { chartType: 'line', metric: 'key_ratios', periods: 8 },
      },
      {
        id: 'bc_commentary',
        type: 'narrative',
        title: 'Commentary',
        config: {
          prompt:
            'Write management commentary for the bank covenant report. Address compliance status, any covenant headroom concerns, and outlook for continued compliance.',
          maxWords: 250,
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getBuilderTemplate(id: string): ReportTemplate | undefined {
  return BUILDER_TEMPLATES.find((t) => t.id === id);
}

export function getBuilderTemplatesByCategory(
  category: ReportTemplate['category']
): ReportTemplate[] {
  return BUILDER_TEMPLATES.filter((t) => t.category === category);
}

/** All available section types that can be added to a custom report. */
export const AVAILABLE_SECTION_TYPES: {
  type: ReportSectionConfig['type'];
  label: string;
  description: string;
}[] = [
  { type: 'narrative', label: 'Narrative', description: 'AI-generated written commentary' },
  { type: 'kpi_grid', label: 'KPI Grid', description: 'Grid of key performance indicators' },
  { type: 'chart', label: 'Chart', description: 'Visual chart (line, bar, or pie)' },
  { type: 'table', label: 'Data Table', description: 'Structured data table' },
  { type: 'comparison', label: 'Period Comparison', description: 'Side-by-side period comparison' },
  { type: 'separator', label: 'Separator', description: 'Visual section divider' },
  { type: 'custom_text', label: 'Custom Text', description: 'Free-form editable text block' },
];
