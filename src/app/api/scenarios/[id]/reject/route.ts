import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ id: string }> };

// POST /api/scenarios/[id]/reject — Reject proposed changes (advisor+)
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: scenarioId } = await params;
    const { user, profile } = await requireRole('advisor');

    const body = await request.json();
    const { changeLogId } = body as { changeLogId: string };

    if (!changeLogId) {
      return NextResponse.json({ error: 'changeLogId is required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Fetch original change log row
    const { data: changeLog, error: clError } = await supabase
      .from('scenario_change_log')
      .select('*')
      .eq('id', changeLogId)
      .eq('org_id', profile.org_id)
      .single();

    if (clError || !changeLog) {
      return NextResponse.json({ error: 'Change log not found' }, { status: 404 });
    }

    // Insert rejected change log row (immutable — never update the proposed row)
    await supabase.from('scenario_change_log').insert({
      org_id: profile.org_id,
      scenario_id: scenarioId,
      change_type: 'rejected' as const,
      natural_language_input: changeLog.natural_language_input,
      ai_interpretation: changeLog.ai_interpretation as Record<string, unknown>,
      proposed_changes: changeLog.proposed_changes as unknown as Record<string, unknown>[],
      confirmation_token: null,
      user_confirmed: false,
      created_by: user.id,
    });

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.chat_rejected',
      entityType: 'scenario_change_log',
      entityId: changeLogId,
      metadata: { scenarioId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[scenarios/reject] POST error:', e);
    return NextResponse.json({ error: 'Failed to reject changes' }, { status: 500 });
  }
}
