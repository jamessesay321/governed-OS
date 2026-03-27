import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getDefaultTemplate, getTemplateById } from '@/lib/dashboard/templates';
import { DashboardClient } from './dashboard-client';

// Extract default recs for server-side fallback
function getDefaultRecommendationsSync() {
  return {
    kpis: [
      { key: 'revenue', label: 'Revenue', reason: 'Core metric for all businesses', priority: 'high' as const },
      { key: 'gross_margin', label: 'Gross Margin', reason: 'Measures core profitability', priority: 'high' as const },
      { key: 'net_margin', label: 'Net Margin', reason: 'Bottom line health', priority: 'high' as const },
      { key: 'cash_runway_months', label: 'Cash Runway', reason: 'Survival metric', priority: 'high' as const },
      { key: 'revenue_growth', label: 'Revenue Growth', reason: 'Growth trajectory', priority: 'high' as const },
      { key: 'burn_rate', label: 'Burn Rate', reason: 'Cash consumption rate', priority: 'medium' as const },
    ],
    dashboard: {
      template_id: 'owner-default',
      template_name: 'Business Owner',
      reason: 'Default dashboard with full financial overview.',
      additional_widgets: [] as string[],
    },
    playbook_modules: [],
    reasoning: 'Default recommendations.',
  };
}

export default async function DashboardPage() {
  const { orgId, role, displayName, userId } = await getUserProfile();
  const supabase = await createClient();

  // Fetch financial data, profile, and preferences in parallel
  const [financialsResult, accountsResult, xeroResult, syncResult, profileResult, prefResult] =
    await Promise.all([
      supabase.from('normalised_financials').select('*').eq('org_id', orgId),
      supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
      supabase
        .from('xero_connections')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .single(),
      supabase
        .from('sync_log')
        .select('*')
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(1)
        .single(),
      // Fetch business profile from interview
      supabase
        .from('organisations')
        .select('industry, raw_interview_data, interview_status, description, key_challenges, growth_goals')
        .eq('id', orgId)
        .single(),
      // Fetch dashboard preference (table may not be in typed schema yet)
      (async () => {
        const svc = await createUntypedServiceClient();
        return svc
          .from('dashboard_preferences')
          .select('*')
          .eq('org_id', orgId)
          .eq('user_id', userId)
          .single();
      })(),
    ]);

  const financials = financialsResult.data;
  const accounts = accountsResult.data;
  const xeroConnection = xeroResult.data;
  const lastSync = syncResult.data;
  const orgProfile = profileResult.data as Record<string, unknown> | null;
  const dashPref = prefResult.data as Record<string, unknown> | null;

  const periods = getAvailablePeriods(financials || []);
  const defaultPeriod = periods[0] || '';

  // Build P&L for all periods
  const pnlByPeriod: Record<string, ReturnType<typeof buildPnL>> = {};
  for (const period of periods) {
    pnlByPeriod[period] = buildPnL(financials || [], accounts || [], period);
  }

  // Determine dashboard template based on preference or role
  const templateId = (dashPref?.template_id as string) || null;
  const activeTemplate = templateId
    ? getTemplateById(templateId) || getDefaultTemplate(role)
    : getDefaultTemplate(role);

  // Extract business context for customization
  const industry = (orgProfile?.industry as string) || '';
  const interviewData = (orgProfile?.raw_interview_data as Record<string, unknown>) || {};
  const companyProfile = (interviewData?.company_profile as Record<string, unknown>) || {};
  const interviewCompleted = orgProfile?.interview_status === 'completed';

  // Build recommended KPIs (from stored recs or defaults)
  const storedRecs = (interviewData?.recommendations as Record<string, unknown>) || null;
  const recommendations = storedRecs
    ? {
        kpis: (storedRecs.kpis as Array<{ key: string; label: string; reason: string; priority: string }>) || [],
        dashboard: storedRecs.dashboard || {},
        playbook_modules: storedRecs.playbook_modules || [],
        reasoning: (storedRecs.reasoning as string) || '',
      }
    : getDefaultRecommendationsSync();

  // Determine business type for KPI filtering
  const businessType = (companyProfile?.revenue_model as string) || '';
  const isEcommerce = ['ecommerce', 'retail', 'fashion', 'shopify'].some(
    (t) => industry.toLowerCase().includes(t) || businessType.toLowerCase().includes(t)
  );
  const isSaaS = ['saas', 'subscription', 'software'].some(
    (t) => industry.toLowerCase().includes(t) || businessType.toLowerCase().includes(t)
  );
  const isServices = ['consulting', 'agency', 'services', 'professional'].some(
    (t) => industry.toLowerCase().includes(t) || businessType.toLowerCase().includes(t)
  );

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
      displayName={displayName}
      template={activeTemplate}
      recommendations={recommendations as DashboardRecommendations}
      businessContext={{
        industry,
        interviewCompleted,
        isEcommerce,
        isSaaS,
        isServices,
        companyName: (companyProfile?.company_name as string) || '',
        challenges: (orgProfile?.key_challenges as string[]) || [],
        goals: (orgProfile?.growth_goals as string[]) || [],
      }}
    />
  );
}

// Type export for client component
export type DashboardRecommendations = {
  kpis: Array<{ key: string; label: string; reason: string; priority: string }>;
  dashboard: Record<string, unknown>;
  playbook_modules: unknown[];
  reasoning: string;
};
