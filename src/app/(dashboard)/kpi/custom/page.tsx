import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { CustomKPIsClient } from './custom-kpis-client';

export default async function CustomKPIsPage() {
  const { orgId, role } = await getUserProfile();

  const supabase = await createUntypedServiceClient();
  const { data: customKPIs } = await supabase
    .from('custom_kpis')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  return (
    <CustomKPIsClient
      orgId={orgId}
      role={role}
      initialKPIs={customKPIs ?? []}
    />
  );
}
