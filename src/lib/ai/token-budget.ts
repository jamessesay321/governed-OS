import { createUntypedServiceClient } from '@/lib/supabase/server';

type TokenBudget = {
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date;
};

export type Plan = 'free' | 'starter' | 'growth' | 'enterprise';

/** Monthly token limits per plan. -1 means unlimited. */
export const PLAN_LIMITS: Record<Plan, number> = {
  free: 100_000,
  starter: 500_000,
  growth: 2_000_000,
  enterprise: -1, // unlimited
};

/**
 * Get the first day of the current calendar month (UTC) as the billing cycle start.
 */
function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Get the first day of the next calendar month (UTC) as the reset date.
 */
function nextMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Resolve the plan for an org. Falls back to 'free' if unrecognised.
 */
export async function getOrgPlan(orgId: string): Promise<Plan> {
  const supabase = await createUntypedServiceClient();

  const { data } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .maybeSingle();

  const plan = (data?.plan as string)?.toLowerCase() as Plan | undefined;
  return plan && plan in PLAN_LIMITS ? plan : 'free';
}

// ---------------------------------------------------------------------------
// Model pricing (per million tokens, USD)
// ---------------------------------------------------------------------------

const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'sonnet': { input: 3, output: 15, cacheRead: 0.3 },
  'haiku': { input: 0.25, output: 1.25, cacheRead: 0.03 },
  'opus': { input: 15, output: 75, cacheRead: 1.5 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['sonnet'];
  return (
    (inputTokens * pricing.input +
      outputTokens * pricing.output +
      cacheReadTokens * pricing.cacheRead) / 1_000_000
  );
}

/**
 * Record token usage for an org + endpoint.
 * Inserts a row into `ai_token_usage` with optional granular breakdown.
 */
export async function trackTokenUsage(
  orgId: string,
  tokens: number,
  endpoint: string,
  details?: {
    userId?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
    estimatedCostUsd?: number;
  }
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase.from('ai_token_usage').insert({
    org_id: orgId,
    endpoint,
    tokens_used: tokens,
    created_at: new Date().toISOString(),
    // Granular fields — Supabase will silently ignore if columns don't exist yet
    user_id: details?.userId ?? null,
    model: details?.model ?? null,
    input_tokens: details?.inputTokens ?? 0,
    output_tokens: details?.outputTokens ?? 0,
    cache_read_tokens: details?.cacheReadTokens ?? 0,
    cache_creation_tokens: details?.cacheCreationTokens ?? 0,
    estimated_cost_usd: details?.estimatedCostUsd ?? 0,
  });

  if (error) {
    console.error('[ai/token-budget] failed to track usage:', error.message);
  }
}

/**
 * Get the token budget summary for an org in the current billing month.
 */
export async function getTokenBudget(orgId: string): Promise<TokenBudget> {
  const supabase = await createUntypedServiceClient();
  const monthStart = currentMonthStart().toISOString();
  const resetDate = nextMonthStart();

  // Sum tokens used this month
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('tokens_used')
    .eq('org_id', orgId)
    .gte('created_at', monthStart);

  if (error) {
    console.error('[ai/token-budget] failed to fetch usage:', error.message);
  }

  const used = (data ?? []).reduce(
    (sum, row) => sum + ((row.tokens_used as number) ?? 0),
    0
  );

  const plan = await getOrgPlan(orgId);
  const limit = PLAN_LIMITS[plan];

  // -1 means unlimited
  const remaining = limit === -1 ? Infinity : Math.max(0, limit - used);

  return {
    used,
    limit: limit === -1 ? Infinity : limit,
    remaining,
    resetDate,
  };
}

/**
 * Quick check: does the org have budget remaining?
 */
export async function hasBudgetRemaining(orgId: string): Promise<boolean> {
  const budget = await getTokenBudget(orgId);
  return budget.remaining > 0;
}
