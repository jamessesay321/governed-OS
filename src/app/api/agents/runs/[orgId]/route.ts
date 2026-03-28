import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/agents/runs/[orgId] — list recent agent runs for an org
export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const { searchParams } = new URL(_request.url);
    const agentId = searchParams.get('agentId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;

    const supabase = await createUntypedServiceClient();

    let query = supabase
      .from('agent_runs')
      .select('*')
      .eq('org_id', orgId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[agents/runs] GET error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }

    return NextResponse.json({ runs: data ?? [] });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[agents/runs] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
