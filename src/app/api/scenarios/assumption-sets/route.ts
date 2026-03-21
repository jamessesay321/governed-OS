import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { createAssumptionSetSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit/log';

// GET /api/scenarios/assumption-sets — List assumption sets (viewer+)
export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assumption_sets')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[assumption-sets] GET error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch assumption sets' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/scenarios/assumption-sets — Create assumption set (advisor+)
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = createAssumptionSetSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assumption_sets')
      .insert({
        org_id: profile.org_id,
        name: parsed.name,
        description: parsed.description,
        version: 1,
        base_period_start: parsed.basePeriodStart,
        base_period_end: parsed.basePeriodEnd,
        forecast_horizon_months: parsed.forecastHorizonMonths,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[assumption-sets] POST error:', error.message);
      return NextResponse.json({ error: 'Failed to create assumption set' }, { status: 500 });
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'assumption_set.created',
      entityType: 'assumption_set',
      entityId: data.id,
      metadata: { name: parsed.name },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
