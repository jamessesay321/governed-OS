import type { ReportTemplate } from '@/types/reports';

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    type: 'board_pack',
    label: 'Board Pack',
    description:
      'Comprehensive board-level report with executive summary, KPIs, financials, scenarios, intelligence, and action items.',
    sections: [
      { type: 'executive_summary', title: 'Executive Summary', required: true },
      { type: 'kpi_summary', title: 'KPI Dashboard', required: true },
      { type: 'pnl', title: 'Profit & Loss Summary', required: true },
      { type: 'cash_flow', title: 'Cash Flow', required: true },
      { type: 'variance', title: 'Variance Analysis', required: false },
      { type: 'scenarios', title: 'Scenario Analysis', required: false },
      { type: 'intelligence', title: 'Intelligence Briefing', required: false },
      { type: 'playbook', title: 'Playbook Progress', required: false },
      { type: 'action_items', title: 'Action Items', required: true },
    ],
  },
  {
    type: 'monthly_review',
    label: 'Monthly Review',
    description:
      'Concise monthly performance review covering KPIs, P&L vs budget, cash position, and key risks.',
    sections: [
      { type: 'executive_summary', title: 'Executive Summary', required: true },
      { type: 'kpi_summary', title: 'KPI Summary', required: true },
      { type: 'pnl', title: 'P&L vs Budget', required: true },
      { type: 'cash_flow', title: 'Cash Position', required: true },
      { type: 'variance', title: 'Key Risks & Variances', required: false },
    ],
  },
  {
    type: 'investor_update',
    label: 'Investor Update',
    description:
      'Investor-facing report with financial highlights, growth metrics, cash runway, and market position.',
    sections: [
      { type: 'executive_summary', title: 'Financial Highlights', required: true },
      { type: 'kpi_summary', title: 'Growth Metrics', required: true },
      { type: 'cash_flow', title: 'Cash Runway', required: true },
      { type: 'intelligence', title: 'Market Position', required: false },
    ],
  },
  {
    type: 'custom',
    label: 'Custom Report',
    description: 'Build a custom report by selecting individual sections.',
    sections: [
      { type: 'executive_summary', title: 'Executive Summary', required: false },
      { type: 'kpi_summary', title: 'KPI Summary', required: false },
      { type: 'pnl', title: 'Profit & Loss', required: false },
      { type: 'cash_flow', title: 'Cash Flow', required: false },
      { type: 'variance', title: 'Variance Analysis', required: false },
      { type: 'scenarios', title: 'Scenario Analysis', required: false },
      { type: 'intelligence', title: 'Intelligence Briefing', required: false },
      { type: 'playbook', title: 'Playbook Progress', required: false },
      { type: 'action_items', title: 'Action Items', required: false },
    ],
  },
];

export function getTemplate(type: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find((t) => t.type === type);
}
