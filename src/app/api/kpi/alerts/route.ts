import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const alertRuleSchema = z.object({
  metricKey: z.string().min(1).max(100),
  metricLabel: z.string().min(1).max(200),
  condition: z.enum(['above', 'below', 'change_above', 'change_below']),
  threshold: z.number(),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/kpi/alerts — List alert rules for the user's org
 */
export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;
    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('kpi_alert_rules')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[kpi/alerts] GET error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch alert rules' }, { status: 500 });
    }

    return NextResponse.json({ rules: data ?? [] });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[kpi/alerts] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/kpi/alerts — Create a new alert rule
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('advisor');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = alertRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('kpi_alert_rules')
      .insert({
        org_id: orgId,
        metric_key: parsed.data.metricKey,
        metric_label: parsed.data.metricLabel,
        condition: parsed.data.condition,
        threshold: parsed.data.threshold,
        severity: parsed.data.severity,
        enabled: parsed.data.enabled,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An alert rule for this metric and condition already exists' },
          { status: 409 }
        );
      }
      console.error('[kpi/alerts] POST error:', error.message);
      return NextResponse.json({ error: 'Failed to create alert rule' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'kpi.alert_rule_created',
      entityType: 'kpi_alert_rule',
      entityId: data.id,
      metadata: { metricKey: parsed.data.metricKey, condition: parsed.data.condition },
    });

    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[kpi/alerts] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
