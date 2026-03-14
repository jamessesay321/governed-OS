import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { calculateKPIs, persistKPISnapshots } from '@/lib/kpi/engine';
import type { BusinessType } from '@/lib/kpi/definitions';

// GET /api/kpi/[orgId]?period=YYYY-MM-01&type=universal — Get KPIs (viewer+)
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
    const businessType = (url.searchParams.get('type') || 'universal') as BusinessType;

    if (!period) {
      return NextResponse.json({ error: 'period query param required' }, { status: 400 });
    }

    const kpis = await calculateKPIs(orgId, period, businessType);
    return NextResponse.json(kpis);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    const status = e instanceof Error && e.name === 'AuthorizationError' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/kpi/[orgId] — Recalculate and persist KPIs (advisor+)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    await requireRole('advisor');
    const { orgId } = await params;
    const body = await request.json();
    const { period, type = 'universal' } = body as { period: string; type?: BusinessType };

    if (!period) {
      return NextResponse.json({ error: 'period is required' }, { status: 400 });
    }

    const kpis = await calculateKPIs(orgId, period, type);
    const stored = await persistKPISnapshots(orgId, period, kpis);

    return NextResponse.json({
      message: `Calculated ${kpis.length} KPIs, persisted ${stored}`,
      kpis,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Failed to calculate KPIs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
