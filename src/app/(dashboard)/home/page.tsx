import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { HomeClient } from './home-client';

export default async function HomePage() {
  const { orgId, displayName } = await getUserProfile();
  const supabase = await createClient();

  // Check if business profile has been set up (interview completed)
  const { data: org } = await supabase
    .from('organisations')
    .select('has_completed_onboarding')
    .eq('id', orgId)
    .single();
  const profileComplete = !!(org as Record<string, unknown> | null)?.has_completed_onboarding;

  // Check if any integration is connected
  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle();
  const integrationConnected = !!xeroConn;

  // Get last sync info
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('completed_at, records_synced, status')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <HomeClient
      orgId={orgId}
      displayName={displayName}
      profileComplete={profileComplete}
      integrationConnected={integrationConnected}
      lastSyncAt={lastSync?.completed_at ?? null}
      lastSyncRecords={lastSync?.records_synced ?? null}
    />
  );
}
