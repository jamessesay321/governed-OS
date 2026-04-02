import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { buildFinancialContext } from '@/lib/ai/financial-context';
import { governedOutput } from '@/lib/governance/checkpoint';
import { llmLimiter } from '@/lib/rate-limit';

type Params = { params: Promise<{ orgId: string }> };

const explainSchema = z.object({
  term: z.string().min(1).max(100),
  currentValue: z.number().optional(),
  context: z.string().max(500).optional(),
});

const EXPLAINER_PROMPT = `You are the Grove financial explainer. Explain financial terms in plain English, personalised to the user's actual business data.

## Rules
- Respond with valid JSON ONLY.
- Use £ currency. This is a UK business.
- Always relate the explanation to the user's actual numbers.
- Keep explanations concise but helpful — a business owner who isn't a finance expert should understand.
- Include a practical "what this means for you" section.
- If the term has a current value, explain whether it's good, bad, or neutral for their business type.

## Output JSON Schema
{
  "term": "string",
  "plain_english": "string (1-100 chars) — one-sentence definition anyone can understand",
  "personalised_explanation": "string (1-400 chars) — explanation using their actual data",
  "what_it_means": "string (1-200 chars) — practical implication for their business",
  "benchmark_context": "string (1-150 chars) — how they compare to typical businesses",
  "tips": ["string (max 2 tips, max 100 chars each)"]
}`;

// POST /api/explain/[orgId] — Get AI-powered personalised explanation of a financial term
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    // Rate limit: 10 LLM calls per minute per org
    const limited = llmLimiter.check(orgId);
    if (limited) return limited;

    const body = await request.json();
    const input = explainSchema.parse(body);

    // Build financial context for personalised explanation
    const now = new Date();
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 6);
    const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;

    let financialSummary = 'No financial data available yet.';
    try {
      const ctx = await buildFinancialContext(orgId, start, end);
      if (ctx.periodSummaries.length > 0) {
        financialSummary = `
Average Monthly Revenue: £${ctx.avgMonthlyRevenue.toLocaleString()}
Gross Margin: ${(ctx.avgGrossMargin * 100).toFixed(1)}%
Net Margin: ${(ctx.avgNetMargin * 100).toFixed(1)}%
Revenue Growth: ${(ctx.revenueGrowthRate * 100).toFixed(1)}%`;
      }
    } catch {
      // Continue with generic explanation if no data
    }

    const userMessage = `Explain "${input.term}" for this business.
${input.currentValue != null ? `Current value: ${input.currentValue}` : ''}
${input.context ? `Additional context: ${input.context}` : ''}

Business financials:
${financialSummary}`;

    // Rate limit + budget checks
    const rateCheck = checkRateLimit(orgId, 'explain');
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

    const llmResult = await callLLMCached({
      systemPrompt: EXPLAINER_PROMPT,
      userMessage,
      orgId,
      temperature: 0.2,
      model: 'haiku',
      maxTokens: 1024,
    });
    const rawResponse = llmResult.response;
    await trackTokenUsage(orgId, llmResult.tokensUsed, 'explain');

    // Parse JSON response
    const fenceMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = fenceMatch ? fenceMatch[1].trim() : rawResponse.match(/\{[\s\S]*\}/)?.[0] ?? rawResponse;

    try {
      const explanation = JSON.parse(jsonStr);

      // Governance checkpoint — audit trail for every AI explanation
      await governedOutput({
        orgId,
        userId: profile.id as string,
        outputType: 'term_explanation',
        content: JSON.stringify(explanation),
        modelTier: 'haiku',
        modelId: 'claude-haiku-4-20250414',
        dataSources: [{ type: 'financial_context', reference: `6-month summary for ${input.term}` }],
        tokensUsed: llmResult.tokensUsed,
        cached: false,
      });

      return NextResponse.json({ explanation });
    } catch {
      // Fallback: return raw text as personalised explanation
      return NextResponse.json({
        explanation: {
          term: input.term,
          plain_english: rawResponse.slice(0, 100),
          personalised_explanation: rawResponse.slice(0, 400),
          what_it_means: '',
          benchmark_context: '',
          tips: [],
        },
      });
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[explain] POST error:', e);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
}
