import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { hasMinRole } from '@/lib/supabase/roles';
import { XeroConnectionPage } from './xero-connection-page';
import type { Role } from '@/types';

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function XeroPage({ searchParams }: Props) {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();
  const params = await searchParams;

  const userRole = role as Role;

  const { data: connection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single();

  const { data: syncLogs } = await supabase
    .from('sync_log')
    .select('*')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(10);

  // Parse query params for connection feedback
  const feedback = {
    success: params.success === 'true',
    error: params.error || null,
    tenantName: params.tenant || null,
    recordsSynced: params.synced ? parseInt(params.synced) : null,
    syncWarning: params.sync_warning || null,
  };

  return (
    <XeroConnectionPage
      connected={!!connection}
      connectionDate={connection?.updated_at || null}
      canConnect={hasMinRole(userRole, 'admin')}
      canSync={hasMinRole(userRole, 'advisor')}
      syncLogs={syncLogs ?? []}
      feedback={feedback}
    />
  );
}
