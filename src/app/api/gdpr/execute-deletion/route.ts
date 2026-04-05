import { NextResponse } from 'next/server';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { cascadeDeleteOrg } from '@/lib/gdpr/cascade-delete';
import { logAudit } from '@/lib/audit/log';

export const maxDuration = 30;

/**
 * POST /api/gdpr/execute-deletion — Execute deletions past cooling-off.
 * Called by cron or manually. Uses service role.
 *
 * Requires CRON_SECRET header for security (or called from admin panel).
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret for automated calls
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createUntypedServiceClient();
    const now = new Date().toISOString();

    // Find confirmed requests past cooling-off
    const { data: requests, error: fetchError } = await supabase
      .from('data_deletion_requests')
      .select('id, org_id, requested_by')
      .eq('status', 'confirmed')
      .lte('cooling_off_until', now);

    if (fetchError) {
      console.error('[gdpr/execute-deletion] Fetch error:', fetchError.message);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ message: 'No deletions to process', processed: 0 });
    }

    const results = [];

    for (const req of requests) {
      const orgId = req.org_id as string;
      const requestId = req.id as string;

      // Mark as processing
      await supabase
        .from('data_deletion_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      try {
        // Log BEFORE deletion (audit_logs are never deleted)
        await logAudit(
          {
            orgId,
            userId: req.requested_by as string,
            action: 'gdpr.deletion_executing',
            entityType: 'data_deletion_request',
            entityId: requestId,
          },
          { critical: false },
        );

        // Execute cascade delete
        const manifest = await cascadeDeleteOrg(supabase, orgId);

        // Update the request record (it may have been deleted — use service client)
        // Since data_deletion_requests is in the deletion order, we log to audit instead
        await logAudit(
          {
            orgId,
            userId: req.requested_by as string,
            action: 'gdpr.deletion_completed',
            entityType: 'data_deletion_request',
            entityId: requestId,
            changes: {
              deletedTables: manifest.steps
                .filter((s) => s.success)
                .map((s) => ({ table: s.table, rows: s.rowsDeleted })),
              orgDeleted: manifest.orgDeleted,
            },
          },
          { critical: false },
        );

        results.push({ requestId, orgId, status: 'completed', manifest });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';

        // Try to update request status — may fail if already deleted
        await supabase
          .from('data_deletion_requests')
          .update({ status: 'confirmed', error_message: errorMsg })
          .eq('id', requestId);

        await logAudit(
          {
            orgId,
            userId: req.requested_by as string,
            action: 'gdpr.deletion_failed',
            entityType: 'data_deletion_request',
            entityId: requestId,
            metadata: { error: errorMsg },
          },
          { critical: false },
        );

        results.push({ requestId, orgId, status: 'failed', error: errorMsg });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error('[gdpr/execute-deletion] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
