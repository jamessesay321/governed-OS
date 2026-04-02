/**
 * Persona configuration for Advisory OS.
 *
 * Three personas with different default dashboards, KPI selections, and feature access.
 * Used by onboarding to branch the experience, and by the dashboard to show
 * the right defaults for each user type.
 *
 * Source: Blocks.diy & AthenaGen competitive review — both platforms structure
 * offerings by role. Advisory OS does the same but with governed financial depth.
 */

export type UserPersona = 'sme_owner' | 'fractional_cfo' | 'investor';

export interface PersonaConfig {
  persona: UserPersona;
  label: string;
  description: string;
  /** Dashboard layout template ID */
  defaultDashboard: string;
  /** Pre-selected KPI keys. 'all' means full KPI access. */
  defaultKPIs: string[];
  /** Which platform modules are visible to this persona */
  featureAccess: string[];
  /** Onboarding interview focus areas */
  interviewFocus: string[];
  /** Communication style preference for AI outputs */
  communicationStyle: 'plain_english' | 'technical' | 'investor_ready';
}

export const PERSONA_CONFIGS: Record<UserPersona, PersonaConfig> = {
  sme_owner: {
    persona: 'sme_owner',
    label: 'Business Owner',
    description: 'Running a business and want to understand your numbers without the jargon',
    defaultDashboard: 'owner-overview',
    defaultKPIs: [
      'revenue_growth',
      'cash_runway',
      'gross_margin',
      'net_margin',
      'burn_rate',
      'debtor_days',
      'current_ratio',
    ],
    featureAccess: [
      'dashboard',
      'financials',
      'kpis',
      'scenarios',
      'knowledge_vault',
      'ask_grove',
    ],
    interviewFocus: [
      'business_context',
      'goals_and_priorities',
      'cash_flow_concerns',
      'growth_plans',
    ],
    communicationStyle: 'plain_english',
  },

  fractional_cfo: {
    persona: 'fractional_cfo',
    label: 'Fractional CFO / Advisor',
    description: 'Managing multiple clients and need efficient reporting with governance',
    defaultDashboard: 'advisor-multi-client',
    defaultKPIs: ['all'],
    featureAccess: [
      'dashboard',
      'financials',
      'kpis',
      'scenarios',
      'variance',
      'playbooks',
      'board_packs',
      'knowledge_vault',
      'ask_grove',
      'intelligence',
      'health',
      'staging',
      'settings',
    ],
    interviewFocus: [
      'client_portfolio',
      'advisory_methodology',
      'reporting_preferences',
      'key_metrics_per_client',
    ],
    communicationStyle: 'technical',
  },

  investor: {
    persona: 'investor',
    label: 'Investor / Board Member',
    description: 'Need real-time visibility into portfolio companies with minimal noise',
    defaultDashboard: 'portfolio-overview',
    defaultKPIs: [
      'revenue_growth',
      'burn_rate',
      'cash_runway',
      'gross_margin',
      'net_margin',
      'revenue_per_employee',
    ],
    featureAccess: [
      'dashboard',
      'financials',
      'kpis',
      'scenarios_readonly',
      'knowledge_vault_readonly',
      'board_packs_readonly',
    ],
    interviewFocus: [
      'portfolio_scope',
      'reporting_cadence',
      'key_investment_metrics',
    ],
    communicationStyle: 'investor_ready',
  },
};

/**
 * Get the persona config for a given persona type.
 * Falls back to sme_owner if the persona is not recognised.
 */
export function getPersonaConfig(persona: string): PersonaConfig {
  return PERSONA_CONFIGS[persona as UserPersona] ?? PERSONA_CONFIGS.sme_owner;
}

/**
 * Get all persona options for onboarding selection UI.
 */
export function getPersonaOptions(): Array<{ value: UserPersona; label: string; description: string }> {
  return Object.values(PERSONA_CONFIGS).map((c) => ({
    value: c.persona,
    label: c.label,
    description: c.description,
  }));
}
