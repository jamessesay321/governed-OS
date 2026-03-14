import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { updateActionStatus, sortActionsByPriority } from '@/lib/playbook/actions';
import type { PlaybookAction, ActionStatus } from '@/types/playbook';

// In-memory store for actions (would be DB in production)
const actionsStore = new Map<string, PlaybookAction[]>();

type RouteParams = { params: Promise<{ orgId: string }> };

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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { actionId, status } = body as { actionId: string; status: ActionStatus };

    const validStatuses: readonly string[] = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const actions = actionsStore.get(orgId) || [];
    const actionIndex = actions.findIndex((a) => a.id === actionId);

    if (actionIndex === -1) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    actions[actionIndex] = updateActionStatus(actions[actionIndex], status);
    actionsStore.set(orgId, actions);

    return NextResponse.json({ action: actions[actionIndex] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
