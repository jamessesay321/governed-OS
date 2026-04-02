import { NextResponse, type NextRequest } from 'next/server';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { runFullSync } from '@/lib/xero/sync';
import { logAudit } from '@/lib/audit/log';

/**
 * GET /api/cron/xero-sync
 *
 * Vercel Cron job that syncs all active Xero connections daily.
 * Secured via CRON_SECRET header — only Vercel's scheduler can call this.
 *
 * Schedule: Every day at 06:00 UTC (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createUntypedServiceClient();

  // Fetch all orgs with active Xero connections
  const { data: connections, error: fetchError } = await supabase
    .from('xero_connections')
    .select('org_id, connected_by')
    .eq('status', 'active');

  if (fetchError || !connections) {
    console.error('[cron/xero-sync] Failed to fetch connections:', fetchError?.message);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }

  if (connections.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No active connections' });
  }

  const results: Array<{
    orgId: string;
    success: boolean;
    recordsSynced: number;
    error?: string;
  }> = [];

  // Sync each org sequentially to respect Xero API rate limits
  for (const conn of connections) {
    const orgId = conn.org_id as string;
    const userId = conn.connected_by as string;

    try {
      const result = await runFullSync(orgId, userId);
      results.push({ orgId, ...result });

      await logAudit({
        orgId,
        userId,
        action: 'xero.scheduled_sync',
        entityType: 'xero_connection',
        entityId: orgId,
        metadata: {
          trigger: 'vercel_cron',
          recordsSynced: result.recordsSynced,
          success: result.success,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[cron/xero-sync] Failed for org ${orgId}:`, errorMsg);
      results.push({ orgId, success: false, recordsSynced: 0, error: errorMsg });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    synced: connections.length,
    succeeded,
    failed,
    results,
  });
}
