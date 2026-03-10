import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/xero/status
 * Returns Xero connection status for the current org.
 */
export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser();
    const supabase = await createClient();

    const { data: connection } = await supabase
      .from('xero_connections')
      .select('id, status, xero_tenant_id, token_expires_at, created_at, updated_at')
      .eq('org_id', profile.org_id)
      .eq('status', 'active')
      .single();

    // Get last sync
    const { data: lastSync } = await supabase
      .from('sync_log')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      connected: !!connection,
      connection: connection
        ? {
            tenantId: connection.xero_tenant_id,
            connectedAt: connection.created_at,
            tokenExpiresAt: connection.token_expires_at,
          }
        : null,
      lastSync: lastSync
        ? {
            status: lastSync.status,
            recordsSynced: lastSync.records_synced,
            startedAt: lastSync.started_at,
            completedAt: lastSync.completed_at,
            error: lastSync.error_message,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
