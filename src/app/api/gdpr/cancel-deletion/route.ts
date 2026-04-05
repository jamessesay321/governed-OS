import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const cancelSchema = z.object({
  requestId: z.string().uuid(),
});

/**
 * POST /api/gdpr/cancel-deletion — Cancel a pending/confirmed deletion during cooling-off.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('owner');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createUntypedServiceClient();

    // Find the request
    const { data: deletionRequest } = await supabase
      .from('data_deletion_requests')
      .select('id, org_id, status')
      .eq('id', parsed.data.requestId)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle();

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Deletion request not found or cannot be cancelled.' },
        { status: 404 },
      );
    }

    if ((deletionRequest.org_id as string) !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('data_deletion_requests')
      .update({ status: 'cancelled' })
      .eq('id', deletionRequest.id);

    if (error) {
      console.error('[gdpr/cancel-deletion] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'gdpr.deletion_cancelled',
      entityType: 'data_deletion_request',
      entityId: deletionRequest.id as string,
    });

    return NextResponse.json({
      cancelled: true,
      message: 'Deletion request has been cancelled. Your data is safe.',
    });
  } catch (error) {
    console.error('[gdpr/cancel-deletion] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
