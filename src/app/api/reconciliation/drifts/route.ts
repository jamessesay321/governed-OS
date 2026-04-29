import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const STATUSES = ['open', 'investigating', 'resolved', 'wont_fix'] as const;

/**
 * GET /api/reconciliation/drifts
 *
 * Returns the org's drift_log. Supports optional filters:
 *   ?status=open|investigating|resolved|wont_fix
 *   ?kpi_key=monthly_revenue
 */
export async function GET(req: NextRequest) {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const kpiKey = url.searchParams.get('kpi_key');

    const supabase = await createUntypedServiceClient();
    let query = supabase
      .from('drift_log')
      .select(
        `
        id, period, drift_pct, drift_amount, status, severity,
        root_cause, resolution, opened_at, closed_at,
        kpi_id, run_id,
        reconciliation_kpis!inner(kpi_key, label)
      `
      )
      .eq('org_id', orgId)
      .order('opened_at', { ascending: false })
      .limit(200);

    if (statusFilter && (STATUSES as readonly string[]).includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }
    if (kpiKey) {
      query = query.eq('reconciliation_kpis.kpi_key', kpiKey);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ drifts: data ?? [] });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('[RECON DRIFTS GET] error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

const updateSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(STATUSES).optional(),
    root_cause: z.string().max(2000).optional(),
    resolution: z.string().max(2000).optional(),
  })
  .strict();

/**
 * POST /api/reconciliation/drifts
 *
 * Update a drift_log entry. Body { id, status?, root_cause?, resolution? }.
 * Closing a drift (status = resolved | wont_fix) sets closed_at + closed_by.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await requireRole('advisor');
    const orgId = profile.org_id as string;

    let body: z.infer<typeof updateSchema>;
    try {
      body = updateSchema.parse(await req.json());
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request', details: err.flatten() },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const supabase = await createUntypedServiceClient();
    // Tenant guard — confirm row belongs to org before update
    const { data: existing, error: lookupErr } = await supabase
      .from('drift_log')
      .select('id, status, org_id')
      .eq('id', body.id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isClosing =
      body.status &&
      (body.status === 'resolved' || body.status === 'wont_fix') &&
      existing.status !== body.status;

    const update: Record<string, unknown> = {};
    if (body.status) update.status = body.status;
    if (body.root_cause !== undefined) update.root_cause = body.root_cause;
    if (body.resolution !== undefined) update.resolution = body.resolution;
    if (isClosing) {
      update.closed_at = new Date().toISOString();
      update.closed_by = user.id;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('drift_log')
      .update(update)
      .eq('id', body.id)
      .eq('org_id', orgId)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logAudit(
      {
        orgId,
        userId: user.id,
        action: 'reconciliation.drift_update',
        entityType: 'drift_log',
        entityId: body.id,
        changes: update,
      },
      { critical: false }
    );

    return NextResponse.json({ success: true, drift: updated });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('[RECON DRIFTS POST] error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
