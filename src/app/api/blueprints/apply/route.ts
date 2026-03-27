import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { applyBlueprint } from '@/lib/blueprints/registry';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const applySchema = z.object({
  orgId: z.string().uuid('orgId must be a valid UUID'),
  blueprintSlug: z.string().min(1, 'blueprintSlug is required'),
});

// POST /api/blueprints/apply -- Apply a blueprint to an organisation
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('admin');

    const body = await request.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { orgId, blueprintSlug } = parsed.data;

    // Verify user belongs to this org
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await applyBlueprint(orgId, blueprintSlug);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'blueprint.applied',
      entityType: 'industry_blueprint',
      metadata: {
        blueprintSlug,
        blueprintName: result.blueprint_name,
        accountMappings: result.account_mappings_count,
        kpiDefinitions: result.kpi_definitions_count,
        dashboardTemplate: result.dashboard_template_id,
      },
    });

    return NextResponse.json({
      message: `Applied "${result.blueprint_name}" blueprint successfully`,
      ...result,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : 'Failed to apply blueprint';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
