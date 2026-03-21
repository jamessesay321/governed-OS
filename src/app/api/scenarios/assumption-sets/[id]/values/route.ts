import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { addAssumptionValueSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit/log';

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
      console.error('[assumption-values] POST error:', error.message);
      return NextResponse.json({ error: 'Failed to add assumption value' }, { status: 500 });
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'assumption_value.created',
      entityType: 'assumption_value',
      entityId: data.id,
      metadata: { assumptionSetId: id, key: parsed.key, category: parsed.category },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
