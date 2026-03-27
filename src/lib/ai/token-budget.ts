import { createUntypedServiceClient } from '@/lib/supabase/server';

type TokenBudget = {
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date;
};

type Plan = 'free' | 'starter' | 'growth' | 'enterprise';

/** Monthly token limits per plan. -1 means unlimited. */
const PLAN_LIMITS: Record<Plan, number> = {
  free: 10_000,
  starter: 50_000,
  growth: 200_000,
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
async function getOrgPlan(orgId: string): Promise<Plan> {
  const supabase = await createUntypedServiceClient();

  const { data } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .maybeSingle();

  const plan = (data?.plan as string)?.toLowerCase() as Plan | undefined;
  return plan && plan in PLAN_LIMITS ? plan : 'free';
}

/**
 * Record token usage for an org + endpoint.
 * Inserts a row into `ai_token_usage`.
 */
export async function trackTokenUsage(
  orgId: string,
  tokens: number,
  endpoint: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase.from('ai_token_usage').insert({
    org_id: orgId,
    endpoint,
    tokens_used: tokens,
    created_at: new Date().toISOString(),
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
