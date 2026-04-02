import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { calculateVariances } from '@/lib/variance/engine';
import { z } from 'zod';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { getCompanyContextPrefix } from '@/lib/skills/company-skill';
import { governedOutput } from '@/lib/governance/checkpoint';

// GET /api/variance/[orgId]?period=YYYY-MM-01: Get variance analysis (viewer+)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const period = url.searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'period query param required' }, { status: 400 });
    }

    const report = await calculateVariances(orgId, period);
    return NextResponse.json(report);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[variance] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const varianceItemSchema = z.object({
  name: z.string(),
  current: z.number(),
  previous: z.number(),
  variance: z.number(),
  favourable: z.boolean(),
});

const postSchema = z.object({
  variances: z.array(varianceItemSchema).max(20),
});

// POST /api/variance/[orgId]: Get AI explanation for top variances
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { variances } = parsed.data;

    // Build a summary for AI explanation
    const lines = variances.map((v) => {
      const direction = v.favourable ? 'favourable' : 'adverse';
      const pct = v.previous !== 0 ? ((v.variance / v.previous) * 100).toFixed(1) : 'N/A';
      return `- ${v.name}: £${(v.current / 100).toFixed(2)} vs £${(v.previous / 100).toFixed(2)} (${direction}, ${pct}%)`;
    }).join('\n');

    // Rate limit + budget checks
    const rateCheck = checkRateLimit(orgId, 'variance');
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

    // Use the LLM to generate an explanation
    let explanation: string;
    try {
      const companyContext = await getCompanyContextPrefix(orgId);
      const result = await callLLMCached({
        systemPrompt: `${companyContext ? companyContext + '\n\n' : ''}You are a financial analyst. Given the top budget variances, provide a concise 2-3 sentence executive summary explaining the overall financial picture. Use plain English suitable for a business owner. Reference specific line items and amounts in pounds.`,
        userMessage: `Top variances for this period:\n${lines}\n\nProvide an executive summary.`,
        orgId,
        model: 'haiku',
        maxTokens: 512,
        cacheSystemPrompt: true,
      });
      explanation = result.response;
      await trackTokenUsage(orgId, result.tokensUsed, 'variance');

      // Governance checkpoint — audit trail for variance explanations
      await governedOutput({
        orgId,
        userId: profile.id as string,
        outputType: 'variance_commentary',
        content: explanation,
        modelTier: 'haiku',
        modelId: 'claude-haiku-4-20250414',
        dataSources: [{ type: 'variance_data', reference: `${variances.length} variance items` }],
        tokensUsed: result.tokensUsed,
        cached: false,
      });
    } catch {
      // Fallback if LLM call fails
      const topItem = variances[0];
      const direction = topItem?.favourable ? 'favourable' : 'adverse';
      explanation = `Your top variance is ${topItem?.name} with a ${direction} movement of £${((topItem?.variance || 0) / 100).toFixed(2)}. Review the detailed breakdown below for more context.`;
    }

    return NextResponse.json({ explanation });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[variance] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
