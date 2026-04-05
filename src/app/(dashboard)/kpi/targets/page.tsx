import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { calculateKPIs } from '@/lib/kpi/engine';
import { KPITargetsClient } from './kpi-targets-client';
import type { NormalisedFinancial } from '@/types';
import type { CalculatedKPI } from '@/lib/kpi/format';

export default async function KPITargetsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  // Fetch available periods to find the latest
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const periods = getAvailablePeriods((financials || []) as unknown as NormalisedFinancial[]);
  const latestPeriod = periods[0] || '';

  // Calculate current KPIs for the latest period
  let kpis: CalculatedKPI[] = [];
  if (latestPeriod) {
    try {
      kpis = await calculateKPIs(orgId, latestPeriod, 'universal');
    } catch (e) {
      console.error('[KPI_TARGETS] Failed to calculate KPIs:', e);
    }
  }

  // Fetch existing custom KPIs that may have targets set
  const serviceClient = await createUntypedServiceClient();
  const { data: customKPIs } = await serviceClient
    .from('custom_kpis')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  // Fetch existing alert rules (these serve as our "targets" data)
  const { data: alertRules } = await serviceClient
    .from('kpi_alert_rules')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  return (
    <KPITargetsClient
      orgId={orgId}
      kpis={kpis}
      period={latestPeriod}
      customKPIs={customKPIs ?? []}
      alertRules={alertRules ?? []}
    />
  );
}
