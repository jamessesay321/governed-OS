import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { llmLimiter } from '@/lib/rate-limit';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';

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

    // Build financial context
    const supabase = await createUntypedServiceClient();

    // Fetch org profile
    const { data: orgProfile } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    // Fetch latest normalised financials (last 3 months)
    const { data: financials } = await supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId)
      .order('period_start', { ascending: false })
      .limit(3);

    // Fetch chart of accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('org_id', orgId)
      .limit(100);

    // Fetch latest health check
    const { data: healthCheck } = await supabase
      .from('health_checks')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch latest thesis
    const { data: thesis } = await supabase
      .from('theses')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build context string
    const contextParts: string[] = [];
    const sources: { source: string; reference: string }[] = [];

    if (orgProfile) {
      contextParts.push(`Organisation: ${JSON.stringify(orgProfile)}`);
      sources.push({ source: 'Organisation', reference: 'Profile data' });
    }

    if (financials && financials.length > 0) {
      contextParts.push(`Recent Financials (last ${financials.length} months): ${JSON.stringify(financials)}`);
      sources.push({ source: 'Xero', reference: `Last ${financials.length} months of normalised financials` });
    }

    if (accounts && accounts.length > 0) {
      contextParts.push(`Chart of Accounts (${accounts.length} accounts): ${JSON.stringify(accounts)}`);
      sources.push({ source: 'Xero', reference: `${accounts.length} chart of accounts entries` });
    }

    if (healthCheck) {
      contextParts.push(`Latest Health Check: ${JSON.stringify(healthCheck)}`);
      sources.push({ source: 'Calculated', reference: 'Most recent health check score' });
    }

    if (thesis) {
      contextParts.push(`Latest Thesis: ${JSON.stringify(thesis)}`);
      sources.push({ source: 'Calculated', reference: 'Latest business thesis' });
    }

    const systemPrompt = `You are Grove, a financial analyst assistant. Answer questions about the user's business using the provided financial data. Always cite specific numbers with their source. Be direct and actionable. Never use em dashes. Keep responses concise (2-4 paragraphs max).

Here is the business context:
${contextParts.join('\n\n')}`;

    // Call LLM (cached)
    const { response, tokensUsed } = await callLLMCached({
      systemPrompt,
      userMessage: question,
      orgId,
      temperature: 0.3,
      cacheTTLMinutes: 30,
    });

    // Track token usage
    await trackTokenUsage(orgId, tokensUsed, 'ask-grove');

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
