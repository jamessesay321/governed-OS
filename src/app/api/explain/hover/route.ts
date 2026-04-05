import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { callLLMWithUsage } from '@/lib/ai/llm';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { llmLimiter } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// In-memory cache for hover explanations (1-hour TTL)
// ---------------------------------------------------------------------------

type CacheEntry = {
  explanation: string;
  expiresAt: number;
};

const hoverCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCacheKey(label: string, period: string, value: number): string {
  return `${label}:${period}:${value}`;
}

function getCached(key: string): string | null {
  const entry = hoverCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    hoverCache.delete(key);
    return null;
  }
  return entry.explanation;
}

function setCache(key: string, explanation: string): void {
  // Evict expired entries periodically (every 100 writes)
  if (hoverCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of hoverCache) {
      if (now > v.expiresAt) hoverCache.delete(k);
    }
  }
  hoverCache.set(key, { explanation, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const hoverExplainSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.number(),
  period: z.string().min(1).max(100),
  orgId: z.string().uuid(),
  context: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/explain/hover
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { profile } = await requireRole('viewer');

    const body = await request.json();
    const input = hoverExplainSchema.parse(body);

    // Verify org membership
    if (profile.org_id !== input.orgId) {
      return NextResponse.json(
        { error: 'Not a member of this organisation' },
        { status: 403 },
      );
    }

    // Rate limit: general LLM limiter
    const limited = llmLimiter.check(input.orgId);
    if (limited) return limited;

    // AI-specific rate limit (50/hour per org)
    const aiLimit = checkRateLimit(input.orgId, 'hover-explain');
    if (!aiLimit.allowed) {
      return NextResponse.json(
        { error: 'AI rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(aiLimit),
        },
      );
    }

    // Check in-memory cache
    const cacheKey = getCacheKey(input.label, input.period, input.value);
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ explanation: cached });
    }

    // Build prompt
    const contextClause = input.context ? ` Additional context: ${input.context}.` : '';
    const userMessage = `You are a financial analyst. In ONE sentence (max 20 words), explain what this means for the business: ${input.label} is ${input.value} in ${input.period}.${contextClause} Be specific and actionable.`;

    const result = await callLLMWithUsage({
      systemPrompt:
        'You are a concise financial analyst for UK SMEs. Apply FRS 102/FRS 105 standards and ACCA/ICAEW practitioner methodology. Respond with a single sentence, no more than 20 words. Use £ currency. Be specific and actionable. Do not include any preamble or formatting.',
      userMessage,
      model: 'haiku',
      maxTokens: 100,
      temperature: 0.2,
      orgId: input.orgId,
      endpoint: 'hover-explain',
    });

    const explanation = result.text.trim();

    // Cache the result
    setCache(cacheKey, explanation);

    return NextResponse.json({ explanation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    }
    console.error('[api/explain/hover] error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 },
    );
  }
}
