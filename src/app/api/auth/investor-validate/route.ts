import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const ValidateSchema = z.object({
  token: z.string().uuid('Valid token required'),
});

/**
 * POST /api/auth/investor-validate
 * Validates a magic link token, marks the invite as accepted,
 * and associates the current user (or creates a session).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ValidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid token format', code: 'invalid' },
        { status: 400 }
      );
    }

    const { token } = parsed.data;
    const serviceClient = await createServiceClient();

    // Look up the invite by magic_link_token
    const { data: invite, error: lookupError } = await serviceClient
      .from('investor_organisations')
      .select('id, org_id, magic_link_expires_at, accepted_at, investor_user_id')
      .eq('magic_link_token', token)
      .single();

    if (lookupError || !invite) {
      return NextResponse.json(
        { error: 'Invite not found', code: 'invalid' },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invite.accepted_at) {
      // Already accepted — just redirect (idempotent)
      return NextResponse.json({ success: true, orgId: invite.org_id });
    }

    // Check expiry
    const expiresAt = new Date(invite.magic_link_expires_at as string);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired', code: 'expired' },
        { status: 410 }
      );
    }

    // Get current authenticated user (if any)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in — they need to sign up / log in first, then revisit
      // For now, return a hint to the client
      return NextResponse.json(
        {
          error: 'Please sign in or create an account first, then click the invite link again.',
          code: 'unauthenticated',
        },
        { status: 401 }
      );
    }

    // Accept the invite: set investor_user_id and accepted_at
    const { error: updateError } = await serviceClient
      .from('investor_organisations')
      .update({
        investor_user_id: user.id,
        accepted_at: new Date().toISOString(),
        // Clear token after use for security
        magic_link_token: null,
      })
      .eq('id', invite.id as string);

    if (updateError) {
      console.error('[investor-validate] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
    }

    // Ensure the user has an investor profile row (create if needed)
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      // Create a minimal investor profile
      await serviceClient.from('profiles').insert({
        id: user.id,
        org_id: invite.org_id as string,
        role: 'investor' as const,
        display_name: user.email?.split('@')[0] ?? 'Investor',
      });
    }

    // Audit log
    await logAudit(
      {
        orgId: invite.org_id as string,
        userId: user.id,
        action: 'investor_invite_accepted',
        entityType: 'investor_organisations',
        entityId: invite.id as string,
      },
      { critical: false }
    );

    return NextResponse.json({ success: true, orgId: invite.org_id as string });
  } catch (err) {
    console.error('[investor-validate] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
