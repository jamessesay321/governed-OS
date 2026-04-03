import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const paramsSchema = z.object({
  orgId: z.string().uuid(),
});

/**
 * GET /api/reconciliation/:orgId
 * Returns the latest reconciliation reports for the org.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = paramsSchema.parse(await params);
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();
    // TODO: regenerate Supabase types after running migration 027
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet (migration 027)
      .from('reconciliation_reports' as any)
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid org ID' }, { status: 400 });
    }
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[RECONCILIATION API] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/reconciliation/:orgId
 * Triggers an on-demand reconciliation run.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = paramsSchema.parse(await params);
    const { profile } = await requireRole('advisor');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Xero tokens
    const supabase = await createServiceClient();
    const { data: connection } = await supabase
      .from('xero_connections')
      .select('access_token, xero_tenant_id')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'No active Xero connection. Connect Xero first.' },
        { status: 400 }
      );
    }

    // Refresh tokens if needed
    const { getValidTokens } = await import('@/lib/xero/tokens');
    const tokens = await getValidTokens(orgId);

    const { runPostSyncReconciliation } = await import('@/lib/financial/post-sync-reconciliation');
    const results = await runPostSyncReconciliation(orgId, tokens.accessToken, tokens.tenantId);

    return NextResponse.json({
      success: true,
      periodsChecked: results.length,
      criticalCount: results.filter((r) => r.hasCritical).length,
      results,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid org ID' }, { status: 400 });
    }
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[RECONCILIATION API] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
