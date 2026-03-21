/* Agent ↔ Module relationship map */

interface AgentModuleRelation {
  agentSlug: string;
  modules: string[];
}

const AGENT_MODULE_MAP: AgentModuleRelation[] = [
  { agentSlug: 'setup', modules: ['budget-manager', 'chart-of-accounts', 'data-quality-monitor'] },
  { agentSlug: 'finance', modules: ['cash-forecaster', 'health-check', 'tax-planner'] },
  { agentSlug: 'marketing', modules: ['lead-scorer', 'campaign-analytics', 'seo-optimizer'] },
  { agentSlug: 'project-management', modules: ['scorecard', 'resource-planner', 'milestone-tracker'] },
  { agentSlug: 'strategy', modules: ['investment-readiness', 'market-analyser', 'board-pack-builder'] },
  { agentSlug: 'secretarial', modules: ['compliance-calendar', 'contract-manager', 'filing-tracker'] },
];

export function getModulesForAgent(slug: string): string[] {
  return AGENT_MODULE_MAP.find((r) => r.agentSlug === slug)?.modules ?? [];
}

export function getAgentForModule(moduleSlug: string): string | undefined {
  return AGENT_MODULE_MAP.find((r) => r.modules.includes(moduleSlug))?.agentSlug;
}
