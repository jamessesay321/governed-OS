import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { ScenariosListClient } from './scenarios-list-client';

export default async function ScenariosPage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*, assumption_sets(name, base_period_start, base_period_end, forecast_horizon_months)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  // Fetch available actuals periods for auto-populating the create form
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const periodSet = new Set((financials ?? []).map((f) => String(f.period)));
  const availablePeriods = Array.from(periodSet).sort();

  return (
    <ScenariosListClient
      scenarios={scenarios ?? []}
      role={role}
      availablePeriods={availablePeriods}
    />
  );
}
