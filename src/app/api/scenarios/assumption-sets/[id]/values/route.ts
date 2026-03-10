import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { addAssumptionValueSchema } from '@/lib/schemas';

type Params = { params: Promise<{ id: string }> };

// POST /api/scenarios/assumption-sets/[id]/values — Add assumption value (advisor+)
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = addAssumptionValueSchema.parse(body);

    const supabase = await createClient();

    // Verify assumption set exists and belongs to org
    const { data: set, error: setError } = await supabase
      .from('assumption_sets')
      .select('id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (setError || !set) {
      return NextResponse.json({ error: 'Assumption set not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('assumption_values')
      .insert({
        org_id: profile.org_id,
        assumption_set_id: id,
        category: parsed.category,
        key: parsed.key,
        label: parsed.label,
        type: parsed.type,
        value: parsed.value,
        effective_from: parsed.effectiveFrom,
        effective_to: parsed.effectiveTo,
        version: 1,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
