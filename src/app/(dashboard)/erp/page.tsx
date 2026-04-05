import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { ErpClient } from './erp-client';

export default async function ErpPage() {
  const { orgId } = await getUserProfile();

  // Check if Monday.com is configured (org-level or env)
  let hasOrgKey = false;
  let lastSync = null;

  try {
    const supabase = await createUntypedServiceClient();
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('org_id', orgId)
      .eq('integration_id', 'monday')
      .eq('status', 'active')
      .maybeSingle();

    hasOrgKey = !!(connection?.credentials as Record<string, unknown>)?.api_key;

    // Fetch last sync info (table may not exist yet)
    const { data: syncData } = await supabase
      .from('integration_syncs')
      .select('*')
      .eq('org_id', orgId)
      .eq('integration_id', 'monday')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    lastSync = syncData;
  } catch {
    // Tables may not exist yet — continue with env-only config
  }

  const hasEnvKey = !!process.env.MONDAY_API_KEY;
  const isConfigured = hasOrgKey || hasEnvKey;

  return (
    <ErpClient
      orgId={orgId}
      isConfigured={isConfigured}
      lastSync={
        lastSync
          ? {
              boardName: (lastSync.source_name as string) ?? null,
              recordsSynced: (lastSync.records_synced as number) ?? 0,
              syncedAt: (lastSync.synced_at as string) ?? null,
              status: (lastSync.status as string) ?? 'unknown',
            }
          : null
      }
    />
  );
}
