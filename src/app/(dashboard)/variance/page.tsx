import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { VarianceClient } from './variance-client';

export default async function VariancePage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  // Fetch available periods
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const periods = getAvailablePeriods((financials || []) as any);
  const defaultPeriod = periods[0] || '';

  return (
    <VarianceClient
      orgId={orgId}
      periods={periods}
      defaultPeriod={defaultPeriod}
      role={role}
    />
  );
}
