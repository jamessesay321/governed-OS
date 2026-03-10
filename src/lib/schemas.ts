import { z } from 'zod';

export const authSetupSchema = z.object({
  orgName: z.string().min(1, 'Organisation name is required').max(255),
  displayName: z.string().min(1, 'Display name is required').max(255),
  userId: z.string().uuid('Invalid user ID'),
});

export const invitationAcceptSchema = z.object({
  token: z.string().uuid('Invalid invitation token'),
});

export const xeroCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

// === Scenario Schemas ===

export const createScenarioSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).default(''),
  basePeriodStart: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
  basePeriodEnd: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
  forecastHorizonMonths: z.number().int().min(1).max(60),
  isBase: z.boolean().default(false),
});

export const updateScenarioSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

export const duplicateScenarioSchema = z.object({
  name: z.string().min(1).max(255),
});

export const createAssumptionSetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).default(''),
  basePeriodStart: z.string().regex(/^\d{4}-\d{2}-01$/),
  basePeriodEnd: z.string().regex(/^\d{4}-\d{2}-01$/),
  forecastHorizonMonths: z.number().int().min(1).max(60),
});

export const addAssumptionValueSchema = z.object({
  category: z.enum(['revenue_drivers', 'pricing', 'costs', 'growth_rates', 'headcount', 'marketing', 'capital', 'custom']),
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(255),
  type: z.enum(['percentage', 'currency', 'integer', 'boolean', 'decimal']),
  value: z.number(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-01$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-01$/).nullable().default(null),
});

export const compareScenarioSchema = z.object({
  baseScenarioId: z.string().uuid(),
  comparisonScenarioId: z.string().uuid(),
});

export const addSegmentInputSchema = z.object({
  segmentKey: z.string().min(1).max(100),
  segmentLabel: z.string().min(1).max(255),
  unitsSold: z.number().min(0),
  revenuePerUnit: z.number(),
  variableCostPerUnit: z.number(),
  acquisitionSpend: z.number().min(0),
  customersAcquired: z.number().int().min(0),
  avgCustomerLifespanMonths: z.number().min(0),
  avgRevenuePerCustomerPerMonth: z.number(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-01$/),
});

// === Scenario Chat Builder Schemas ===

export const proposedAssumptionChangeSchema = z.object({
  category: z.enum(['revenue_drivers', 'pricing', 'costs', 'growth_rates', 'headcount', 'marketing', 'capital', 'custom']),
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(255),
  type: z.enum(['percentage', 'currency', 'integer', 'boolean', 'decimal']),
  current_value: z.number().nullable(),
  new_value: z.number(),
  reasoning: z.string().min(1).max(500),
  effective_from: z.string().regex(/^\d{4}-\d{2}-01$/),
});

export const llmInterpretationSchema = z.object({
  interpretation_summary: z.string().min(1).max(2000),
  confidence: z.number().min(0).max(1),
  assumption_changes: z.array(proposedAssumptionChangeSchema).max(5),
  follow_up_questions: z.array(z.string().max(500)).max(3),
});

export const interpretRequestSchema = z.object({
  naturalLanguageInput: z.string().min(1).max(2000),
  basePeriodStart: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
  basePeriodEnd: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
  forecastHorizonMonths: z.number().int().min(1).max(60).default(12),
});

export const confirmRequestSchema = z.object({
  confirmationToken: z.string().min(1),
});
