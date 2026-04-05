import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import DataSettingsClient from './data-settings-client';

export default async function DataPrivacyPage() {
  const { orgId, userId, role } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Fetch active deletion request (if any)
  const { data: deletionRequest } = await supabase
    .from('data_deletion_requests')
    .select('id, status, confirmation_token, cooling_off_until, created_at, reason')
    .eq('org_id', orgId)
    .in('status', ['pending', 'confirmed', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <DataSettingsClient
      orgId={orgId}
      userId={userId}
      role={role}
      deletionRequest={deletionRequest ? {
        id: deletionRequest.id as string,
        status: deletionRequest.status as string,
        confirmationToken: deletionRequest.confirmation_token as string | null,
        coolingOffUntil: deletionRequest.cooling_off_until as string | null,
        createdAt: deletionRequest.created_at as string,
        reason: deletionRequest.reason as string | null,
      } : null}
    />
  );
}
