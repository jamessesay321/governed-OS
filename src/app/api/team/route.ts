import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { sendEmail } from '@/lib/email/resend';
import { invitationEmailTemplate } from '@/lib/email/templates';

// ============================================================
// Schemas
// ============================================================

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'advisor', 'viewer']),
});

// ============================================================
// GET /api/team — List team members + pending invitations
// ============================================================

export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const supabase = await createUntypedServiceClient();

    // Fetch members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (membersError) {
      console.error('[team] Failed to fetch members:', membersError.message);
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    // Fetch pending invitations
    const { data: invitations, error: invError } = await supabase
      .from('org_invitations')
      .select('id, email, role, status, invited_by, created_at, expires_at')
      .eq('org_id', orgId)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });

    if (invError) {
      console.error('[team] Failed to fetch invitations:', invError.message);
    }

    // Fetch org name for display
    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single();

    return NextResponse.json({
      members: members ?? [],
      invitations: invitations ?? [],
      orgName: (org as Record<string, unknown> | null)?.name ?? 'Your organisation',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[team] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// POST /api/team — Invite a new member
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;
    const supabase = await createUntypedServiceClient();

    // Check if already a member
    const { data: existingMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('org_id', orgId);

    // We need to check by email via auth, but profiles don't store email directly.
    // Instead, check if there's already a pending invitation for this email.
    const { data: existingInvite } = await supabase
      .from('org_invitations')
      .select('id, status')
      .eq('org_id', orgId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation is already pending for this email' },
        { status: 409 }
      );
    }

    // Create the invitation
    const { data: invitation, error: invError } = await supabase
      .from('org_invitations')
      .insert({
        org_id: orgId,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select('id, token, email, role, expires_at')
      .single();

    if (invError || !invitation) {
      console.error('[team] Failed to create invitation:', invError?.message);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    const typedInvitation = invitation as Record<string, unknown>;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.grove.dev';
    const inviteUrl = `${appUrl}/invite?token=${typedInvitation.token}`;

    // Fetch org name
    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single();

    const orgName = (org as Record<string, unknown> | null)?.name as string ?? 'your organisation';
    const inviterName = (profile.display_name as string) || 'A team member';

    // Send invitation email via Resend
    const html = invitationEmailTemplate(inviterName, orgName, inviteUrl);
    await sendEmail({
      to: email.toLowerCase(),
      template: 'invitation',
      html,
    }).catch((err) => {
      console.error('[team] Failed to send invitation email:', err);
    });

    // Audit log
    await logAudit({
      orgId,
      userId: user.id,
      action: 'team.member_invited',
      entityType: 'org_invitation',
      entityId: typedInvitation.id as string,
      metadata: { email, role },
    });

    return NextResponse.json({
      invitation: {
        id: typedInvitation.id,
        email: typedInvitation.email,
        role: typedInvitation.role,
        expiresAt: typedInvitation.expires_at,
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[team] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
