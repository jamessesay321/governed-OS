import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { KPIDashboardClient } from './kpi-client';

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

  const periods = getAvailablePeriods((financials || []) as any);
  const defaultPeriod = periods[0] || '';

  return (
    <KPIDashboardClient
      orgId={profile.org_id}
      periods={periods}
      defaultPeriod={defaultPeriod}
      role={profile.role}
    />
  );
}
