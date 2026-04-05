import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createServiceClient } from '@/lib/supabase/server';
import { calculateKPIs, type CalculatedKPI } from '@/lib/kpi/engine';
import { InvestorDashboardClient } from './investor-dashboard-client';

export const dynamic = 'force-dynamic';

interface RevenueTrendPoint {
  period: string;
  revenue: number;
}

export default async function InvestorPortalPage() {
  const { userId, orgId, role } = await getUserProfile();

  // Determine which org to show data for
  let targetOrgId = orgId;
  let orgName = 'Organisation';
  let isInvestorView = false;

  const serviceClient = await createServiceClient();

  if (role === 'investor') {
    // Investor: find the org(s) they have access to
    const { data: investorAccess } = await serviceClient
      .from('investor_organisations')
      .select('org_id')
      .eq('investor_user_id', userId)
      .not('accepted_at', 'is', null)
      .limit(1)
      .single();

    if (investorAccess) {
      targetOrgId = investorAccess.org_id as string;
      isInvestorView = true;
    }
  }

  // Fetch org name
  const { data: org } = await serviceClient
    .from('organisations')
    .select('name')
    .eq('id', targetOrgId)
    .single();

  if (org) {
    orgName = org.name;
  }

  // Fetch available periods
  const { data: periodRows } = await serviceClient
    .from('normalised_financials')
    .select('period')
    .eq('org_id', targetOrgId);

  const allPeriods = periodRows
    ? [...new Set(periodRows.map((r: { period: string }) => r.period))].sort().reverse()
    : [];

  const last12 = allPeriods.slice(0, 12);

  // Calculate KPIs for the latest period
  let kpis: CalculatedKPI[] = [];
  let latestPeriod = '';

  if (last12.length > 0) {
    latestPeriod = last12[0] as string;
    try {
      kpis = await calculateKPIs(targetOrgId, latestPeriod);
    } catch (err) {
      console.error('[investor-portal] KPI calculation error:', err);
    }
  }

  // Filter KPIs for investor view (only shared metrics)
  if (isInvestorView) {
    const { data: sharedMetrics } = await serviceClient
      .from('investor_shared_metrics')
      .select('metric_key')
      .eq('org_id', targetOrgId)
      .eq('is_shared', true);

    if (sharedMetrics && sharedMetrics.length > 0) {
      const sharedKeys = new Set(
        sharedMetrics.map((m: Record<string, unknown>) => m.metric_key as string)
      );
      kpis = kpis.filter((k) => sharedKeys.has(k.key));
    } else {
      // Default safe set for investors if none configured
      const defaultKeys = new Set([
        'revenue',
        'gross_margin',
        'net_margin',
        'current_ratio',
        'revenue_growth_mom',
      ]);
      kpis = kpis.filter((k) => defaultKeys.has(k.key));
    }
  }

  // Build revenue trend (last 12 months)
  const revenueTrend: RevenueTrendPoint[] = [];
  for (const period of [...last12].reverse()) {
    try {
      const periodKpis = await calculateKPIs(targetOrgId, period as string);
      const revenueKpi = periodKpis.find((k) => k.key === 'revenue');
      revenueTrend.push({
        period: period as string,
        revenue: revenueKpi?.value ? revenueKpi.value / 100 : 0,
      });
    } catch {
      revenueTrend.push({ period: period as string, revenue: 0 });
    }
  }

  // Last sync date
  let lastSyncDate: string | null = null;
  try {
    const { data: lastSync } = await serviceClient
      .from('sync_log')
      .select('completed_at')
      .eq('org_id', targetOrgId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    lastSyncDate = lastSync?.completed_at ?? null;
  } catch {
    // sync_logs may not exist
  }

  // Fetch accounting config for currency
  let baseCurrency = 'GBP';
  try {
    const { data: config } = await serviceClient
      .from('org_accounting_config')
      .select('base_currency')
      .eq('org_id', targetOrgId)
      .single();
    if (config?.base_currency) baseCurrency = config.base_currency;
  } catch {
    // use default
  }

  return (
    <InvestorDashboardClient
      orgName={orgName}
      kpis={kpis}
      revenueTrend={revenueTrend}
      latestPeriod={latestPeriod}
      lastSyncDate={lastSyncDate}
      baseCurrency={baseCurrency}
      isInvestorView={isInvestorView}
    />
  );
}
