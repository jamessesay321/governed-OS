import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { sendEmail } from '@/lib/email/resend';

const InviteSchema = z.object({
  email: z.string().email('Valid email required'),
  orgId: z.string().uuid('Valid org ID required'),
  accessLevel: z.enum(['read']).default('read'),
});

/**
 * POST /api/auth/investor-invite
 * Owner/admin sends an investor invite with a magic link.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Verify caller is owner/admin of the org
    const body = await request.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, orgId, accessLevel } = parsed.data;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== orgId || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: owner or admin required' }, { status: 403 });
    }

    // Check for existing unexpired invite for this email + org
    const serviceClient = await createServiceClient();
    const { data: existing } = await serviceClient
      .from('investor_organisations')
      .select('id, magic_link_expires_at')
      .eq('org_id', orgId)
      .is('investor_user_id', null)
      .gte('magic_link_expires_at', new Date().toISOString())
      .limit(100);

    // We can't filter by email at DB level since the invite is token-based
    // but we allow multiple invites (each gets a unique token)

    // Create the invite row
    const { data: invite, error: insertError } = await serviceClient
      .from('investor_organisations')
      .insert({
        org_id: orgId,
        access_level: accessLevel,
        invited_by: user.id,
        investor_user_id: null,
      })
      .select('id, magic_link_token')
      .single();

    if (insertError || !invite) {
      console.error('[investor-invite] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // Build magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const magicLink = `${baseUrl}/investor-login?token=${invite.magic_link_token}`;

    // Fetch org name for the email
    const { data: org } = await serviceClient
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single();

    const orgName = org?.name ?? 'an organisation';

    // Send invite email
    await sendEmail({
      to: email,
      template: 'investor-invite',
      subject: `You've been invited to view financials for ${orgName} on Grove`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #18181b; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">G</div>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Investor Portal Access</h2>
          <p style="color: #52525b; line-height: 1.6; margin-bottom: 24px;">
            You have been invited to view financial data for <strong>${orgName}</strong> on Grove.
            Click the button below to access the investor dashboard.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${magicLink}" style="display: inline-block; padding: 12px 32px; background: #18181b; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
              View Investor Dashboard
            </a>
          </div>
          <p style="color: #a1a1aa; font-size: 13px; line-height: 1.5;">
            This link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    // Audit log
    await logAudit({
      orgId,
      userId: user.id,
      action: 'investor_invite_sent',
      entityType: 'investor_organisations',
      entityId: invite.id as string,
      metadata: { email, accessLevel },
    });

    return NextResponse.json({
      success: true,
      inviteId: invite.id,
      magicLink: process.env.NODE_ENV === 'development' ? magicLink : undefined,
    });
  } catch (err) {
    console.error('[investor-invite] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
