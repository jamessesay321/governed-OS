import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { generateCommentary, getCommentary, getLatestCommentary } from '@/lib/analysis/commentary';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { llmLimiter } from '@/lib/rate-limit';
import { z } from 'zod';

type Params = { params: Promise<{ orgId: string }> };

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  generate: z.enum(['true', 'false']).optional(),
});

/**
 * GET /api/analysis/commentary/[orgId]
 * Get commentary for a period. If ?generate=true, generates new commentary.
 * Use ?period=YYYY-MM to specify a period (default: latest).
 */
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      period: url.searchParams.get('period') || undefined,
      generate: url.searchParams.get('generate') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { period, generate } = parsed.data;

    // If not generating, try to return cached commentary
    if (generate !== 'true') {
      const cached = period
        ? await getCommentary(orgId, period)
        : await getLatestCommentary(orgId);

      if (cached) {
        return NextResponse.json(cached);
      }

      // No cached commentary — either generate or tell the user
      return NextResponse.json({
        commentary: null,
        message: 'No commentary available. Use ?generate=true to generate.',
      });
    }

    // Generate new commentary
    const limited = llmLimiter.check(orgId);
    if (limited) return limited;

    const rateCheck = checkRateLimit(orgId, 'commentary');
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      );
    }

    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted. Upgrade your plan for more.' },
        { status: 402 }
      );
    }

    const commentary = await generateCommentary(orgId, period);

    await trackTokenUsage(orgId, 2000, 'commentary');

    return NextResponse.json(commentary);
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[analysis/commentary] GET error:', err);
    return NextResponse.json({ error: 'Failed to get commentary' }, { status: 500 });
  }
}
