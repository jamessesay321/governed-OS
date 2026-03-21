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
      console.error('[assumption-sets] GET values error:', valError.message);
      return NextResponse.json({ error: 'Failed to fetch assumption values' }, { status: 500 });
    }

    return NextResponse.json({ assumptionSet, values });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[assumption-sets] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
