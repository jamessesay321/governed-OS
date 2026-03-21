import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  // Fetch financial data
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  // Fetch Xero connection status
  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single();

  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('*')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  const periods = getAvailablePeriods(financials || []);
  const defaultPeriod = periods[0] || '';

  // Build P&L for all periods (needed for previous period comparison)
  const pnlByPeriod: Record<string, ReturnType<typeof buildPnL>> = {};
  for (const period of periods) {
    pnlByPeriod[period] = buildPnL(financials || [], accounts || [], period);
  }

  return (
    <DashboardClient
      orgId={orgId}
      periods={periods}
      defaultPeriod={defaultPeriod}
      pnlByPeriod={pnlByPeriod}
      connected={!!xeroConnection}
      lastSync={
        lastSync
          ? {
              status: lastSync.status,
              recordsSynced: lastSync.records_synced,
              startedAt: lastSync.started_at,
              completedAt: lastSync.completed_at,
              error: lastSync.error_message,
            }
          : null
      }
      role={role}
    />
  );
}
