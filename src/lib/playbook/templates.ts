import type { PlaybookTemplate, PlaybookDimension, MaturityLevel } from '@/types/playbook';

// === Seed Data: General SME Growth Playbook ===

const financialHealthDimension: PlaybookDimension = {
  id: 'dim-financial-health',
  name: 'Financial Health',
  description: 'Profitability, cash management, and financial sustainability metrics.',
  weight: 0.25,
  kpiKeys: ['gross_margin_pct', 'net_margin_pct', 'cash_runway_months', 'revenue_growth_pct'],
  levels: [
    {
      level: 1,
      label: 'Survival',
      description: 'Negative margins, critical cash position, no growth trajectory.',
      thresholds: {
        gross_margin_pct: { min: -100, max: 20 },
        net_margin_pct: { min: -100, max: -10 },
        cash_runway_months: { min: 0, max: 3 },
        revenue_growth_pct: { min: -100, max: 0 },
      },
    },
    {
      level: 2,
      label: 'Stabilising',
      description: 'Low margins, tight cash, early signs of growth.',
      thresholds: {
        gross_margin_pct: { min: 20, max: 35 },
        net_margin_pct: { min: -10, max: 0 },
        cash_runway_months: { min: 3, max: 6 },
        revenue_growth_pct: { min: 0, max: 10 },
      },
    },
    {
      level: 3,
      label: 'Healthy',
      description: 'Positive margins, adequate cash reserves, steady growth.',
      thresholds: {
        gross_margin_pct: { min: 35, max: 50 },
        net_margin_pct: { min: 0, max: 10 },
        cash_runway_months: { min: 6, max: 12 },
        revenue_growth_pct: { min: 10, max: 20 },
      },
    },
    {
      level: 4,
      label: 'Strong',
      description: 'Strong margins, healthy reserves, accelerating growth.',
      thresholds: {
        gross_margin_pct: { min: 50, max: 65 },
        net_margin_pct: { min: 10, max: 20 },
        cash_runway_months: { min: 12, max: 24 },
        revenue_growth_pct: { min: 20, max: 40 },
      },
    },
    {
      level: 5,
      label: 'Exceptional',
      description: 'Best-in-class margins, robust reserves, sustained high growth.',
      thresholds: {
        gross_margin_pct: { min: 65, max: 100 },
        net_margin_pct: { min: 20, max: 100 },
        cash_runway_months: { min: 24, max: 999 },
        revenue_growth_pct: { min: 40, max: 999 },
      },
    },
  ],
};

const operationsEfficiencyDimension: PlaybookDimension = {
  id: 'dim-operations-efficiency',
  name: 'Operations & Efficiency',
  description: 'Operational efficiency measured through AR/AP days and operating expense ratios.',
  weight: 0.20,
  kpiKeys: ['ar_days', 'ap_days', 'opex_ratio'],
  levels: [
    {
      level: 1,
      label: 'Manual',
      description: 'Poor collections, long payment cycles, high overhead.',
      thresholds: {
        ar_days: { min: 60, max: 999 },
        ap_days: { min: 0, max: 15 },
        opex_ratio: { min: 60, max: 100 },
      },
    },
    {
      level: 2,
      label: 'Reactive',
      description: 'Inconsistent collection, reactive cash management.',
      thresholds: {
        ar_days: { min: 45, max: 60 },
        ap_days: { min: 15, max: 25 },
        opex_ratio: { min: 45, max: 60 },
      },
    },
    {
      level: 3,
      label: 'Managed',
      description: 'Regular invoicing, reasonable payment terms, controlled overhead.',
      thresholds: {
        ar_days: { min: 30, max: 45 },
        ap_days: { min: 25, max: 35 },
        opex_ratio: { min: 30, max: 45 },
      },
    },
    {
      level: 4,
      label: 'Optimised',
      description: 'Efficient collections, strategic payment timing, lean operations.',
      thresholds: {
        ar_days: { min: 15, max: 30 },
        ap_days: { min: 35, max: 50 },
        opex_ratio: { min: 20, max: 30 },
      },
    },
    {
      level: 5,
      label: 'Best-in-class',
      description: 'Rapid collections, optimised payables, minimal overhead.',
      thresholds: {
        ar_days: { min: 0, max: 15 },
        ap_days: { min: 50, max: 90 },
        opex_ratio: { min: 0, max: 20 },
      },
    },
  ],
};

