import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { llmLimiter } from '@/lib/rate-limit';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { governedOutput } from '@/lib/governance/checkpoint';
import { getSkillAsSystemPrompt } from '@/lib/skills/company-skill';
import { roundCurrency } from '@/lib/financial/normalise';

/**
 * POST /api/intelligence/query
 *
 * Quick AI query endpoint used by CMD+K command palette.
 * Uses Company Skill for full business context, same as Ask Grove
 * but accepts { query } instead of { question } for the palette's interface.
 */
export async function POST(request: Request) {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    // Rate limit
    const limited = llmLimiter.check(orgId);
    if (limited) return limited;

    // Budget check
    const hasRemaining = await hasBudgetRemaining(orgId);
    if (!hasRemaining) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted. Upgrade your plan or wait until next month.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    // Accept both "query" (CMD+K) and "question" (Ask Grove compat) field names
    const query = ((body.query ?? body.question) as string)?.trim();

    if (!query || query.length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (query.length > 2000) {
      return NextResponse.json({ error: 'Query too long (max 2000 characters)' }, { status: 400 });
    }

    // Build system prompt from Company Skill + real-time financials
    const [skillPrompt, financialLines] = await Promise.all([
      getSkillAsSystemPrompt(orgId),
      fetchRecentPnLSummary(orgId),
    ]);

    const financialSection = financialLines.length > 0
      ? `\n\n## Recent Financial Performance\n${financialLines.join('\n')}`
      : '';

    const systemPrompt = `${skillPrompt}

## Your Role
You are Grove, a quick-answer financial assistant. The user asked this from the command palette, so keep your answer brief (1-2 paragraphs). Lead with the key insight. Cite specific numbers. Never use em dashes. Use £ currency.${financialSection}`;

    const { response, tokensUsed } = await callLLMCached({
      systemPrompt,
      userMessage: query,
      orgId,
      temperature: 0.3,
      cacheTTLMinutes: 15,
      model: 'sonnet',
      cacheSystemPrompt: true,
    });

    await trackTokenUsage(orgId, tokensUsed, 'intelligence-query');

    await governedOutput({
      orgId,
      userId: profile.id as string,
      outputType: 'intelligence_query',
      content: response,
      modelTier: 'sonnet',
      modelId: 'claude-sonnet-4-20250514',
      dataSources: [
        { type: 'Company Skill', reference: 'Aggregated business context' },
      ],
      tokensUsed,
      cached: false,
    });

    return NextResponse.json({
      answer: response,
      response, // CMD+K checks both answer and response fields
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[intelligence/query] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  Lightweight P&L summary for context                                */
/* ------------------------------------------------------------------ */

async function fetchRecentPnLSummary(orgId: string): Promise<string[]> {
  try {
    const supabase = await createServiceClient();
    const { data: financials } = await supabase
      .from('normalised_financials')
      .select('*, chart_of_accounts!inner(class)')
      .eq('org_id', orgId);

    if (!financials || financials.length === 0) return [];

    const periodMap = new Map<string, { revenue: number; cogs: number; expenses: number }>();
    for (const fin of financials) {
      const period = fin.period as string;
      const existing = periodMap.get(period) ?? { revenue: 0, cogs: 0, expenses: 0 };
      const cls = ((fin.chart_of_accounts as Record<string, string>)?.class ?? '').toUpperCase();
      const amount = Number(fin.amount);

      if (cls === 'REVENUE') existing.revenue += amount;
      else if (cls === 'DIRECTCOSTS') existing.cogs += amount;
      else if (cls === 'EXPENSE' || cls === 'OVERHEADS') existing.expenses += amount;

      periodMap.set(period, existing);
    }

    return [...periodMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 3)
      .reverse()
      .map(([period, d]) => {
        const gp = roundCurrency(d.revenue - d.cogs);
        const np = roundCurrency(d.revenue - d.cogs - d.expenses);
        return `${period}: Rev £${Math.round(d.revenue).toLocaleString()}, GP £${Math.round(gp).toLocaleString()}, NP £${Math.round(np).toLocaleString()}`;
      });
  } catch {
    return [];
  }
}
