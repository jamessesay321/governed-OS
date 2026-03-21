import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getImpactsForOrg } from '@/lib/intelligence/impact-analyser';

// GET /api/intelligence/impacts/[orgId] — Get impacts for org (viewer+)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    // Enforce org_id scope — users can only see their own org's impacts
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const impacts = await getImpactsForOrg(orgId);
    return NextResponse.json(impacts);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[intelligence/impacts] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
