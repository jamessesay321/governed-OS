import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { activateModule, deactivateModule } from '@/lib/modules/registry';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

type RouteParams = { params: Promise<{ orgId: string }> };

const activateModuleSchema = z.object({
  moduleId: z.string().min(1),
  active: z.boolean(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = activateModuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input: moduleId and active are required' }, { status: 400 });
    }

    const { moduleId, active } = parsed.data;

    let success: boolean;
    if (active) {
      success = activateModule(orgId, moduleId);
    } else {
      success = deactivateModule(orgId, moduleId);
    }

    if (!success) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: active ? 'module.activated' : 'module.deactivated',
      entityType: 'module',
      entityId: moduleId,
    });

    return NextResponse.json({
      message: active ? 'Module activated' : 'Module deactivated',
      moduleId,
      active,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
  }
}
