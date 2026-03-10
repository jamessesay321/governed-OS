import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ScenariosListClient } from './scenarios-list-client';

export default async function ScenariosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*, assumption_sets(name, base_period_start, base_period_end, forecast_horizon_months)')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  // Fetch available actuals periods for auto-populating the create form
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', profile.org_id);

  const periodSet = new Set((financials ?? []).map((f) => String(f.period)));
  const availablePeriods = Array.from(periodSet).sort();

  return (
    <ScenariosListClient
      scenarios={scenarios ?? []}
      role={profile.role}
      availablePeriods={availablePeriods}
    />
  );
}
