import type { ModuleDefinition } from '@/types/playbook';

// === Module Definitions ===

const MODULES: ModuleDefinition[] = [
  {
    id: 'mod-health-check',
    slug: 'health-check',
    name: 'Financial Health Check',
    description:
      'Auto-generated financial health assessment with traffic light scoring across profitability, liquidity, efficiency, and growth — benchmarked against sector averages.',
    category: 'financial',
    icon: 'HeartPulse',
    features: [
      'Traffic light scoring across 4 categories',
      'Sector benchmark comparison',
      'AI narrative summary',
      'Top 3 recommended actions',
      'Exportable one-page summary',
    ],
    isActive: false,
  },
  {
    id: 'mod-cash-forecaster',
    slug: 'cash-forecaster',
    name: 'Cash Flow Forecaster',
    description:
      '13-week rolling cash flow projection with burn rate tracking, runway calculator, and configurable alert thresholds.',
    category: 'financial',
    icon: 'TrendingUp',
    features: [
      '13-week rolling projection',
      'Cash runway calculator',
      'Burn rate indicator',
      'Alert threshold configuration',
      'AR/AP pattern analysis',
    ],
    isActive: false,
  },
  {
    id: 'mod-investment-readiness',
    slug: 'investment-readiness',
    name: 'Investment Readiness',
    description:
      'Scored assessment evaluating your readiness for investment across financial health, data quality, growth metrics, and governance.',
    category: 'growth',
    icon: 'Target',
    features: [
      'Scored assessment (0-100)',
      'Gap analysis with actionable items',
      'Investor-ready metrics dashboard',
      'Four evaluation categories',
      'Improvement recommendations',
    ],
    isActive: false,
  },
  {
    id: 'mod-pricing-analyser',
    slug: 'pricing-analyser',
    name: 'Pricing & Margin Analyser',
    description:
      'Analyse your margin profile, test pricing scenarios with what-if modelling, and find your break-even volume.',
    category: 'financial',
    icon: 'Calculator',
    features: [
      'Margin profile by category',
      'What-if pricing slider',
      'Margin trend over time',
      'Break-even volume calculator',
      'Revenue impact modelling',
    ],
    isActive: false,
  },
];

// In-memory activation store (would be DB-backed in production)
const activations = new Map<string, Set<string>>(); // orgId -> Set<moduleId>

// === Registry Functions ===

/**
 * Get all available modules.
 */
export function getAvailableModules(): ModuleDefinition[] {
  return MODULES;
}

/**
 * Get a single module by slug.
 */
export function getModuleBySlug(slug: string): ModuleDefinition | null {
  return MODULES.find((m) => m.slug === slug) ?? null;
}

/**
 * Get a single module by ID.
 */
export function getModuleById(id: string): ModuleDefinition | null {
  return MODULES.find((m) => m.id === id) ?? null;
}

/**
 * Get all modules for an org with activation status.
 */
export function getModulesForOrg(orgId: string): ModuleDefinition[] {
  const orgActivations = activations.get(orgId) ?? new Set();

  return MODULES.map((m) => ({
    ...m,
    isActive: orgActivations.has(m.id),
  }));
}

/**
 * Get only active modules for an org.
 */
export function getActiveModules(orgId: string): ModuleDefinition[] {
  return getModulesForOrg(orgId).filter((m) => m.isActive);
}

/**
 * Activate a module for an org.
 */
export function activateModule(orgId: string, moduleId: string): boolean {
  const mod = getModuleById(moduleId);
  if (!mod) return false;

  if (!activations.has(orgId)) {
    activations.set(orgId, new Set());
  }
  activations.get(orgId)!.add(moduleId);
  return true;
}

/**
 * Deactivate a module for an org.
 */
export function deactivateModule(orgId: string, moduleId: string): boolean {
  const orgActivations = activations.get(orgId);
  if (!orgActivations) return false;
  return orgActivations.delete(moduleId);
}
