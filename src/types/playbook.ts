// === Playbook Engine Types ===

export const MATURITY_LEVELS = [1, 2, 3, 4, 5] as const;
export type MaturityLevel = (typeof MATURITY_LEVELS)[number];

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  1: 'Foundation',
  2: 'Developing',
  3: 'Established',
  4: 'Advanced',
  5: 'Leading',
};

export const ACTION_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const ACTION_PRIORITIES = ['high', 'medium', 'low'] as const;
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];

// === Playbook Template ===

export type PlaybookDimension = {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, all weights in a template should sum to 1
  kpiKeys: string[]; // KPI keys used for auto-scoring
  levels: DimensionLevelDefinition[];
};

export type DimensionLevelDefinition = {
  level: MaturityLevel;
  label: string;
  description: string;
  thresholds: Record<string, { min: number; max: number }>; // KPI key -> threshold range
};

export type PlaybookTemplate = {
  id: string;
  name: string;
  description: string;
  version: string;
  dimensions: PlaybookDimension[];
  createdAt: string;
};

// === Assessment ===

export type DimensionScore = {
  dimensionId: string;
  dimensionName: string;
  score: MaturityLevel;
  label: string;
  weight: number;
  kpiValues: Record<string, number | null>;
  reasoning: string;
};

export type PlaybookAssessment = {
  id: string;
  orgId: string;
  templateId: string;
  templateName: string;
  overallScore: number; // weighted average (1-5 scale)
  overallLabel: string;
  dimensionScores: DimensionScore[];
  aiSummary: string;
  assessedAt: string;
  previousScore: number | null;
};

// === Actions ===

export type PlaybookAction = {
  id: string;
  orgId: string;
  assessmentId: string;
  dimensionId: string;
  dimensionName: string;
  title: string;
  description: string;
  priority: ActionPriority;
  status: ActionStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

// === Module Types ===

export const MODULE_CATEGORIES = [
  'financial-analysis',
  'forecasting-planning',
  'compliance-governance',
  'growth-strategy',
  'industry-packs',
] as const;
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

export const MODULE_TIERS = ['free', 'starter', 'professional', 'enterprise'] as const;
export type ModuleTier = (typeof MODULE_TIERS)[number];

export type ModuleDefinition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ModuleCategory;
  icon: string;
  features: string[];
  isActive: boolean;
  tier: ModuleTier;
  credits: number; // monthly credits cost (0 = free/included)
  monthlyPrice: number | null; // GBP price if sold standalone
};

export type ModuleActivation = {
  orgId: string;
  moduleId: string;
  activatedAt: string;
  activatedBy: string;
};

// === Health Check Types ===

export type TrafficLightStatus = 'green' | 'amber' | 'red';

export type HealthCheckMetric = {
  name: string;
  value: number;
  benchmark: number;
  status: TrafficLightStatus;
  description: string;
};

export type HealthCheckCategory = {
  name: string;
  status: TrafficLightStatus;
  metrics: HealthCheckMetric[];
};

export type HealthCheckResult = {
  orgId: string;
  categories: HealthCheckCategory[];
  overallStatus: TrafficLightStatus;
  aiNarrative: string;
  topActions: string[];
  assessedAt: string;
};

// === Cash Forecast Types ===

export type CashForecastWeek = {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  closingBalance: number;
};

export type CashForecastResult = {
  orgId: string;
  weeks: CashForecastWeek[];
  currentCash: number;
  burnRate: number;
  runwayWeeks: number;
  alertThreshold: number;
  forecastedAt: string;
};

// === Investment Readiness Types ===

export type ReadinessCategory = {
  name: string;
  score: number; // 0-100
  maxScore: number;
  gaps: string[];
};

export type InvestmentReadinessResult = {
  orgId: string;
  overallScore: number; // 0-100
  categories: ReadinessCategory[];
  investorMetrics: Record<string, number | string>;
  assessedAt: string;
};

// === Pricing Analyser Types ===

export type MarginCategory = {
  name: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
};

export type PricingScenario = {
  priceChangePercent: number;
  newRevenue: number;
  newMargin: number;
  newMarginPct: number;
  volumeImpactPercent: number;
};

export type PricingAnalysisResult = {
  orgId: string;
  categories: MarginCategory[];
  overallMargin: number;
  overallMarginPct: number;
  breakEvenVolume: number;
  marginTrend: { period: string; margin: number }[];
  analysedAt: string;
};
