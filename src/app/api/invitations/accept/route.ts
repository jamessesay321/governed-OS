import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { invitationAcceptSchema } from '@/lib/schemas';

/**
 * POST /api/invitations/accept
 * Accept an organisation invitation by token.
 * Requires authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = invitationAcceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service client for cross-org operations
    const serviceClient = await createServiceClient();

    // Find the invitation
    const { data: invitation, error: invError } = await serviceClient
      .from('org_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      await serviceClient
        .from('org_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check email matches
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invitation email does not match your account' },
        { status: 403 }
      );
    }

    // Check if user already has a profile in this org
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .eq('org_id', invitation.org_id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'You are already a member of this organisation' },
        { status: 409 }
      );
    }

    // Create profile for the invited user
    const { error: profileError } = await serviceClient
      .from('profiles')
      .insert({
        id: user.id,
        org_id: invitation.org_id,
        role: invitation.role,
        display_name: user.user_metadata?.display_name || user.email || '',
      });

    if (profileError) {
      console.error('[INVITATION] Failed to create profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to join organisation' },
        { status: 500 }
      );
    }

    // Mark invitation as accepted
    await serviceClient
      .from('org_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    // Audit log
    await logAudit({
      orgId: invitation.org_id,
      userId: user.id,
      action: 'invitation.accepted',
      entityType: 'org_invitation',
      entityId: invitation.id,
      changes: { role: invitation.role, email: invitation.email },
    });

    return NextResponse.json({ orgId: invitation.org_id });
  } catch (err) {
    console.error('[INVITATION] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
