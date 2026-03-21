import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { confirmRequestSchema } from '@/lib/schemas';
import { verifyConfirmationToken } from '@/lib/ai/confirmation-token';
import { runModelPipeline } from '@/lib/scenarios/scenario-pipeline';
import { logAudit } from '@/lib/audit/log';
import type { ProposedAssumptionChange } from '@/types';

type Params = { params: Promise<{ id: string }> };

// POST /api/scenarios/[id]/confirm — Confirm proposed changes (advisor+)
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: scenarioId } = await params;
    const { user, profile } = await requireRole('advisor');

    const body = await request.json();
    const { confirmationToken } = confirmRequestSchema.parse(body);

    // Verify token
    const tokenPayload = verifyConfirmationToken(confirmationToken, scenarioId);

    const supabase = await createServiceClient();

    // Fetch original change log row
    const { data: changeLog, error: clError } = await supabase
      .from('scenario_change_log')
      .select('*')
      .eq('id', tokenPayload.changeLogId)
      .eq('org_id', profile.org_id)
      .single();

    if (clError || !changeLog) {
      return NextResponse.json({ error: 'Change log not found' }, { status: 404 });
    }

    // Prevent double-confirm
    if (changeLog.user_confirmed) {
      return NextResponse.json({ error: 'Changes already confirmed' }, { status: 400 });
    }

    // Fetch scenario to get assumption_set_id
    const { data: scenario, error: scError } = await supabase
      .from('scenarios')
      .select('assumption_set_id')
      .eq('id', scenarioId)
      .eq('org_id', profile.org_id)
      .single();

    if (scError || !scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Apply changes: upsert each proposed change into assumption_values
    const proposedChanges = changeLog.proposed_changes as unknown as ProposedAssumptionChange[];

    for (const change of proposedChanges) {
      // Check if assumption already exists
      const { data: existing } = await supabase
        .from('assumption_values')
        .select('id')
        .eq('assumption_set_id', scenario.assumption_set_id)
        .eq('org_id', profile.org_id)
        .eq('key', change.key)
        .eq('effective_from', change.effective_from)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('assumption_values')
          .update({ value: change.new_value })
          .eq('id', existing.id);
      } else {
        // Insert new
        await supabase.from('assumption_values').insert({
          org_id: profile.org_id,
          assumption_set_id: scenario.assumption_set_id,
          category: change.category,
          key: change.key,
          label: change.label,
          type: change.type,
          value: change.new_value,
          effective_from: change.effective_from,
          effective_to: null,
          version: 1,
          created_by: user.id,
        });
      }
    }

    // Insert confirmed change log row (never update the proposed row)
    await supabase.from('scenario_change_log').insert({
      org_id: profile.org_id,
      scenario_id: scenarioId,
      change_type: 'confirmed' as const,
      natural_language_input: changeLog.natural_language_input,
      ai_interpretation: changeLog.ai_interpretation as Record<string, unknown>,
      proposed_changes: changeLog.proposed_changes as unknown as Record<string, unknown>[],
      confirmation_token: confirmationToken,
      user_confirmed: true,
      created_by: user.id,
    });

    // Run model pipeline to recalculate
    const pipelineResult = await runModelPipeline(profile.org_id, user.id, scenarioId);

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.chat_confirmed',
      entityType: 'scenario_change_log',
      entityId: tokenPayload.changeLogId,
      metadata: {
        scenarioId,
        changesApplied: proposedChanges.length,
        modelVersionId: pipelineResult.modelVersionId,
      },
    });

    return NextResponse.json({
      success: true,
      modelVersionId: pipelineResult.modelVersionId,
      snapshotCount: pipelineResult.snapshotCount,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[scenarios/confirm] POST error:', e);
    return NextResponse.json({ error: 'Failed to confirm changes' }, { status: 500 });
  }
}
