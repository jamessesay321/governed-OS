import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { llmLimiter } from '@/lib/rate-limit';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { governedOutput } from '@/lib/governance/checkpoint';
import { getSkillAsSystemPrompt } from '@/lib/skills/company-skill';
import { roundCurrency } from '@/lib/financial/normalise';

// POST /api/ask-grove
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

    // Parse body
    const body = await request.json();
    const question = (body.question as string)?.trim();

    if (!question || question.length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (question.length > 2000) {
      return NextResponse.json({ error: 'Question too long (max 2000 characters)' }, { status: 400 });
    }

    // Build system prompt from Company Skill (aggregated business context)
    // The skill includes: business profile, financial structure, semantic mappings,
    // tracking dimensions, data quality, communication preferences, and standing instructions.
    const [skillPrompt, realtimeFinancials] = await Promise.all([
      getSkillAsSystemPrompt(orgId),
      fetchRecentFinancials(orgId),
    ]);

    const sources: { source: string; reference: string }[] = [
      { source: 'Company Skill', reference: 'Aggregated business context (profile, mappings, config)' },
    ];

    // Append real-time financials (the skill caches for 7 days, but P&L changes with every sync)
    let financialSection = '';
    if (realtimeFinancials.length > 0) {
      const lines = realtimeFinancials.map((p) =>
        `${p.period}: Rev £${Math.round(p.revenue).toLocaleString()}, GP £${Math.round(p.grossProfit).toLocaleString()} (${p.revenue > 0 ? ((p.grossProfit / p.revenue) * 100).toFixed(0) : 0}%), Exp £${Math.round(Math.abs(p.expenses)).toLocaleString()}, NP £${Math.round(p.netProfit).toLocaleString()}`
      );
      financialSection = `\n\n## Recent Financial Performance (${realtimeFinancials.length} months)\n${lines.join('\n')}`;
      sources.push({ source: 'Xero', reference: `Last ${realtimeFinancials.length} months of normalised financials` });
    }

    const systemPrompt = `${skillPrompt}

## Your Role
You are Grove, the user's financial analyst. Answer questions using the business context and financial data above. Always cite specific numbers with their source. Be direct and actionable. Never use em dashes. Keep responses concise (2-4 paragraphs max).${financialSection}`;

    // Call LLM (cached in DB + Anthropic prompt caching for system prompt)
    const { response, tokensUsed } = await callLLMCached({
      systemPrompt,
      userMessage: question,
      orgId,
      temperature: 0.3,
      cacheTTLMinutes: 30,
      model: 'sonnet',
      cacheSystemPrompt: true, // Business context is stable between questions
    });

    // Track token usage
    await trackTokenUsage(orgId, tokensUsed, 'ask-grove');

    // Governance checkpoint — audit trail for every AI answer
    await governedOutput({
      orgId,
      userId: profile.id as string,
      outputType: 'ask_grove_answer',
      content: response,
      modelTier: 'sonnet',
      modelId: 'claude-sonnet-4-20250514',
      dataSources: sources.map((s) => ({ type: s.source, reference: s.reference })),
      tokensUsed,
      cached: false,
    });

    return NextResponse.json({
      answer: response,
      sources,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[ask-grove] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  Real-time financial summary (complements the cached Company Skill) */
/* ------------------------------------------------------------------ */

type PeriodSnapshot = {
  period: string;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

async function fetchRecentFinancials(orgId: string): Promise<PeriodSnapshot[]> {
  try {
    const supabase = await createServiceClient();

    const { data: financials } = await supabase
      .from('normalised_financials')
      .select('*, chart_of_accounts!inner(class)')
      .eq('org_id', orgId);

    if (!financials || financials.length === 0) return [];

    // Aggregate by period
    const periodMap = new Map<string, { revenue: number; costOfSales: number; expenses: number }>();
    for (const fin of financials) {
      const period = fin.period as string;
      const existing = periodMap.get(period) ?? { revenue: 0, costOfSales: 0, expenses: 0 };
      const accountClass = ((fin.chart_of_accounts as Record<string, string>)?.class ?? '').toUpperCase();
      const amount = Number(fin.amount);

      if (accountClass === 'REVENUE') {
        existing.revenue += amount;
      } else if (accountClass === 'DIRECTCOSTS') {
        existing.costOfSales += amount;
      } else if (accountClass === 'EXPENSE' || accountClass === 'OVERHEADS') {
        existing.expenses += amount;
      }

      periodMap.set(period, existing);
    }

    // Sort descending and take last 6 months
    return [...periodMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .reverse()
      .map(([period, data]) => ({
        period,
        revenue: roundCurrency(data.revenue),
        grossProfit: roundCurrency(data.revenue - data.costOfSales),
        expenses: roundCurrency(data.expenses),
        netProfit: roundCurrency(data.revenue - data.costOfSales - data.expenses),
      }));
  } catch {
    return [];
  }
}
