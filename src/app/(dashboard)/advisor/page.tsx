import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
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
  health_checked_at: string | null;
  top_alert: string | null;
  last_sync: string | null;
}

export default async function AdvisorPortfolioPage() {
  const { userId, role } = await getUserProfile();

  // Only advisors, admins, owners can access
  if (role !== 'advisor' && role !== 'admin' && role !== 'owner') {
    redirect('/dashboard');
  }

  const supabase = await createServiceClient();
  const untypedSupabase = await createUntypedServiceClient();

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

    // Fetch latest period revenue and expenses using chart_of_accounts class
    let revenue: number | null = null;
    let cashPosition: number | null = null;

    try {
      // Get latest period
      const { data: latestPeriod } = await untypedSupabase
        .from('normalised_financials')
        .select('period')
        .eq('org_id', clientOrgId)
        .order('period', { ascending: false })
        .limit(1)
        .single();

      if (latestPeriod) {
        const period = (latestPeriod as Record<string, unknown>).period as string;

        // Revenue: use chart_of_accounts class join
        const { data: revData } = await untypedSupabase
          .from('normalised_financials')
          .select('amount, chart_of_accounts!inner(class)')
          .eq('org_id', clientOrgId)
          .eq('period', period)
          .in('chart_of_accounts.class' as string, ['REVENUE', 'OTHERINCOME']);

        if (revData && Array.isArray(revData)) {
          revenue = (revData as unknown as Array<{ amount: number }>).reduce(
            (sum, r) => sum + Math.abs(Number(r.amount)),
            0,
          );
        }

        // Cash: use ASSET class + bank pattern on account name
        const { data: cashData } = await untypedSupabase
          .from('normalised_financials')
          .select('amount, chart_of_accounts!inner(class, name)')
          .eq('org_id', clientOrgId)
          .eq('period', period)
          .eq('chart_of_accounts.class' as string, 'ASSET');

        if (cashData && Array.isArray(cashData)) {
          const bankRows = (cashData as unknown as Array<{
            amount: number;
            chart_of_accounts: { class: string; name: string };
          }>).filter((r) => /bank|cash|current account/i.test(r.chart_of_accounts.name));
          cashPosition = bankRows.reduce(
            (sum, r) => sum + Number(r.amount),
            0,
          );
        }
      }
    } catch {
      // Financial data may not exist yet
    }

    // Fetch real health score from health_checks table (most recent)
    let healthScore: number | null = null;
    let healthCheckedAt: string | null = null;
    let topAlert: string | null = null;

    try {
      const { data: healthCheck } = await untypedSupabase
        .from('health_checks')
        .select('overall_score, checked_at, alerts')
        .eq('org_id', clientOrgId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (healthCheck) {
        const hc = healthCheck as Record<string, unknown>;
        healthScore = Number(hc.overall_score);
        healthCheckedAt = hc.checked_at as string;

        // Extract top alert (first critical, or first warning)
        const alerts = hc.alerts as Array<{ severity: string; message: string }> | null;
        if (alerts && alerts.length > 0) {
          const critical = alerts.find((a) => a.severity === 'critical');
          const warning = alerts.find((a) => a.severity === 'warning');
          topAlert = (critical ?? warning)?.message ?? null;
        }
      }
    } catch {
      // Health checks table may not exist or have no data
    }

    // Fallback: compute lightweight score if no health check exists
    if (healthScore == null && revenue != null) {
      // Simple heuristic: revenue positive with cash = decent, no cash = watch
      if (revenue > 0 && cashPosition != null && cashPosition > 0) {
        healthScore = 70; // "adequate" — needs a real health check
      } else if (revenue > 0) {
        healthScore = 55; // Revenue but no cash data
      } else {
        healthScore = 25; // No revenue = at risk
      }
    }

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
      health_checked_at: healthCheckedAt,
      top_alert: topAlert,
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
