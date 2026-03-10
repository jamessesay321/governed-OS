import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { addSegmentInputSchema } from '@/lib/schemas';

type Params = { params: Promise<{ id: string }> };

// GET /api/scenarios/assumption-sets/[id]/segments — List segment assumptions
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assumption_values')
      .select('*')
      .eq('assumption_set_id', id)
      .eq('org_id', profile.org_id)
      .eq('category', 'revenue_drivers')
      .like('key', 'segment_%')
      .order('key');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// POST /api/scenarios/assumption-sets/[id]/segments — Add segment inputs as assumption values (advisor+)
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = addSegmentInputSchema.parse(body);

    const supabase = await createClient();

    // Verify assumption set belongs to org
    const { data: set, error: setError } = await supabase
      .from('assumption_sets')
      .select('id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (setError || !set) {
      return NextResponse.json({ error: 'Assumption set not found' }, { status: 404 });
    }

    // Map segment input fields to individual assumption_values rows
    const fields: Array<{ suffix: string; value: number }> = [
      { suffix: 'units', value: parsed.unitsSold },
      { suffix: 'price', value: parsed.revenuePerUnit },
      { suffix: 'varcost', value: parsed.variableCostPerUnit },
      { suffix: 'acqspend', value: parsed.acquisitionSpend },
      { suffix: 'customers', value: parsed.customersAcquired },
      { suffix: 'lifespan', value: parsed.avgCustomerLifespanMonths },
      { suffix: 'arpc', value: parsed.avgRevenuePerCustomerPerMonth },
    ];

    const rows = fields.map((f) => ({
      org_id: profile.org_id,
      assumption_set_id: id,
      category: 'revenue_drivers' as const,
      key: `segment_${parsed.segmentKey}_${f.suffix}`,
      label: `${parsed.segmentLabel} — ${f.suffix}`,
      type: 'decimal' as const,
      value: f.value,
      effective_from: parsed.effectiveFrom,
      effective_to: null,
      version: 1,
      created_by: user.id,
    }));

    const { data, error } = await supabase
      .from('assumption_values')
      .upsert(rows, { onConflict: 'assumption_set_id,key,effective_from' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ segmentKey: parsed.segmentKey, values: data }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
