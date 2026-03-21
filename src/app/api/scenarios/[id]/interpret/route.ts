import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { interpretRequestSchema } from '@/lib/schemas';
import { interpretScenarioRequest } from '@/lib/ai/interpret-scenario';
import { generateConfirmationToken } from '@/lib/ai/confirmation-token';
import { logAudit } from '@/lib/audit/log';
import { llmLimiter } from '@/lib/rate-limit';

type Params = { params: Promise<{ id: string }> };

// POST /api/scenarios/[id]/interpret — Interpret natural language (advisor+)
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: scenarioId } = await params;
    const { user, profile } = await requireRole('advisor');

    // Rate limit: 10 LLM calls per minute per org
    const limited = llmLimiter.check(profile.org_id);
    if (limited) return limited;

    const body = await request.json();
    const input = interpretRequestSchema.parse(body);

    // Verify scenario exists, belongs to org, not locked
    const supabase = await createServiceClient();
    const { data: scenario, error: scError } = await supabase
      .from('scenarios')
      .select('*, assumption_sets(*)')
      .eq('id', scenarioId)
      .eq('org_id', profile.org_id)
      .single();

    if (scError || !scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    if (scenario.status === 'locked') {
      return NextResponse.json({ error: 'Scenario is locked' }, { status: 400 });
    }

    // Run interpretation engine (supports what_if and goalseek modes)
    const result = await interpretScenarioRequest({
      orgId: profile.org_id,
      naturalLanguageInput: input.naturalLanguageInput,
      basePeriodStart: input.basePeriodStart,
      basePeriodEnd: input.basePeriodEnd,
      forecastHorizonMonths: input.forecastHorizonMonths,
      currentAssumptionSetId: scenario.assumption_set_id,
      mode: input.mode,
    });

    // Generate changeLogId and confirmation token before insert
    // (scenario_change_log is immutable — no updates allowed)
    const changeLogId = randomUUID();
    let confirmationToken: string | null = null;

    if (!result.needsClarification) {
      confirmationToken = generateConfirmationToken(
        scenarioId,
        changeLogId,
        result.interpretation.assumption_changes
      );
    }

    // Insert change log row (proposed) with token already set
    const { error: clError } = await supabase
      .from('scenario_change_log')
      .insert({
        id: changeLogId,
        org_id: profile.org_id,
        scenario_id: scenarioId,
        change_type: 'proposed' as const,
        natural_language_input: input.naturalLanguageInput,
        ai_interpretation: result.interpretation as unknown as Record<string, unknown>,
        proposed_changes: result.interpretation.assumption_changes as unknown as Record<string, unknown>[],
        confirmation_token: confirmationToken,
        user_confirmed: false,
        created_by: user.id,
      });

    if (clError) {
      console.error('[scenarios/interpret] Change log insert error:', clError.message);
      return NextResponse.json(
        { error: 'Failed to log change' },
        { status: 500 }
      );
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.chat_interpreted',
      entityType: 'scenario_change_log',
      entityId: changeLogId,
      metadata: {
        scenarioId,
        mode: input.mode,
        confidence: result.interpretation.confidence,
        needsClarification: result.needsClarification,
        changeCount: result.interpretation.assumption_changes.length,
      },
    });

    return NextResponse.json({
      needsClarification: result.needsClarification,
      interpretation: result.interpretation,
      confirmationToken,
      changeLogId,
      warnings: result.warnings,
      mode: input.mode,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[scenarios/interpret] POST error:', e);
    return NextResponse.json({ error: 'Failed to interpret scenario request' }, { status: 500 });
  }
}
