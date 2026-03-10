import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { createScenarioSchema } from '@/lib/schemas';
import { createScenario } from '@/lib/scenarios/scenario-pipeline';

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// POST /api/scenarios — Create scenario (advisor+)
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = createScenarioSchema.parse(body);

    const result = await createScenario(profile.org_id, user.id, parsed);

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
