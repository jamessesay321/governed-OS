import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { generateThesis, getThesis } from '@/lib/analysis/thesis';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { llmLimiter } from '@/lib/rate-limit';

type Params = { params: Promise<{ orgId: string }> };

/**
 * GET /api/analysis/thesis/[orgId]
 * Retrieve the current business thesis.
 */
export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const thesis = await getThesis(orgId);

    if (!thesis) {
      return NextResponse.json({
        thesis: null,
        message: 'No thesis generated yet. POST to this endpoint to generate one.',
      });
    }

    return NextResponse.json({ thesis });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[analysis/thesis] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch thesis' }, { status: 500 });
  }
}

/**
 * POST /api/analysis/thesis/[orgId]
 * Generate a new business thesis (admin only).
 */
export async function POST(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const { profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit: 10 LLM calls per minute per org
    const limited = llmLimiter.check(orgId);
    if (limited) return limited;

    // AI rate limit
    const rateCheck = checkRateLimit(orgId, 'thesis');
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      );
    }

    // Budget check
    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted. Upgrade your plan for more.' },
        { status: 402 }
      );
    }

    const thesis = await generateThesis(orgId);

    // Track usage (rough estimate)
    await trackTokenUsage(orgId, 3000, 'thesis');

    return NextResponse.json({ thesis });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[analysis/thesis] POST error:', err);
    return NextResponse.json({ error: 'Failed to generate thesis' }, { status: 500 });
  }
}
