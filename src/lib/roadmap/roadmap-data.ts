/* Activation Roadmap — step definitions + merge logic */

/* ─── Types ─── */

export type StepStatus = 'completed' | 'in_progress' | 'locked' | 'available';

export interface StepDefinition {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  category: 'essential' | 'recommended' | 'advanced';
  requiredSteps: string[];
  /** Steps that can be auto-detected from existing DB tables */
  autoDetect?: 'always' | 'xero_connected' | 'chart_reviewed';
}

export interface RoadmapStep extends StepDefinition {
  status: StepStatus;
  completedAt?: string;
}

export interface ActivationRoadmap {
  steps: RoadmapStep[];
  overallProgress: number;
  currentPhase: string;
}

/** DB row shape from roadmap_progress table */
export interface RoadmapProgressRow {
  step_id: string;
  status: StepStatus;
  completed_at: string | null;
}

/* ─── Step definitions (static — no status) ─── */

const STEP_DEFINITIONS: StepDefinition[] = [
  { id: 'create-account', title: 'Create your account', description: 'Sign up and verify your email address.', estimatedMinutes: 2, category: 'essential', requiredSteps: [], autoDetect: 'always' },
  { id: 'connect-xero', title: 'Connect Xero', description: 'Securely link your Xero accounting data.', estimatedMinutes: 2, category: 'essential', requiredSteps: ['create-account'], autoDetect: 'xero_connected' },
  { id: 'setup-agent-config', title: 'Setup Agent configures data', description: 'Your AI Setup Agent maps accounts, generates baselines, and checks data quality.', estimatedMinutes: 5, category: 'essential', requiredSteps: ['connect-xero'] },
  { id: 'review-chart', title: 'Review chart of accounts mapping', description: 'Confirm that your Xero accounts are correctly mapped to platform categories.', estimatedMinutes: 3, category: 'essential', requiredSteps: ['setup-agent-config'], autoDetect: 'chart_reviewed' },
  { id: 'set-budgets', title: 'Set budget baselines', description: 'Review and adjust the budget baselines generated from your historical data.', estimatedMinutes: 5, category: 'essential', requiredSteps: ['setup-agent-config'] },
  { id: 'configure-kpis', title: 'Configure KPI targets', description: 'Set targets for your key performance indicators.', estimatedMinutes: 3, category: 'essential', requiredSteps: ['set-budgets'] },
  { id: 'review-quality', title: 'Review data quality score', description: 'Check your data quality dashboard and resolve any flagged issues.', estimatedMinutes: 2, category: 'essential', requiredSteps: ['setup-agent-config'] },
  { id: 'explore-intelligence', title: 'Explore Intelligence feed', description: 'See what your AI has already discovered about your business.', estimatedMinutes: 5, category: 'recommended', requiredSteps: ['review-quality'] },
  { id: 'run-scenario', title: 'Run your first scenario', description: 'Model a what-if scenario to see how changes affect your forecast.', estimatedMinutes: 10, category: 'recommended', requiredSteps: ['set-budgets'] },
  { id: 'activate-agent', title: 'Activate a specialist agent', description: 'Turn on a specialist AI agent to work autonomously for your business.', estimatedMinutes: 3, category: 'advanced', requiredSteps: ['configure-kpis'] },
  { id: 'generate-report', title: 'Generate your first report', description: 'Create a board pack or custom financial report.', estimatedMinutes: 5, category: 'advanced', requiredSteps: ['set-budgets'] },
  { id: 'engage-consultant', title: 'Engage a consultant', description: 'Connect with a verified financial consultant from our network.', estimatedMinutes: 5, category: 'advanced', requiredSteps: ['review-quality'] },
];

/* ─── Exports ─── */

/** Returns step metadata without any status */
export function getStepDefinitions(): StepDefinition[] {
  return STEP_DEFINITIONS;
}

/**
 * Determines the current phase label based on progress.
 */
function computePhase(steps: RoadmapStep[]): string {
  const completedIds = new Set(steps.filter((s) => s.status === 'completed').map((s) => s.id));
  const essentialIds = steps.filter((s) => s.category === 'essential').map((s) => s.id);
  const allEssentialDone = essentialIds.every((id) => completedIds.has(id));

  if (allEssentialDone) return 'Growth & Optimisation';
  if (completedIds.has('connect-xero') && completedIds.has('setup-agent-config')) return 'Foundation Setup';
  if (completedIds.has('create-account')) return 'Getting Connected';
  return 'Getting Started';
}

/**
 * Merges DB progress rows + auto-detection signals with step definitions
 * to produce a full roadmap with correct statuses.
 */
export function mergeProgressWithSteps(
  dbRows: RoadmapProgressRow[],
  autoDetected: Record<string, boolean>,
): ActivationRoadmap {
  const definitions = getStepDefinitions();
  const progressMap = new Map(dbRows.map((r) => [r.step_id, r]));

  // First pass: assign status from DB or auto-detection
  const steps: RoadmapStep[] = definitions.map((def) => {
    const dbRow = progressMap.get(def.id);

    if (dbRow) {
      return {
        ...def,
        status: dbRow.status,
        completedAt: dbRow.completed_at ?? undefined,
      };
    }

    // Auto-detection overrides
    if (def.autoDetect && autoDetected[def.id]) {
      return { ...def, status: 'completed' as StepStatus, completedAt: undefined };
    }

    // Default: will be resolved in second pass
    return { ...def, status: 'available' as StepStatus };
  });

  // Second pass: enforce prerequisite locks
  const completedIds = new Set(steps.filter((s) => s.status === 'completed').map((s) => s.id));

  for (const step of steps) {
    if (step.status === 'completed') continue;

    const prereqsMet = step.requiredSteps.every((req) => completedIds.has(req));
    if (!prereqsMet) {
      step.status = 'locked';
    }
    // If prereqs met and no DB row, status stays 'available' (set above)
  }

  const completed = steps.filter((s) => s.status === 'completed').length;
  const progress = Math.round((completed / steps.length) * 100);

  return {
    steps,
    overallProgress: progress,
    currentPhase: computePhase(steps),
  };
}

/**
 * Legacy helper kept for backward compatibility — returns mock data.
 * @deprecated Use mergeProgressWithSteps() with actual DB rows.
 */
export function getMockRoadmap(): ActivationRoadmap {
  const mockRows: RoadmapProgressRow[] = [
    { step_id: 'create-account', status: 'completed', completed_at: '2026-03-18T10:00:00Z' },
    { step_id: 'connect-xero', status: 'completed', completed_at: '2026-03-18T10:05:00Z' },
    { step_id: 'setup-agent-config', status: 'completed', completed_at: '2026-03-18T10:12:00Z' },
    { step_id: 'review-chart', status: 'completed', completed_at: '2026-03-18T10:20:00Z' },
    { step_id: 'set-budgets', status: 'completed', completed_at: '2026-03-18T11:00:00Z' },
    { step_id: 'configure-kpis', status: 'in_progress', completed_at: null },
    { step_id: 'review-quality', status: 'available', completed_at: null },
  ];
  return mergeProgressWithSteps(mockRows, { 'create-account': true });
}

export function getNextStep(roadmap: ActivationRoadmap): RoadmapStep | undefined {
  return roadmap.steps.find((s) => s.status === 'in_progress') ??
    roadmap.steps.find((s) => s.status === 'available');
}
