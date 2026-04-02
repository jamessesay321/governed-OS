import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ ruleId: string }> };

const updateSchema = z.object({
  threshold: z.number().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  enabled: z.boolean().optional(),
});

/**
 * PATCH /api/kpi/alerts/[ruleId] — Update an alert rule
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user, profile } = await requireRole('advisor');
    const { ruleId } = await params;
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createUntypedServiceClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.threshold !== undefined) updates.threshold = parsed.data.threshold;
    if (parsed.data.severity !== undefined) updates.severity = parsed.data.severity;
    if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;

    const { error } = await supabase
      .from('kpi_alert_rules')
      .update(updates)
      .eq('id', ruleId)
      .eq('org_id', orgId);

    if (error) {
      console.error('[kpi/alerts] PATCH error:', error.message);
      return NextResponse.json({ error: 'Failed to update alert rule' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'kpi.alert_rule_updated',
      entityType: 'kpi_alert_rule',
      entityId: ruleId,
      changes: parsed.data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[kpi/alerts] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/kpi/alerts/[ruleId] — Delete an alert rule
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, profile } = await requireRole('admin');
    const { ruleId } = await params;
    const orgId = profile.org_id as string;

    const supabase = await createUntypedServiceClient();

    const { error } = await supabase
      .from('kpi_alert_rules')
      .delete()
      .eq('id', ruleId)
      .eq('org_id', orgId);

    if (error) {
      console.error('[kpi/alerts] DELETE error:', error.message);
      return NextResponse.json({ error: 'Failed to delete alert rule' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'kpi.alert_rule_deleted',
      entityType: 'kpi_alert_rule',
      entityId: ruleId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[kpi/alerts] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
