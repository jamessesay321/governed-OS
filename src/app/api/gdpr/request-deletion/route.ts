import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { sendEmail } from '@/lib/email/resend';
import { deletionRequestEmailTemplate } from '@/lib/gdpr/email-templates';

const requestSchema = z.object({
  reason: z.string().max(1000).optional(),
});

/**
 * POST /api/gdpr/request-deletion — Owner-only. Creates a deletion request.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('owner');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createUntypedServiceClient();

    // Check for existing pending/confirmed request
    const { data: existing } = await supabase
      .from('data_deletion_requests')
      .select('id, status')
      .eq('org_id', orgId)
      .in('status', ['pending', 'confirmed', 'processing'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A deletion request is already in progress.' },
        { status: 409 },
      );
    }

    // Create the deletion request
    const { data: deletionRequest, error } = await supabase
      .from('data_deletion_requests')
      .insert({
        org_id: orgId,
        requested_by: user.id,
        reason: parsed.data.reason ?? null,
      })
      .select('id, confirmation_token')
      .single();

    if (error || !deletionRequest) {
      console.error('[gdpr/request-deletion] Insert error:', error?.message);
      return NextResponse.json({ error: 'Failed to create deletion request' }, { status: 500 });
    }

    // Send confirmation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const confirmUrl = `${appUrl}/settings/data?confirm=${deletionRequest.confirmation_token}`;

    if (user.email) {
      try {
        await sendEmail({
          to: user.email,
          template: 'deletion-confirmation',
          subject: 'Confirm your data deletion request - Grove',
          html: deletionRequestEmailTemplate(confirmUrl),
        });
      } catch (emailErr) {
        console.error('[gdpr/request-deletion] Email error:', emailErr);
        // Continue — the request is created, user can confirm via UI
      }
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'gdpr.deletion_requested',
      entityType: 'data_deletion_request',
      entityId: deletionRequest.id as string,
      metadata: { reason: parsed.data.reason },
    });

    return NextResponse.json({
      id: deletionRequest.id,
      message: 'Deletion request created. Check your email for confirmation.',
    });
  } catch (error) {
    console.error('[gdpr/request-deletion] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
