import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { KPIDashboardClient } from './kpi-client';
import type { NormalisedFinancial } from '@/types';

export default async function KPIPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  // Fetch available periods from financial data
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', profile.org_id);

  // TODO: Select only 'period' for efficiency; cast is safe as getAvailablePeriods only reads .period
  const periods = getAvailablePeriods((financials || []) as unknown as NormalisedFinancial[]);
  const defaultPeriod = periods[0] || '';

  // Fetch last sync time for data freshness
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('org_id', profile.org_id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  return (
    <KPIDashboardClient
      orgId={profile.org_id}
      periods={periods}
      defaultPeriod={defaultPeriod}
      role={profile.role}
      lastSync={lastSync ? { completedAt: lastSync.completed_at } : null}
    />
  );
}
