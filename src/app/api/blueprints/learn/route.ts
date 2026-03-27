import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { learnFromOrg } from '@/lib/blueprints/registry';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

const learnSchema = z.object({
  orgId: z.string().uuid('orgId must be a valid UUID'),
});

// POST /api/blueprints/learn -- Generate a blueprint from an org's current config
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('admin');

    const body = await request.json();
    const parsed = learnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { orgId } = parsed.data;

    // Verify user belongs to this org
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const blueprint = await learnFromOrg(orgId);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'blueprint.learned',
      entityType: 'industry_blueprint',
      metadata: {
        blueprintSlug: blueprint.slug,
        blueprintName: blueprint.name,
        accountMappings: blueprint.account_mappings.length,
        kpiDefinitions: blueprint.kpi_definitions.length,
      },
    });

    return NextResponse.json({
      message: `Generated blueprint "${blueprint.name}" from your current setup. It starts inactive and can be reviewed before sharing.`,
      blueprint,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : 'Failed to learn from org';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
