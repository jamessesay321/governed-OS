import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { callLLMWithUsage } from '@/lib/ai/llm';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining } from '@/lib/ai/token-budget';
import {
  executeQuery,
  interpretationSchema,
  type QueryInterpretation,
} from '@/lib/command/query-executor';
import { z } from 'zod';

export const maxDuration = 30;

const bodySchema = z.object({
  query: z.string().min(1).max(500),
  orgId: z.string().uuid(),
});

/**
 * POST /api/command/query
 *
 * Natural language query endpoint for the CMD+K command bar.
 * Interprets the user's question, builds a safe Supabase query,
 * executes it, and returns structured data for rendering.
 */
export async function POST(request: Request) {
  try {
    const { profile } = await requireRole('viewer');

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { query, orgId } = parsed.data;

    // Verify user belongs to this org
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit
    const rateCheck = checkRateLimit(orgId, 'command_query');
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
        { error: 'Monthly AI token budget exhausted.' },
        { status: 402 }
      );
    }

    // System prompt tells Claude to interpret the NL query into structured JSON
    const systemPrompt = `You are a financial data query interpreter for Advisory OS, a UK business intelligence platform.

Given a natural language question about financial data, return a structured JSON query plan.

Available tables and key columns:
- normalised_financials: org_id, period (YYYY-MM), amount (number), account_id, chart_of_accounts(name, class, type)
- chart_of_accounts: org_id, name, class (REVENUE, EXPENSE, ASSET, LIABILITY, EQUITY), type, account_code
- kpi_snapshots: org_id, kpi_key, value, period, benchmark_status
- detected_anomalies: org_id, title, severity (high, medium, low), description, created_at
- number_challenges: org_id, metric_label, reason, severity, status (open, resolved), created_at

You MUST respond with ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "queryPlan": {
    "table": "table_name",
    "select": "column1, column2",
    "filters": [{ "column": "col", "operator": "eq|neq|gt|gte|lt|lte|like|ilike|in", "value": "val" }],
    "orderBy": { "column": "col", "ascending": false },
    "limit": 50,
    "aggregate": "none|sum|count|avg",
    "groupBy": "optional_column"
  },
  "resultType": "chart|table|number|text",
  "chartType": "bar|line|pie",
  "title": "Short title for the result",
  "summary": "One-line explanation"
}

Rules:
- Use GBP currency context (UK business)
- For composition/breakdown/proportion/share queries, use chartType: "pie"
- For trends over time, use chartType: "line"
- For comparing categories, use chartType: "bar"
- For single-value answers (totals, counts), use resultType: "number"
- Always include org_id filter (it will be added automatically, do NOT include it in filters)
- Keep queries efficient: use appropriate limits and selects
- For period-based queries, use the YYYY-MM format
- The select string should use Supabase PostgREST syntax (e.g. "period, amount, chart_of_accounts!inner(name, class)")`;

    const llmResult = await callLLMWithUsage({
      systemPrompt,
      userMessage: query,
      model: 'haiku',
      temperature: 0.1,
      maxTokens: 1024,
      orgId,
      userId: profile.id as string,
      endpoint: 'command_query',
    });

    // Parse the interpretation
    let jsonStr = llmResult.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Could not interpret query. Try rephrasing.' },
        { status: 422 }
      );
    }

    let interpretation: QueryInterpretation;
    try {
      const raw = JSON.parse(jsonMatch[0]);
      interpretation = interpretationSchema.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'Could not interpret query. Try rephrasing.' },
        { status: 422 }
      );
    }

    // Execute the query
    const result = await executeQuery(interpretation, orgId);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[COMMAND/QUERY] Error:', err);

    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
