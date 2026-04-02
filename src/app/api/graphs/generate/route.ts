import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { governedOutput } from '@/lib/governance/checkpoint';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get orgId from user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();
    const orgId = userProfile?.org_id as string;

    const body = await req.json();
    const { prompt, chartType } = body as { prompt?: string; chartType?: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Rate limit + budget checks
    if (orgId) {
      const rateCheck = checkRateLimit(orgId, 'graphs-generate');
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
    }

    // Fetch real financial data to ground chart generation
    let financialContext = '';
    if (orgId) {
      const { data: financials } = await supabase
        .from('normalised_financials')
        .select('period, amount, chart_of_accounts!inner(name, class)')
        .eq('org_id', orgId)
        .order('period', { ascending: false })
        .limit(500);

      if (financials && financials.length > 0) {
        // Group by period and class for a summary
        const periodSummary = new Map<string, Record<string, number>>();
        for (const f of financials) {
          const acc = f.chart_of_accounts as unknown as { name: string; class: string };
          const period = f.period as string;
          if (!periodSummary.has(period)) periodSummary.set(period, {});
          const ps = periodSummary.get(period)!;
          const cls = acc.class.toUpperCase();
          ps[cls] = (ps[cls] ?? 0) + Number(f.amount);
        }

        const lines: string[] = [];
        for (const [period, classes] of Array.from(periodSummary.entries()).sort()) {
          const parts = Object.entries(classes).map(([cls, amt]) => `${cls}: ${amt.toFixed(2)}`).join(', ');
          lines.push(`${period}: ${parts}`);
        }
        financialContext = `\n\nHere is the business's REAL financial data by period and account class:\n${lines.join('\n')}\n\nUse this real data to generate the chart. Do NOT invent numbers - use the actual figures provided above.`;
      }
    }

    const systemPrompt = `You are a financial data visualization assistant for a business intelligence platform called Grove.

When given a chart request, generate a complete chart configuration as JSON using the business's REAL financial data.

Return ONLY valid JSON (no markdown fences, no explanation) with this exact structure:
{
  "title": "Chart title",
  "chartType": "bar" | "line" | "pie" | "area" | "waterfall" | "combo",
  "data": [array of data objects for Recharts],
  "dataKeys": [{"key": "fieldName", "color": "#hexcolor", "name": "Display Name"}],
  "xAxisKey": "the key used for x-axis labels",
  "summary": "One-line description of what the chart shows"
}

Rules:
- Use the business's REAL financial data provided below to generate accurate charts
- If no real data is available, generate realistic sample data for a UK small business (use GBP)
- Data should have 6-12 data points unless the request specifies otherwise
- Use professional colors: #10b981 (green/revenue), #3b82f6 (blue), #f43f5e (red/costs), #8b5cf6 (purple), #f59e0b (amber), #06b6d4 (cyan)
- For pie charts, each data item should have a "name" and "value" field, and include colors in each dataKey entry
- For waterfall charts, include a "value" field (positive for gains, negative for losses) and a "name" field
- Match the chart type to what makes most sense for the request
- The xAxisKey should match a key present in every data object${financialContext}`;

    const userMessage = chartType
      ? `Create a ${chartType} chart for: ${prompt.trim()}`
      : prompt.trim();

    const llmResult = orgId
      ? await callLLMCached({ systemPrompt, userMessage, orgId, temperature: 0.3 })
      : { response: await (await import('@/lib/ai/llm')).callLLM({ systemPrompt, userMessage, temperature: 0.3 }), cached: false, tokensUsed: 0 };
    const rawResponse = llmResult.response;

    if (orgId) {
      await trackTokenUsage(orgId, llmResult.tokensUsed, 'graphs-generate');
    }

    // Strip markdown fences if the LLM wrapped the response
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.title || !parsed.chartType || !Array.isArray(parsed.data) || !Array.isArray(parsed.dataKeys) || !parsed.xAxisKey) {
      return NextResponse.json({ error: 'AI returned incomplete chart data. Try again.' }, { status: 500 });
    }

    // Override chart type if specified by user
    if (chartType) {
      parsed.chartType = chartType;
    }

    // Governance checkpoint — audit trail for AI-generated charts
    if (orgId) {
      await governedOutput({
        orgId,
        userId: user.id,
        outputType: 'ask_grove_answer',
        content: JSON.stringify({ title: parsed.title, chartType: parsed.chartType, summary: parsed.summary }),
        modelTier: 'sonnet',
        modelId: 'claude-sonnet-4-20250514',
        dataSources: [
          { type: 'chart_generation', reference: prompt.slice(0, 100) },
        ],
        tokensUsed: llmResult.tokensUsed,
        cached: llmResult.cached,
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[graphs/generate]', err);

    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'AI response could not be parsed. Try rephrasing your request.' }, { status: 500 });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate chart' },
      { status: 500 }
    );
  }
}
