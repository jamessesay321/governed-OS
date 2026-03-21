import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { calculateKPIs, persistKPISnapshots } from '@/lib/kpi/engine';
import { logAudit } from '@/lib/audit/log';
import { autoStoreToVault } from '@/lib/vault/auto-store';
import { z } from 'zod';
import type { BusinessType } from '@/lib/kpi/definitions';

const VALID_BUSINESS_TYPES = ['universal', 'saas', 'ecommerce', 'services'] as const;

const kpiPersistSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
  type: z.enum(VALID_BUSINESS_TYPES).default('universal'),
});

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
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to calculate KPIs' }, { status: 500 });
  }
}

// POST /api/kpi/[orgId] — Recalculate and persist KPIs (advisor+)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('advisor');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = kpiPersistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input: period (YYYY-MM-01) is required' }, { status: 400 });
    }

    const { period, type } = parsed.data;
    const kpis = await calculateKPIs(orgId, period, type);
    const stored = await persistKPISnapshots(orgId, period, kpis);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'kpi.persisted',
      entityType: 'kpi_snapshot',
      metadata: { period, type, kpiCount: kpis.length, stored },
    });

    // Auto-store to Knowledge Vault (best-effort)
    autoStoreToVault({
      orgId,
      userId: user.id,
      itemType: 'kpi_snapshot',
      title: `KPI Snapshot — ${period}`,
      description: `${kpis.length} ${type} KPIs for period ${period}`,
      tags: ['kpi', type, period, 'auto-generated'],
      content: { period, type, kpiCount: kpis.length, kpis },
      provenance: { data_freshness_at: new Date().toISOString() },
      periodStart: period,
      periodEnd: period,
    });

    return NextResponse.json({
      message: `Calculated ${kpis.length} KPIs, persisted ${stored}`,
      kpis,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to calculate KPIs' }, { status: 500 });
  }
}
