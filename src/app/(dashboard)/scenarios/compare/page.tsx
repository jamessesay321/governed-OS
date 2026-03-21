import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { CompareClient } from './compare-client';

export default async function ComparisonPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('id, name, status')
    .eq('org_id', orgId)
    .in('status', ['active', 'locked'])
    .order('name');

  return <CompareClient scenarios={scenarios ?? []} />;
}
