// === Report System Types ===

export const REPORT_TYPES = ['board_pack', 'monthly_review', 'investor_update', 'custom'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ['draft', 'published'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_SECTION_TYPES = [
  'executive_summary',
  'kpi_summary',
  'pnl',
  'cash_flow',
  'variance',
  'scenarios',
  'intelligence',
  'playbook',
  'action_items',
  'custom',
] as const;
export type ReportSectionType = (typeof REPORT_SECTION_TYPES)[number];

export type ReportSection = {
  id: string;
  type: ReportSectionType;
  title: string;
  data: Record<string, unknown>;
  commentary: string;
  order: number;
};

export type Report = {
  id: string;
  org_id: string;
  report_type: ReportType;
  title: string;
  status: ReportStatus;
  period_start: string;
  period_end: string;
  sections: ReportSection[];
  ai_commentary: string;
  generated_by: string;
  approved_by: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportTemplateSectionConfig = {
  type: ReportSectionType;
  title: string;
  required: boolean;
};

export type ReportTemplate = {
  type: ReportType;
  label: string;
  description: string;
  sections: ReportTemplateSectionConfig[];
};

export type GenerateReportOptions = {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  selectedSections?: ReportSectionType[];
  title?: string;
};
