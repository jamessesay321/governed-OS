import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ memberId: string }> };

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'advisor', 'viewer']),
});

// ============================================================
// PATCH /api/team/[memberId] — Change a member's role
// ============================================================

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user, profile } = await requireRole('admin');
    const { memberId } = await params;
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Cannot change own role
    if (memberId === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Cannot change the org owner's role
    const supabase = await createUntypedServiceClient();
    const { data: target } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const targetTyped = target as Record<string, unknown>;
    if (targetTyped.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the organisation owner\'s role' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: parsed.data.role })
      .eq('id', memberId)
      .eq('org_id', orgId);

    if (updateError) {
      console.error('[team] Failed to update role:', updateError.message);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'team.role_changed',
      entityType: 'profile',
      entityId: memberId,
      changes: { previousRole: targetTyped.role, newRole: parsed.data.role },
    });

    return NextResponse.json({ success: true, role: parsed.data.role });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[team] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/team/[memberId] — Remove a member or cancel invitation
// ============================================================

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, profile } = await requireRole('admin');
    const { memberId } = await params;
    const orgId = profile.org_id as string;

    // Cannot remove yourself
    if (memberId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const supabase = await createUntypedServiceClient();

    // First check if it's a profile (member removal)
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, role, display_name')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .single();

    if (targetProfile) {
      const targetTyped = targetProfile as Record<string, unknown>;

      // Cannot remove the owner
      if (targetTyped.role === 'owner') {
        return NextResponse.json({ error: 'Cannot remove the organisation owner' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId)
        .eq('org_id', orgId);

      if (deleteError) {
        console.error('[team] Failed to remove member:', deleteError.message);
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
      }

      await logAudit({
        orgId,
        userId: user.id,
        action: 'team.member_removed',
        entityType: 'profile',
        entityId: memberId,
        metadata: { displayName: targetTyped.display_name, role: targetTyped.role },
      });

      return NextResponse.json({ success: true, type: 'member_removed' });
    }

    // Otherwise check if it's an invitation (cancel invitation)
    const { data: invitation } = await supabase
      .from('org_invitations')
      .select('id, email, status')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .single();

    if (invitation) {
      const { error: cancelError } = await supabase
        .from('org_invitations')
        .update({ status: 'expired' })
        .eq('id', memberId)
        .eq('org_id', orgId);

      if (cancelError) {
        console.error('[team] Failed to cancel invitation:', cancelError.message);
        return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
      }

      const invTyped = invitation as Record<string, unknown>;
      await logAudit({
        orgId,
        userId: user.id,
        action: 'team.invitation_cancelled',
        entityType: 'org_invitation',
        entityId: memberId,
        metadata: { email: invTyped.email },
      });

      return NextResponse.json({ success: true, type: 'invitation_cancelled' });
    }

    return NextResponse.json({ error: 'Member or invitation not found' }, { status: 404 });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[team] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
