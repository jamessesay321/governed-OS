import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getLatestModelSnapshots } from '@/lib/scenarios/snapshots';

type Params = { params: Promise<{ id: string }> };

// GET /api/scenarios/[id]/snapshots — Get model snapshots (viewer+)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { profile } = await requireRole('viewer');

    const { snapshots, modelVersionId } = await getLatestModelSnapshots(profile.org_id, id);

    return NextResponse.json({ snapshots, modelVersionId });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
