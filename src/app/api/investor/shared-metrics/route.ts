import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const SharedMetricSchema = z.object({
  orgId: z.string().uuid('Valid org ID required'),
  metricKey: z.string().min(1, 'Metric key required'),
  isShared: z.boolean(),
});

/**
 * POST /api/investor/shared-metrics
 * Toggle whether a KPI metric is shared with investors.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SharedMetricSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orgId, metricKey, isShared } = parsed.data;

    // Verify caller is owner/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== orgId || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = await createServiceClient();

    // Upsert the shared metric row
    const { error: upsertError } = await serviceClient
      .from('investor_shared_metrics')
      .upsert(
        {
          org_id: orgId,
          metric_key: metricKey,
          is_shared: isShared,
        },
        { onConflict: 'org_id,metric_key' }
      );

    if (upsertError) {
      console.error('[shared-metrics] Upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to update metric' }, { status: 500 });
    }

    await logAudit(
      {
        orgId,
        userId: user.id,
        action: 'investor_shared_metric_updated',
        entityType: 'investor_shared_metrics',
        changes: { metricKey, isShared },
      },
      { critical: false }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[shared-metrics] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
