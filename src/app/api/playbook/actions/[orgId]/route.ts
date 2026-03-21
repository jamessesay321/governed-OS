import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { updateActionStatus, sortActionsByPriority } from '@/lib/playbook/actions';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import type { PlaybookAction } from '@/types/playbook';

// In-memory store for actions (would be DB in production)
const actionsStore = new Map<string, PlaybookAction[]>();

type RouteParams = { params: Promise<{ orgId: string }> };

const updateActionSchema = z.object({
  actionId: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'completed']),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actions = actionsStore.get(orgId) || [];
    const sorted = sortActionsByPriority(actions);

    return NextResponse.json({ actions: sorted });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { actionId, status } = parsed.data;
    const actions = actionsStore.get(orgId) || [];
    const actionIndex = actions.findIndex((a) => a.id === actionId);

    if (actionIndex === -1) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    actions[actionIndex] = updateActionStatus(actions[actionIndex], status);
    actionsStore.set(orgId, actions);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'playbook.action_status_updated',
      entityType: 'playbook_action',
      entityId: actionId,
      changes: { status },
    });

    return NextResponse.json({ action: actions[actionIndex] });
  } catch {
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
  }
}
