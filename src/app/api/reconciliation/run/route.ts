import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  runReconciliation,
  runAllReconciliations,
  currentMonthPeriod,
} from '@/lib/reconciliation/engine';
import { logAudit } from '@/lib/audit/log';

export const maxDuration = 300;

const periodRegex = /^\d{4}-\d{2}-01$/;

const bodySchema = z
  .object({
    kpiKey: z.string().min(1).optional(),
    period: z.string().regex(periodRegex).optional(),
    orgId: z.string().uuid().optional(),
  })
  .strict();

/**
 * POST /api/reconciliation/run
 *
 * Triggers reconciliation. Two trigger paths:
 *
 *  1. CRON: request carries the X-Cron-Secret header. We then iterate over all
 *     orgs in reconciliation_kpis and run all enabled KPIs for each.
 *  2. MANUAL: authenticated advisor+ user. Runs either a single KPI (when
 *     kpiKey is supplied) or all enabled KPIs for the user's org. Period
 *     defaults to current month.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  // Cron path
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    return handleCron();
  }

  // Manual path — auth required
  let body: z.infer<typeof bodySchema> = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) {
      body = bodySchema.parse(JSON.parse(text));
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: err.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const { user, profile } = await requireRole('advisor');
    const orgId = (body.orgId as string | undefined) ?? (profile.org_id as string);

    // Cross-tenant guard
    if (orgId !== profile.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const period = body.period ?? currentMonthPeriod();

    if (body.kpiKey) {
      const result = await runReconciliation(orgId, body.kpiKey, period, 'manual');
      await logAudit(
        {
          orgId,
          userId: user.id,
          action: 'reconciliation.run',
          entityType: 'reconciliation_run',
          entityId: result.runId,
          metadata: {
            kpi_key: body.kpiKey,
            period,
            status: result.status,
            max_drift_pct: result.maxDriftPct,
          },
        },
        { critical: false }
      );
      return NextResponse.json({ success: true, results: [result] });
    }

    const results = await runAllReconciliations(orgId, period, 'manual');
    await logAudit(
      {
        orgId,
        userId: user.id,
        action: 'reconciliation.run_all',
        entityType: 'reconciliation_run',
        metadata: {
          period,
          kpi_count: results.length,
          red_count: results.filter((r) => r.status === 'red').length,
          amber_count: results.filter((r) => r.status === 'amber').length,
        },
      },
      { critical: false }
    );

    return NextResponse.json({ success: true, results });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('[RECON RUN] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'internal_error' },
      { status: 500 }
    );
  }
}

async function handleCron(): Promise<NextResponse> {
  try {
    const supabase = await createUntypedServiceClient();
    const { data: orgRows } = await supabase
      .from('reconciliation_kpis')
      .select('org_id')
      .eq('enabled', true);

    const orgIds = Array.from(
      new Set((orgRows ?? []).map((r: { org_id: string }) => r.org_id))
    );

    const period = currentMonthPeriod();
    const summaries: Array<{ orgId: string; runs: number; red: number; amber: number }> = [];

    for (const orgId of orgIds) {
      const results = await runAllReconciliations(orgId, period, 'cron');
      summaries.push({
        orgId,
        runs: results.length,
        red: results.filter((r) => r.status === 'red').length,
        amber: results.filter((r) => r.status === 'amber').length,
      });
    }

    return NextResponse.json({ success: true, period, summaries });
  } catch (err) {
    console.error('[RECON CRON] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'internal_error' },
      { status: 500 }
    );
  }
}
