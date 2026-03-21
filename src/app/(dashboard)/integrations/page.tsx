import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { IntegrationsClient } from './integrations-client';

export default async function IntegrationsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  // Check Xero connection status
  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single();

  return (
    <IntegrationsClient
      orgId={orgId}
      xeroConnected={!!xeroConnection}
      xeroTenantName={(xeroConnection as Record<string, unknown>)?.tenant_name as string ?? null}
    />
  );
}
