import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, chartType } = body as { prompt?: string; chartType?: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are a financial data visualization assistant for a business intelligence platform called Grove.

When given a chart request, generate a complete chart configuration as JSON.

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
- Generate realistic but fictional financial data for a UK small business (use £ currency)
- Data should have 6-12 data points unless the request specifies otherwise
- Use professional colors: #10b981 (green/revenue), #3b82f6 (blue), #f43f5e (red/costs), #8b5cf6 (purple), #f59e0b (amber), #06b6d4 (cyan)
- For pie charts, each data item should have a "name" and "value" field, and include colors in each dataKey entry
- For waterfall charts, include a "value" field (positive for gains, negative for losses) and a "name" field
- Match the chart type to what makes most sense for the request
- Keep numbers realistic for a company doing £500K-£1M annual revenue
- The xAxisKey should match a key present in every data object`;

    const userMessage = chartType
      ? `Create a ${chartType} chart for: ${prompt.trim()}`
      : prompt.trim();

    const rawResponse = await callLLM({
      systemPrompt,
      userMessage,
      temperature: 0.3,
    });

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
