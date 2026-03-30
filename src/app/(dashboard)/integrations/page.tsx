import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { IntegrationsClient } from './integrations-client';

export default async function IntegrationsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();
  const service = await createServiceClient();

  // Check Xero connection status
  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single();

  // Check QuickBooks connection status (table may not exist yet)
  let qboConnection: Record<string, unknown> | null = null;
  try {
    const { data } = await service
      .from('quickbooks_connections' as any)
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single();
    qboConnection = data as Record<string, unknown> | null;
  } catch {
    // Table may not exist yet pre-migration
  }

  // Check which credentials are configured server-side
  const xeroConfigured = !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
  const qboConfigured = !!(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET);

  // Get last sync info
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('completed_at, records_synced, status, sync_type')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <IntegrationsClient
      orgId={orgId}
      xeroConnected={!!xeroConnection}
      xeroTenantName={(xeroConnection as Record<string, unknown>)?.tenant_name as string ?? null}
      xeroConfigured={xeroConfigured}
      qboConnected={!!qboConnection}
      qboCompanyName={qboConnection?.company_name as string ?? null}
      qboConfigured={qboConfigured}
      lastSyncAt={lastSync?.completed_at ?? null}
      lastSyncRecords={lastSync?.records_synced ?? null}
      lastSyncStatus={lastSync?.status ?? null}
    />
  );
}