const growthRevenueDimension: PlaybookDimension = {
  id: 'dim-growth-revenue',
  name: 'Growth & Revenue',
  description: 'Revenue growth trajectory and customer concentration risk.',
  weight: 0.25,
  kpiKeys: ['revenue_growth_pct', 'customer_concentration_pct', 'recurring_revenue_pct'],
  levels: [
    {
      level: 1,
      label: 'Declining',
      description: 'Revenue declining, high customer concentration, no recurring revenue.',
      thresholds: {
        revenue_growth_pct: { min: -100, max: 0 },
        customer_concentration_pct: { min: 60, max: 100 },
        recurring_revenue_pct: { min: 0, max: 10 },
      },
    },
    {
      level: 2,
      label: 'Flat',
      description: 'Minimal growth, moderate concentration risk.',
      thresholds: {
        revenue_growth_pct: { min: 0, max: 10 },
        customer_concentration_pct: { min: 40, max: 60 },
        recurring_revenue_pct: { min: 10, max: 25 },
      },
    },
    {
      level: 3,
      label: 'Growing',
      description: 'Steady growth, diversifying customer base.',
      thresholds: {
        revenue_growth_pct: { min: 10, max: 25 },
        customer_concentration_pct: { min: 25, max: 40 },
        recurring_revenue_pct: { min: 25, max: 45 },
      },
    },
    {
      level: 4,
      label: 'Scaling',
      description: 'Strong growth, well-diversified, significant recurring revenue.',
      thresholds: {
        revenue_growth_pct: { min: 25, max: 50 },
        customer_concentration_pct: { min: 15, max: 25 },
        recurring_revenue_pct: { min: 45, max: 65 },
      },
    },
    {
      level: 5,
      label: 'High Growth',
      description: 'Exceptional growth, highly diversified, predominantly recurring.',
      thresholds: {
        revenue_growth_pct: { min: 50, max: 999 },
        customer_concentration_pct: { min: 0, max: 15 },
        recurring_revenue_pct: { min: 65, max: 100 },
      },
    },
  ],
};

const teamCapabilityDimension: PlaybookDimension = {
  id: 'dim-team-capability',
  name: 'Team & Capability',
  description: 'Team productivity, structure, and capacity metrics.',
  weight: 0.15,
  kpiKeys: ['revenue_per_employee', 'team_size', 'has_cfo_or_fd'],
  levels: [
    {
      level: 1,
      label: 'Founder-only',
      description: 'Sole operator, all functions on founder.',
      thresholds: {
        revenue_per_employee: { min: 0, max: 50000 },
        team_size: { min: 0, max: 2 },
        has_cfo_or_fd: { min: 0, max: 0 },
      },
    },
    {
      level: 2,
      label: 'Small team',
      description: 'Small team forming, limited specialisation.',
      thresholds: {
        revenue_per_employee: { min: 50000, max: 80000 },
        team_size: { min: 2, max: 5 },
        has_cfo_or_fd: { min: 0, max: 0 },
      },
    },
    {
      level: 3,
      label: 'Functional',
      description: 'Key roles filled, emerging management structure.',
      thresholds: {
        revenue_per_employee: { min: 80000, max: 120000 },
        team_size: { min: 5, max: 15 },
        has_cfo_or_fd: { min: 0, max: 1 },
      },
    },
    {
      level: 4,
      label: 'Professional',
      description: 'Professional leadership team, clear delegation.',
      thresholds: {
        revenue_per_employee: { min: 120000, max: 180000 },
        team_size: { min: 15, max: 50 },
        has_cfo_or_fd: { min: 1, max: 1 },
      },
    },
    {
      level: 5,
      label: 'Institutional',
      description: 'Full C-suite, high productivity, scalable structure.',
      thresholds: {
        revenue_per_employee: { min: 180000, max: 999999 },
        team_size: { min: 50, max: 9999 },
        has_cfo_or_fd: { min: 1, max: 1 },
      },
    },
  ],
};

