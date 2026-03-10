import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { updateScenarioSchema } from '@/lib/schemas';
import { getLatestModelSnapshots } from '@/lib/scenarios/snapshots';

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
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// PUT /api/scenarios/[id] — Update scenario metadata (advisor+)
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('advisor');
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
