import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/scenarios/[id]/commentary — Get AI commentary (viewer+)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('viewer');
    const supabase = await createClient();

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
      .from('ai_commentary')
      .select('*')
      .eq('model_version_id', modelVersion.id)
      .eq('org_id', profile.org_id)
      .order('confidence_score', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