const governanceDataDimension: PlaybookDimension = {
  id: 'dim-governance-data',
  name: 'Governance & Data',
  description: 'Data quality, audit trail usage, and governance maturity.',
  weight: 0.15,
  kpiKeys: ['data_completeness_pct', 'audit_trail_active', 'months_of_data'],
  levels: [
    {
      level: 1,
      label: 'Ad hoc',
      description: 'No structured data, no audit trail, sporadic record keeping.',
      thresholds: {
        data_completeness_pct: { min: 0, max: 30 },
        audit_trail_active: { min: 0, max: 0 },
        months_of_data: { min: 0, max: 3 },
      },
    },
    {
      level: 2,
      label: 'Basic',
      description: 'Some structured data, minimal governance processes.',
      thresholds: {
        data_completeness_pct: { min: 30, max: 55 },
        audit_trail_active: { min: 0, max: 1 },
        months_of_data: { min: 3, max: 6 },
      },
    },
    {
      level: 3,
      label: 'Structured',
      description: 'Clean financial data, active audit trail, 6+ months history.',
      thresholds: {
        data_completeness_pct: { min: 55, max: 75 },
        audit_trail_active: { min: 1, max: 1 },
        months_of_data: { min: 6, max: 12 },
      },
    },
    {
      level: 4,
      label: 'Governed',
      description: 'High data quality, full audit coverage, year+ of data.',
      thresholds: {
        data_completeness_pct: { min: 75, max: 90 },
        audit_trail_active: { min: 1, max: 1 },
        months_of_data: { min: 12, max: 24 },
      },
    },
    {
      level: 5,
      label: 'Institutional',
      description: 'Investor-grade data quality, comprehensive governance.',
      thresholds: {
        data_completeness_pct: { min: 90, max: 100 },
        audit_trail_active: { min: 1, max: 1 },
        months_of_data: { min: 24, max: 999 },
      },
    },
  ],
};

// === Seed Templates ===

const GENERAL_SME_PLAYBOOK: PlaybookTemplate = {
  id: 'tpl-general-sme-growth',
  name: 'General SME Growth Playbook',
  description:
    'A comprehensive playbook for small and medium enterprises covering financial health, operations, growth, team capability, and governance maturity.',
  version: '1.0.0',
  dimensions: [
    financialHealthDimension,
    operationsEfficiencyDimension,
    growthRevenueDimension,
    teamCapabilityDimension,
    governanceDataDimension,
  ],
  createdAt: '2024-01-01T00:00:00Z',
};

const ALL_TEMPLATES: PlaybookTemplate[] = [GENERAL_SME_PLAYBOOK];

// === Template Functions ===

/**
 * List all available playbook templates.
 */
export function getTemplates(): PlaybookTemplate[] {
  return ALL_TEMPLATES;
}

/**
 * Get a single playbook template by ID with all dimensions.
 */
export function getTemplate(id: string): PlaybookTemplate | null {
  return ALL_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * Get the maturity label for a given numeric score.
 */
export function getOverallLabel(score: number): string {
  const rounded = Math.round(score) as MaturityLevel;
  const labels: Record<number, string> = {
    1: 'Foundation',
    2: 'Developing',
    3: 'Established',
    4: 'Advanced',
    5: 'Leading',
  };
  return labels[rounded] ?? 'Unknown';
}
