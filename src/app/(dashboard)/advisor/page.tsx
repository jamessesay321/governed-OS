import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdvisorPortfolioClient } from './advisor-client';

export const metadata = {
  title: 'Advisor Portfolio | Grove',
};

interface ClientSummary {
  client_org_id: string;
  org_name: string;
  industry: string | null;
  revenue: number | null;
  cash_position: number | null;
  health_score: number | null;
  last_sync: string | null;
}

export default async function AdvisorPortfolioPage() {
  const { userId, role } = await getUserProfile();

  // Only advisors, admins, owners can access
  if (role !== 'advisor' && role !== 'admin' && role !== 'owner') {
    redirect('/dashboard');
  }

  const supabase = await createServiceClient();

  // Fetch advisor's client relationships
  const { data: relationships } = await supabase
    .from('advisor_clients')
    .select(`
      client_org_id,
      organisations!advisor_clients_client_org_id_fkey (
        name,
        industry
      )
    `)
    .eq('advisor_user_id', userId)
    .eq('status', 'active');

  // Build summary data for each client org
  const clientSummaries: ClientSummary[] = [];

  for (const rel of (relationships ?? []) as Record<string, unknown>[]) {
    const orgData = rel.organisations as Record<string, unknown> | null;
    const clientOrgId = rel.client_org_id as string;

    // Fetch latest period revenue (sum of revenue accounts)
    let revenue: number | null = null;
    let cashPosition: number | null = null;

    try {
      // Get latest period
      const { data: latestPeriod } = await supabase
        .from('normalised_financials')
        .select('period')
        .eq('org_id', clientOrgId)
        .order('period', { ascending: false })
        .limit(1)
        .single();

      if (latestPeriod) {
        const period = (latestPeriod as Record<string, unknown>).period as string;

        // Sum revenue for that period
        const { data: revData } = await supabase
          .from('normalised_financials')
          .select('amount')
          .eq('org_id', clientOrgId)
          .eq('period', period)
          .like('account_id', '%revenue%');

        if (revData && Array.isArray(revData)) {
          revenue = revData.reduce(
            (sum: number, r: Record<string, unknown>) => sum + (Number(r.amount) || 0),
            0,
          );
        }

        // Try to get cash/bank balance
        const { data: cashData } = await supabase
          .from('normalised_financials')
          .select('amount')
          .eq('org_id', clientOrgId)
          .eq('period', period)
          .like('account_id', '%bank%');

        if (cashData && Array.isArray(cashData)) {
          cashPosition = cashData.reduce(
            (sum: number, r: Record<string, unknown>) => sum + (Number(r.amount) || 0),
            0,
          );
        }
      }
    } catch {
      // Financial data may not exist yet
    }

    // Derive health score from revenue (placeholder until health_scores table exists)
    const healthScore: number | null = revenue != null ? (revenue > 0 ? 75 : 30) : null;

    // Fetch last sync date
    let lastSync: string | null = null;
    try {
      const { data: syncLog } = await supabase
        .from('sync_log')
        .select('completed_at')
        .eq('org_id', clientOrgId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (syncLog) {
        lastSync = (syncLog as Record<string, unknown>).completed_at as string;
      }
    } catch {
      // Sync logs may not exist
    }

    clientSummaries.push({
      client_org_id: clientOrgId,
      org_name: (orgData?.name as string) ?? 'Unknown',
      industry: (orgData?.industry as string) ?? null,
      revenue,
      cash_position: cashPosition,
      health_score: healthScore,
      last_sync: lastSync,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advisor Portfolio</h1>
        <p className="text-muted-foreground mt-1">
          Manage and monitor all your client organisations from one view.
        </p>
      </div>

      <AdvisorPortfolioClient clients={clientSummaries} />
    </div>
  );
}
