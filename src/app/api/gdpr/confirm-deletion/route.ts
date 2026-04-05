import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const confirmSchema = z.object({
  confirmationToken: z.string().uuid(),
});

/**
 * POST /api/gdpr/confirm-deletion — Validates token, sets 72h cooling-off.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('owner');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createUntypedServiceClient();

    // Find the pending request with matching token
    const { data: deletionRequest } = await supabase
      .from('data_deletion_requests')
      .select('id, org_id, status')
      .eq('confirmation_token', parsed.data.confirmationToken)
      .eq('status', 'pending')
      .maybeSingle();

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation token.' },
        { status: 404 },
      );
    }

    if ((deletionRequest.org_id as string) !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Set confirmed + 72h cooling-off
    const now = new Date();
    const coolingOffUntil = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('data_deletion_requests')
      .update({
        status: 'confirmed',
        confirmed_at: now.toISOString(),
        cooling_off_until: coolingOffUntil.toISOString(),
      })
      .eq('id', deletionRequest.id);

    if (error) {
      console.error('[gdpr/confirm-deletion] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to confirm deletion' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'gdpr.deletion_confirmed',
      entityType: 'data_deletion_request',
      entityId: deletionRequest.id as string,
      metadata: { coolingOffUntil: coolingOffUntil.toISOString() },
    });

    return NextResponse.json({
      confirmed: true,
      coolingOffUntil: coolingOffUntil.toISOString(),
      message: 'Deletion confirmed. Data will be permanently deleted after the 72-hour cooling-off period.',
    });
  } catch (error) {
    console.error('[gdpr/confirm-deletion] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
