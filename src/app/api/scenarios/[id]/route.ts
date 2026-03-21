import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { updateScenarioSchema } from '@/lib/schemas';
import { getLatestModelSnapshots } from '@/lib/scenarios/snapshots';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ id: string }> };

// GET /api/scenarios/[id] — Get scenario + latest snapshots (viewer+)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

    const { data: scenario, error } = await supabase
      .from('scenarios')
      .select('*, assumption_sets(*)')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const { snapshots, modelVersionId } = await getLatestModelSnapshots(profile.org_id, id);

    return NextResponse.json({ scenario, snapshots, modelVersionId });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/scenarios/[id] — Update scenario metadata (advisor+)
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = updateScenarioSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('scenarios')
      .update(parsed)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) {
      console.error('[scenario] PUT error:', error.message);
      return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.updated',
      entityType: 'scenario',
      entityId: id,
      changes: parsed as Record<string, unknown>,
    });

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
