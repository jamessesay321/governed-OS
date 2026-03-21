import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { lockScenario } from '@/lib/scenarios/scenario-pipeline';

type Params = { params: Promise<{ id: string }> };

// POST /api/scenarios/[id]/lock — Lock scenario (admin+)
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('admin');

    await lockScenario(profile.org_id, user.id, id);

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[scenarios/lock] POST error:', e);
    return NextResponse.json({ error: 'Failed to lock scenario' }, { status: 500 });
  }
}
