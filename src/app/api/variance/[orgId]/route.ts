import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { calculateVariances } from '@/lib/variance/engine';

// GET /api/variance/[orgId]?period=YYYY-MM-01 — Get variance analysis (viewer+)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const period = url.searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'period query param required' }, { status: 400 });
    }

    const report = await calculateVariances(orgId, period);
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    const status = e instanceof Error && e.name === 'AuthorizationError' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
