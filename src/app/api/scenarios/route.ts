import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { createScenarioSchema } from '@/lib/schemas';
import { createScenario } from '@/lib/scenarios/scenario-pipeline';
import { logAudit } from '@/lib/audit/log';

// GET /api/scenarios — List scenarios (viewer+)
export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('scenarios')
      .select('*, assumption_sets(name, base_period_start, base_period_end, forecast_horizon_months)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[scenarios] GET error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/scenarios — Create scenario (advisor+)
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = createScenarioSchema.parse(body);

    const result = await createScenario(profile.org_id, user.id, parsed);

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.created',
      entityType: 'scenario',
      entityId: result.scenario.id,
      metadata: { name: parsed.name },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
