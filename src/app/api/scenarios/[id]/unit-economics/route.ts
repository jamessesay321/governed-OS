import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/scenarios/[id]/unit-economics — Get unit economics (viewer+)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

    // Get latest model version
    const { data: modelVersion } = await supabase
      .from('model_versions')
      .select('id')
      .eq('scenario_id', id)
      .eq('org_id', profile.org_id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!modelVersion) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabase
      .from('unit_economics_snapshots')
      .select('*')
      .eq('model_version_id', modelVersion.id)
      .eq('org_id', profile.org_id)
      .order('period', { ascending: true });

    if (error) {
      console.error('[scenarios/unit-economics] GET query error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch unit economics' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[scenarios/unit-economics] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
