import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FinancialsClient } from './financials-client';

export default async function FinancialsPage() {
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

  // Check Xero connection
  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('id, status')
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .single();

  // Fetch chart of accounts
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('code');

  // Fetch normalised financials with account info
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(code, name, type, class)')
    .eq('org_id', profile.org_id)
    .order('period', { ascending: false });

  // Fetch raw transaction count
  const { count: rawCount } = await supabase
    .from('raw_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id);

  // Fetch last sync
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  // Build period summary
  const periodSummary = new Map<string, { revenue: number; costs: number; expenses: number; accounts: number }>();

  for (const fin of financials ?? []) {
    const account = fin.chart_of_accounts as { code: string; name: string; type: string; class: string };
    const period = fin.period;
    const existing = periodSummary.get(period) ?? { revenue: 0, costs: 0, expenses: 0, accounts: 0 };

    const cls = account.class.toUpperCase();
    const amount = Number(fin.amount);

    if (cls === 'REVENUE') existing.revenue += amount;
    else if (cls === 'DIRECTCOSTS') existing.costs += amount;
    else if (cls === 'EXPENSE' || cls === 'OVERHEADS') existing.expenses += amount;

    existing.accounts += 1;
    periodSummary.set(period, existing);
  }

  const periods = Array.from(periodSummary.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([period, data]) => ({
      period,
      revenue: data.revenue,
      costs: data.costs,
      expenses: data.expenses,
      netProfit: data.revenue - data.costs - data.expenses,
      accountLines: data.accounts,
    }));

  return (
    <FinancialsClient
      periods={periods}
      accounts={accounts ?? []}
      financials={financials ?? []}
      rawTransactionCount={rawCount ?? 0}
      connected={!!xeroConnection}
      role={profile.role}
      lastSync={lastSync ? {
        status: lastSync.status,
        recordsSynced: lastSync.records_synced,
        startedAt: lastSync.started_at,
        completedAt: lastSync.completed_at,
        errorMessage: lastSync.error_message,
      } : null}
    />
  );
}
