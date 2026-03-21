/* Activation Roadmap — step-by-step guided setup */

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  category: 'essential' | 'recommended' | 'advanced';
  requiredSteps: string[];
  status: 'completed' | 'in_progress' | 'locked' | 'available';
  completedAt?: string;
}

export interface ActivationRoadmap {
  steps: RoadmapStep[];
  overallProgress: number;
  currentPhase: string;
}

const ROADMAP_STEPS: RoadmapStep[] = [
  { id: 'create-account', title: 'Create your account', description: 'Sign up and verify your email address.', estimatedMinutes: 2, category: 'essential', requiredSteps: [], status: 'completed', completedAt: '2026-03-18T10:00:00Z' },
  { id: 'connect-xero', title: 'Connect Xero', description: 'Securely link your Xero accounting data.', estimatedMinutes: 2, category: 'essential', requiredSteps: ['create-account'], status: 'completed', completedAt: '2026-03-18T10:05:00Z' },
  { id: 'setup-agent-config', title: 'Setup Agent configures data', description: 'Your AI Setup Agent maps accounts, generates baselines, and checks data quality.', estimatedMinutes: 5, category: 'essential', requiredSteps: ['connect-xero'], status: 'completed', completedAt: '2026-03-18T10:12:00Z' },
  { id: 'review-chart', title: 'Review chart of accounts mapping', description: 'Confirm that your Xero accounts are correctly mapped to platform categories.', estimatedMinutes: 3, category: 'essential', requiredSteps: ['setup-agent-config'], status: 'completed', completedAt: '2026-03-18T10:20:00Z' },
  { id: 'set-budgets', title: 'Set budget baselines', description: 'Review and adjust the budget baselines generated from your historical data.', estimatedMinutes: 5, category: 'essential', requiredSteps: ['setup-agent-config'], status: 'completed', completedAt: '2026-03-18T11:00:00Z' },
  { id: 'configure-kpis', title: 'Configure KPI targets', description: 'Set targets for your key performance indicators.', estimatedMinutes: 3, category: 'essential', requiredSteps: ['set-budgets'], status: 'in_progress' },
  { id: 'review-quality', title: 'Review data quality score', description: 'Check your data quality dashboard and resolve any flagged issues.', estimatedMinutes: 2, category: 'essential', requiredSteps: ['setup-agent-config'], status: 'available' },
  { id: 'explore-intelligence', title: 'Explore Intelligence feed', description: 'See what your AI has already discovered about your business.', estimatedMinutes: 5, category: 'recommended', requiredSteps: ['review-quality'], status: 'locked' },
  { id: 'run-scenario', title: 'Run your first scenario', description: 'Model a what-if scenario to see how changes affect your forecast.', estimatedMinutes: 10, category: 'recommended', requiredSteps: ['set-budgets'], status: 'locked' },
  { id: 'activate-agent', title: 'Activate a specialist agent', description: 'Turn on a specialist AI agent to work autonomously for your business.', estimatedMinutes: 3, category: 'advanced', requiredSteps: ['configure-kpis'], status: 'locked' },
  { id: 'generate-report', title: 'Generate your first report', description: 'Create a board pack or custom financial report.', estimatedMinutes: 5, category: 'advanced', requiredSteps: ['set-budgets'], status: 'locked' },
  { id: 'engage-consultant', title: 'Engage a consultant', description: 'Connect with a verified financial consultant from our network.', estimatedMinutes: 5, category: 'advanced', requiredSteps: ['review-quality'], status: 'locked' },
];

export function getMockRoadmap(): ActivationRoadmap {
  const completed = ROADMAP_STEPS.filter((s) => s.status === 'completed').length;
  const progress = Math.round((completed / ROADMAP_STEPS.length) * 100);

  return {
    steps: ROADMAP_STEPS,
    overallProgress: progress,
    currentPhase: 'Foundation Setup',
  };
}

export function getNextStep(roadmap: ActivationRoadmap): RoadmapStep | undefined {
  return roadmap.steps.find((s) => s.status === 'in_progress') ??
    roadmap.steps.find((s) => s.status === 'available');
}
