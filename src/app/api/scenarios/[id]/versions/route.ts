import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/scenarios/[id]/versions — List versions (viewer+)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('scenario_versions')
      .select('*')
      .eq('scenario_id', id)
      .eq('org_id', profile.org_id)
      .order('version', { ascending: false });

    if (error) {
      console.error('[scenarios/versions] GET query error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[scenarios/versions] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
