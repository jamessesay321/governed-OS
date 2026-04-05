import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InvestorSettingsClient } from './investor-settings-client';

export const dynamic = 'force-dynamic';

interface InvestorRow {
  id: string;
  investor_user_id: string | null;
  access_level: string;
  created_at: string;
  accepted_at: string | null;
  magic_link_expires_at: string;
}

interface SharedMetricRow {
  id: string;
  metric_key: string;
  is_shared: boolean;
}

export default async function InvestorSettingsPage() {
  const { userId, orgId, role } = await getUserProfile();

  // Only owner/admin can manage investor settings
  if (!['owner', 'admin'].includes(role)) {
    redirect('/dashboard');
  }

  const serviceClient = await createServiceClient();

  // Fetch all investor invites/access for this org
  const { data: investors } = await serviceClient
    .from('investor_organisations')
    .select('id, investor_user_id, access_level, created_at, accepted_at, magic_link_expires_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  // Fetch investor profile display names where available
  const investorRows = (investors ?? []) as InvestorRow[];
  const investorUserIds = investorRows
    .map((i) => i.investor_user_id)
    .filter((id): id is string => id !== null);

  let investorNames: Record<string, string> = {};
  if (investorUserIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, display_name')
      .in('id', investorUserIds);

    if (profiles) {
      for (const p of profiles) {
        investorNames[p.id] = p.display_name;
      }
    }
  }

  // Fetch shared metrics config
  const { data: sharedMetrics } = await serviceClient
    .from('investor_shared_metrics')
    .select('id, metric_key, is_shared')
    .eq('org_id', orgId);

  // Build list of available KPI keys (from KPI definitions)
  // We'll pass the current shared metrics config to the client
  const availableMetricKeys = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'gross_margin', label: 'Gross Margin %' },
    { key: 'net_margin', label: 'Net Margin %' },
    { key: 'current_ratio', label: 'Current Ratio' },
    { key: 'debt_to_equity', label: 'Debt-to-Equity' },
    { key: 'revenue_growth_mom', label: 'MoM Revenue Growth' },
    { key: 'revenue_growth_yoy', label: 'YoY Revenue Growth' },
    { key: 'cash_balance', label: 'Cash Balance' },
    { key: 'operating_expenses', label: 'Operating Expenses' },
    { key: 'gross_profit', label: 'Gross Profit' },
    { key: 'net_profit', label: 'Net Profit' },
    { key: 'burn_rate', label: 'Burn Rate' },
    { key: 'runway_months', label: 'Runway (Months)' },
  ];

  return (
    <InvestorSettingsClient
      orgId={orgId}
      investors={investorRows.map((inv) => ({
        id: inv.id,
        investorUserId: inv.investor_user_id,
        displayName: inv.investor_user_id
          ? investorNames[inv.investor_user_id] ?? 'Unknown'
          : 'Pending',
        accessLevel: inv.access_level,
        createdAt: inv.created_at,
        acceptedAt: inv.accepted_at,
        expired:
          !inv.accepted_at &&
          new Date(inv.magic_link_expires_at) < new Date(),
      }))}
      sharedMetrics={(sharedMetrics ?? []) as SharedMetricRow[]}
      availableMetricKeys={availableMetricKeys}
    />
  );
}
