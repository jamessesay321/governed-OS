import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { activateModule, deactivateModule } from '@/lib/modules/registry';

type RouteParams = { params: Promise<{ orgId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { moduleId, active } = body as { moduleId: string; active: boolean };

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
    }

    let success: boolean;
    if (active) {
      success = activateModule(orgId, moduleId);
    } else {
      success = deactivateModule(orgId, moduleId);
    }

    if (!success) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: active ? 'Module activated' : 'Module deactivated',
      moduleId,
      active,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
