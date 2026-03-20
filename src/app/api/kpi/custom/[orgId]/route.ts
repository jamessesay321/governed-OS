import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const customKPISchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/, 'Must be lowercase snake_case'),
  label: z.string().min(1).max(128),
  description: z.string().max(512).optional().default(''),
  format: z.enum(['currency', 'percentage', 'months', 'ratio', 'number', 'days']),
  higher_is_better: z.boolean(),
  formula_numerator: z.string().min(1).max(256),
  formula_denominator: z.string().max(256).optional().default(''),
  target_value: z.number().optional(),
  alert_threshold: z.number().optional(),
  alert_direction: z.enum(['above', 'below']).optional(),
});

const updateSchema = customKPISchema.partial().extend({
  id: z.string().uuid(),
});

/**
 * GET /api/kpi/custom/[orgId]
 * List all custom KPIs for the organisation.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TODO: Switch to typed client after regenerating Supabase types
    const supabase = await createUntypedServiceClient();

    const { data: customKPIs, error } = await supabase
      .from('custom_kpis')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      // Table may not exist yet
      return NextResponse.json({ kpis: [] });
    }

    return NextResponse.json({ kpis: customKPIs ?? [] });
  } catch (err) {
    console.error('[CUSTOM_KPI] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch custom KPIs' }, { status: 500 });
  }
}

/**
 * POST /api/kpi/custom/[orgId]
 * Create a new custom KPI. Requires admin role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = customKPISchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const supabase = await createUntypedServiceClient();

    // Check for duplicate key within org
    const { data: existing } = await supabase
      .from('custom_kpis')
      .select('id')
      .eq('org_id', orgId)
      .eq('key', parsed.data.key)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `KPI with key "${parsed.data.key}" already exists` },
        { status: 409 }
      );
    }

    const { data: created, error } = await supabase
      .from('custom_kpis')
      .insert({
        org_id: orgId,
        created_by: user.id,
        ...parsed.data,
      })
      .select()
      .single();

    if (error) {
      console.error('[CUSTOM_KPI] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create custom KPI' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'custom_kpi.created',
      entityType: 'custom_kpi',
      entityId: created.id,
      metadata: { key: parsed.data.key, label: parsed.data.label },
    });

    return NextResponse.json({ kpi: created }, { status: 201 });
  } catch (err) {
    console.error('[CUSTOM_KPI] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create custom KPI' }, { status: 500 });
  }
}

/**
 * PUT /api/kpi/custom/[orgId]
 * Update a custom KPI. Requires admin role.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;
    const supabase = await createUntypedServiceClient();

    const { data: updated, error } = await supabase
      .from('custom_kpis')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('[CUSTOM_KPI] Update error:', error);
      return NextResponse.json({ error: 'Failed to update custom KPI' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'custom_kpi.updated',
      entityType: 'custom_kpi',
      entityId: id,
      metadata: updates,
    });

    return NextResponse.json({ kpi: updated });
  } catch (err) {
    console.error('[CUSTOM_KPI] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update custom KPI' }, { status: 500 });
  }
}

/**
 * DELETE /api/kpi/custom/[orgId]
 * Delete a custom KPI. Requires admin role.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const supabase = await createUntypedServiceClient();

    const { error } = await supabase
      .from('custom_kpis')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      console.error('[CUSTOM_KPI] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete custom KPI' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'custom_kpi.deleted',
      entityType: 'custom_kpi',
      entityId: id,
      metadata: {},
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[CUSTOM_KPI] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete custom KPI' }, { status: 500 });
  }
}
