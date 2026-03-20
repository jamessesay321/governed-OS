/**
 * Interview Recommendations Engine
 * Generates auto-suggested KPIs, dashboard layout, and playbook modules
 * based on the extracted business profile from onboarding interview.
 *
 * Sprint 4: AI Onboarding Interview Enhancement
 */

import { callLLM } from '@/lib/ai/llm';
import type { BusinessContextProfile } from '@/types';
import { ALL_KPI_DEFINITIONS, type BusinessType } from '@/lib/kpi/definitions';
import { DASHBOARD_TEMPLATES, type WidgetType } from '@/lib/dashboard/templates';

export type KPIRecommendation = {
  key: string;
  label: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggested_target?: number;
};

export type DashboardRecommendation = {
  template_id: string;
  template_name: string;
  reason: string;
  additional_widgets: WidgetType[];
};

export type PlaybookRecommendation = {
  module_slug: string;
  module_name: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
};

export type InterviewRecommendations = {
  kpis: KPIRecommendation[];
  dashboard: DashboardRecommendation;
  playbook_modules: PlaybookRecommendation[];
  reasoning: string;
};

const RECOMMENDATION_PROMPT = `You are the Advisory OS recommendation engine. Based on the business profile from an onboarding interview, suggest:

1. **KPIs** (8-15 from the available list) ranked by relevance to this business
2. **Dashboard template** (one of: owner-default, advisor-default, investor-default, bookkeeper-default) + any additional widgets
3. **Playbook modules** (from: health-check, cash-forecaster, investment-readiness, pricing-analyser) ranked by relevance

## Available KPI Keys
${ALL_KPI_DEFINITIONS.map((k) => `- ${k.key}: ${k.label} (${k.business_types.join(', ')})`).join('\n')}

## Available Dashboard Templates
${DASHBOARD_TEMPLATES.map((t) => `- ${t.id}: ${t.name} — ${t.description}`).join('\n')}

## Available Playbook Modules
- health-check: Financial Health Check — comprehensive diagnostic of business health
- cash-forecaster: Cash Forecaster — 13-week cash flow projection and runway analysis
- investment-readiness: Investment Readiness — assess readiness for fundraising or exit
- pricing-analyser: Pricing Analyser — margin analysis and pricing optimisation

## Rules
- Respond with valid JSON ONLY — no markdown, no explanations outside JSON.
- Always include universal KPIs (revenue, gross_margin, net_margin, cash_runway_months).
- Add business-type-specific KPIs based on the profile (SaaS → MRR/NRR/CAC, services → utilisation, ecommerce → GMV/AOV).
- Suggest targets only when you have enough context from the profile.
- Dashboard template should match the primary user role described in the profile.
- Playbook modules should address the challenges and goals mentioned in the interview.

## Output JSON Schema
{
  "kpis": [
    {
      "key": "string (must be from available list)",
      "label": "string",
      "reason": "string (1-100 chars)",
      "priority": "high | medium | low",
      "suggested_target": number | null
    }
  ],
  "dashboard": {
    "template_id": "string (must be from available list)",
    "template_name": "string",
    "reason": "string (1-150 chars)",
    "additional_widgets": ["widget_type"]
  },
  "playbook_modules": [
    {
      "module_slug": "string (must be from available list)",
      "module_name": "string",
      "reason": "string (1-100 chars)",
      "priority": "high | medium | low"
    }
  ],
  "reasoning": "string (1-300 chars) — overall rationale for recommendations"
}`;

function buildProfileSummary(profile: Partial<BusinessContextProfile>): string {
  const parts: string[] = [];

  if (profile.industry) parts.push(`Industry: ${profile.industry}`);
  if (profile.business_stage) parts.push(`Stage: ${profile.business_stage}`);
  if (profile.revenue_model) parts.push(`Revenue model: ${profile.revenue_model}`);
  if (profile.revenue_streams?.length) parts.push(`Revenue streams: ${profile.revenue_streams.join(', ')}`);
  if (profile.team_size) parts.push(`Team size: ${profile.team_size}`);
  if (profile.team_structure) parts.push(`Team structure: ${profile.team_structure}`);
  if (profile.twelve_month_goals?.length) parts.push(`Goals: ${profile.twelve_month_goals.join('; ')}`);
  if (profile.biggest_challenges?.length) parts.push(`Challenges: ${profile.biggest_challenges.join('; ')}`);
  if (profile.success_definition) parts.push(`Success definition: ${profile.success_definition}`);
  if (profile.risk_tolerance) parts.push(`Risk tolerance: ${profile.risk_tolerance}`);
  if (profile.target_revenue_growth != null) parts.push(`Target revenue growth: ${profile.target_revenue_growth}%`);
  if (profile.target_gross_margin != null) parts.push(`Target gross margin: ${profile.target_gross_margin}%`);
  if (profile.target_net_margin != null) parts.push(`Target net margin: ${profile.target_net_margin}%`);
  if (profile.runway_requirement_months != null) parts.push(`Runway requirement: ${profile.runway_requirement_months} months`);
  if (profile.customer_concentration_risk) parts.push(`Customer concentration risk: ${profile.customer_concentration_risk}`);
  if (profile.competitive_positioning) parts.push(`Competitive positioning: ${profile.competitive_positioning}`);

  return parts.join('\n');
}

