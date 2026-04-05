import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { getTokenBudget, getOrgPlan, PLAN_LIMITS } from '@/lib/ai/token-budget';

type Params = { params: Promise<{ orgId: string }> };

/**
 * GET /api/usage/[orgId]
 * Returns AI token usage summary for the organisation.
 * Protected: requires admin role.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createUntypedServiceClient();

    // Current month boundaries
    const now = new Date();
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString();
    const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30)).toISOString();

    // Fetch all usage rows for this month
    const { data: thisMonthRows } = await supabase
      .from('ai_token_usage')
      .select('tokens_used, endpoint, user_id, model, input_tokens, output_tokens, cache_read_tokens, estimated_cost_usd, created_at')
      .eq('org_id', orgId)
      .gte('created_at', thisMonthStart);

    // Fetch all usage rows for last month
    const { data: lastMonthRows } = await supabase
      .from('ai_token_usage')
      .select('tokens_used')
      .eq('org_id', orgId)
      .gte('created_at', lastMonthStart)
      .lt('created_at', thisMonthStart);

    // Fetch last 30 days for daily trend
    const { data: trendRows } = await supabase
      .from('ai_token_usage')
      .select('tokens_used, estimated_cost_usd, created_at')
      .eq('org_id', orgId)
      .gte('created_at', thirtyDaysAgo);

    const rows = (thisMonthRows ?? []) as Record<string, unknown>[];
    const lastRows = (lastMonthRows ?? []) as Record<string, unknown>[];
    const dailyRows = (trendRows ?? []) as Record<string, unknown>[];

    // Total tokens this month and last month
    const totalTokensThisMonth = rows.reduce((s, r) => s + ((r.tokens_used as number) ?? 0), 0);
    const totalTokensLastMonth = lastRows.reduce((s, r) => s + ((r.tokens_used as number) ?? 0), 0);
    const totalCostThisMonth = rows.reduce((s, r) => s + (Number(r.estimated_cost_usd) || 0), 0);

    // Breakdown by endpoint
    const endpointMap = new Map<string, { tokens: number; count: number; cost: number }>();
    for (const row of rows) {
      const ep = (row.endpoint as string) || 'unknown';
      const existing = endpointMap.get(ep) || { tokens: 0, count: 0, cost: 0 };
      existing.tokens += (row.tokens_used as number) ?? 0;
      existing.count += 1;
      existing.cost += Number(row.estimated_cost_usd) || 0;
      endpointMap.set(ep, existing);
    }
    const byEndpoint = Array.from(endpointMap.entries())
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.tokens - a.tokens);

    // Breakdown by user
    const userMap = new Map<string, { tokens: number; count: number; cost: number }>();
    for (const row of rows) {
      const uid = (row.user_id as string) || 'unknown';
      const existing = userMap.get(uid) || { tokens: 0, count: 0, cost: 0 };
      existing.tokens += (row.tokens_used as number) ?? 0;
      existing.count += 1;
      existing.cost += Number(row.estimated_cost_usd) || 0;
      userMap.set(uid, existing);
    }
    const byUser = Array.from(userMap.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.tokens - a.tokens);

    // Daily trend (last 30 days)
    const dayMap = new Map<string, { tokens: number; cost: number }>();
    for (const row of dailyRows) {
      const day = ((row.created_at as string) ?? '').slice(0, 10);
      if (!day) continue;
      const existing = dayMap.get(day) || { tokens: 0, cost: 0 };
      existing.tokens += (row.tokens_used as number) ?? 0;
      existing.cost += Number(row.estimated_cost_usd) || 0;
      dayMap.set(day, existing);
    }
    const dailyTrend = Array.from(dayMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Budget + plan
    const budget = await getTokenBudget(orgId);
    const plan = await getOrgPlan(orgId);

    return NextResponse.json({
      totalTokensThisMonth,
      totalTokensLastMonth,
      totalCostThisMonth: Math.round(totalCostThisMonth * 1_000_000) / 1_000_000,
      byEndpoint,
      byUser,
      dailyTrend,
      budget: {
        used: budget.used,
        limit: budget.limit === Infinity ? -1 : budget.limit,
        remaining: budget.remaining === Infinity ? -1 : budget.remaining,
        resetDate: budget.resetDate.toISOString(),
      },
      plan,
      planLimits: PLAN_LIMITS,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api/usage] error:', e);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}
