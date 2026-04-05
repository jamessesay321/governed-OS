import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { callLLMWithUsage } from '@/lib/ai/llm';
import { logAudit } from '@/lib/audit/log';

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

const explainSchema = z.object({
  alertRuleId: z.string().uuid(),
  metricKey: z.string().min(1).max(100),
  currentValue: z.number(),
  threshold: z.number(),
  orgId: z.string().uuid(),
});

/* ------------------------------------------------------------------ */
/*  POST /api/alerts/explain                                           */
/*  Calls Claude Haiku for a 2-sentence explanation of why a metric    */
/*  changed and a suggested action.                                    */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('viewer');
    const userOrgId = profile.org_id as string;

    const body = await request.json();
    const parsed = explainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Ensure the org in the request matches the user's org (prevent cross-tenant)
    if (parsed.data.orgId !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { metricKey, currentValue, threshold, orgId, alertRuleId } = parsed.data;

    const direction = currentValue > threshold ? 'exceeded' : 'fallen below';
    const delta = Math.abs(currentValue - threshold);

    const systemPrompt = `You are a UK financial analyst assistant for a small or medium business.
You explain KPI changes concisely. Always use GBP for monetary values.
Be specific and actionable. Do not use jargon.`;

    const userMessage = `The KPI "${metricKey}" has ${direction} its alert threshold.

Current value: ${currentValue}
Threshold: ${threshold}
Difference: ${delta}

In exactly 2 sentences, explain the most likely reason this metric changed.
Then in 1 sentence, suggest a specific action the business owner should take.

Respond in JSON format:
{"explanation": "...", "suggestedAction": "..."}`;

    const response = await callLLMWithUsage({
      systemPrompt,
      userMessage,
      model: 'haiku',
      maxTokens: 256,
      temperature: 0.3,
      orgId,
      userId: user.id,
      endpoint: 'alerts.explain',
    });

    // Parse the JSON response from Claude
    let explanation = 'Unable to generate explanation.';
    let suggestedAction = 'Review the metric in your dashboard.';

    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonStr = response.text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      if (typeof parsed.explanation === 'string') {
        explanation = parsed.explanation;
      }
      if (typeof parsed.suggestedAction === 'string') {
        suggestedAction = parsed.suggestedAction;
      }
    } catch {
      // If JSON parsing fails, use the raw text as explanation
      explanation = response.text.trim();
    }

    await logAudit(
      {
        orgId,
        userId: user.id,
        action: 'alert.explanation_requested',
        entityType: 'kpi_alert_rule',
        entityId: alertRuleId,
        metadata: {
          metricKey,
          currentValue,
          threshold,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
        },
      },
      { critical: false },
    );

    return NextResponse.json({
      explanation,
      suggestedAction,
      tokens: {
        input: response.inputTokens,
        output: response.outputTokens,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[alerts/explain] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