/**
 * Generate KPI, dashboard, and playbook recommendations from the business profile.
 * Uses Claude API to intelligently match profile to available options.
 */
export async function generateRecommendations(
  profile: Partial<BusinessContextProfile>
): Promise<InterviewRecommendations> {
  const profileSummary = buildProfileSummary(profile);

  const rawResponse = await callLLM({
    systemPrompt: RECOMMENDATION_PROMPT,
    userMessage: `Business Profile:\n${profileSummary}`,
    temperature: 0.2,
  });

  // Extract JSON
  const fenceMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : rawResponse.match(/\{[\s\S]*\}/)?.[0] ?? rawResponse;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      kpis: validateKPIRecommendations(parsed.kpis ?? []),
      dashboard: validateDashboardRecommendation(parsed.dashboard ?? {}),
      playbook_modules: validatePlaybookRecommendations(parsed.playbook_modules ?? []),
      reasoning: String(parsed.reasoning ?? 'Recommendations based on business profile.'),
    };
  } catch {
    // Return sensible defaults if AI parsing fails
    return getDefaultRecommendations();
  }
}

function validateKPIRecommendations(kpis: unknown[]): KPIRecommendation[] {
  const validKeys = new Set(ALL_KPI_DEFINITIONS.map((k) => k.key));
  return (kpis as KPIRecommendation[])
    .filter((k) => validKeys.has(k.key))
    .map((k) => ({
      key: k.key,
      label: k.label || ALL_KPI_DEFINITIONS.find((d) => d.key === k.key)?.label || k.key,
      reason: String(k.reason || ''),
      priority: ['high', 'medium', 'low'].includes(k.priority) ? k.priority : 'medium',
      suggested_target: typeof k.suggested_target === 'number' ? k.suggested_target : undefined,
    }));
}

function validateDashboardRecommendation(dashboard: Record<string, unknown>): DashboardRecommendation {
  const validTemplates = new Set(DASHBOARD_TEMPLATES.map((t) => t.id));
  const templateId = validTemplates.has(String(dashboard.template_id))
    ? String(dashboard.template_id)
    : 'owner-default';

  return {
    template_id: templateId,
    template_name: String(dashboard.template_name || 'Business Owner'),
    reason: String(dashboard.reason || 'Default dashboard for business owners.'),
    additional_widgets: Array.isArray(dashboard.additional_widgets) ? dashboard.additional_widgets : [],
  };
}

function validatePlaybookRecommendations(modules: unknown[]): PlaybookRecommendation[] {
  const validSlugs = new Set(['health-check', 'cash-forecaster', 'investment-readiness', 'pricing-analyser']);
  return (modules as PlaybookRecommendation[])
    .filter((m) => validSlugs.has(m.module_slug))
    .map((m) => ({
      module_slug: m.module_slug,
      module_name: String(m.module_name || m.module_slug),
      reason: String(m.reason || ''),
      priority: ['high', 'medium', 'low'].includes(m.priority) ? m.priority : 'medium',
    }));
}

function getDefaultRecommendations(): InterviewRecommendations {
  return {
    kpis: [
      { key: 'revenue', label: 'Revenue', reason: 'Core metric for all businesses', priority: 'high' },
      { key: 'gross_margin', label: 'Gross Margin', reason: 'Measures core profitability', priority: 'high' },
      { key: 'net_margin', label: 'Net Margin', reason: 'Bottom line health', priority: 'high' },
      { key: 'cash_runway_months', label: 'Cash Runway', reason: 'Survival metric', priority: 'high' },
      { key: 'revenue_growth', label: 'Revenue Growth', reason: 'Growth trajectory', priority: 'high' },
      { key: 'burn_rate', label: 'Burn Rate', reason: 'Cash consumption rate', priority: 'medium' },
      { key: 'ar_days', label: 'AR Days', reason: 'Collection efficiency', priority: 'medium' },
      { key: 'working_capital', label: 'Working Capital', reason: 'Short-term liquidity', priority: 'medium' },
      { key: 'opex_ratio', label: 'OpEx Ratio', reason: 'Operating efficiency', priority: 'medium' },
      { key: 'revenue_per_employee', label: 'Revenue per Employee', reason: 'Team productivity', priority: 'low' },
    ],
    dashboard: {
      template_id: 'owner-default',
      template_name: 'Business Owner',
      reason: 'Default dashboard with full financial overview.',
      additional_widgets: [],
    },
    playbook_modules: [
      { module_slug: 'health-check', module_name: 'Financial Health Check', reason: 'Essential diagnostic for all businesses', priority: 'high' },
      { module_slug: 'cash-forecaster', module_name: 'Cash Forecaster', reason: 'Cash flow visibility', priority: 'high' },
    ],
    reasoning: 'Default recommendations — insufficient profile data for personalised suggestions.',
  };
}
