import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { KPIDashboardClient } from './kpi-client';
import type { NormalisedFinancial } from '@/types';

export default async function KPIPage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  // Fetch available periods from financial data
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  // TODO: Select only 'period' for efficiency; cast is safe as getAvailablePeriods only reads .period
  const periods = getAvailablePeriods((financials || []) as unknown as NormalisedFinancial[]);
  const defaultPeriod = periods[0] || '';

  // Fetch last sync time for data freshness
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  return (
    <KPIDashboardClient
      orgId={orgId}
      periods={periods}
      defaultPeriod={defaultPeriod}
      role={role}
      lastSync={lastSync ? { completedAt: lastSync.completed_at } : null}
    />
  );
}
