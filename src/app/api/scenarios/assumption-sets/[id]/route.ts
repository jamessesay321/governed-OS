import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/scenarios/assumption-sets/[id] — Get with values (viewer+)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

    const { data: assumptionSet, error: asError } = await supabase
      .from('assumption_sets')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (asError || !assumptionSet) {
      return NextResponse.json({ error: 'Assumption set not found' }, { status: 404 });
    }

    const { data: values, error: valError } = await supabase
      .from('assumption_values')
      .select('*')
      .eq('assumption_set_id', id)
      .eq('org_id', profile.org_id)
      .order('category')
      .order('key');

    if (valError) {
      return NextResponse.json({ error: valError.message }, { status: 500 });
    }

    return NextResponse.json({ assumptionSet, values });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
