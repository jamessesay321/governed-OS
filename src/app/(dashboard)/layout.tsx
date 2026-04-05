import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebarToggle } from '@/components/layout/mobile-sidebar';
import { Header, MobileQuickActions } from '@/components/layout/header';
import { DemoBanner } from '@/components/demo/demo-banner';
import { UserProvider } from '@/components/providers/user-context';
import { CurrencyProvider } from '@/components/providers/currency-context';
import { AccountingConfigProvider } from '@/components/providers/accounting-config-context';
import { DrillDownProviderWrapper } from '@/components/providers/drill-down-provider-wrapper';
import { GlobalPeriodProvider } from '@/components/providers/global-period-provider';
import { GlobalPeriodSelector } from '@/components/layout/global-period-selector';
import { ChallengeProvider, ChallengePanel } from '@/components/shared/challenge-panel';
// Ask Grove functionality is merged into the CMD+K search bar in the Header

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, role, displayName, orgName, isAdvisorMode, advisorOwnOrgId } = await getUserProfile();

  // Check if org is in demo mode (column may not exist yet pre-migration)
  let isDemoMode = false;
  try {
    const supabase = await createClient();
    const { data: org } = await supabase
      .from('organisations' as any)
      .select('onboarding_mode')
      .eq('id', orgId)
      .single();
    isDemoMode = (org as any)?.onboarding_mode === 'demo';
  } catch {
    // Column doesn't exist yet, not in demo mode
  }

  // Fetch available periods (lightweight: just distinct period values)
  let availablePeriods: string[] = [];
  try {
    const supabase = await createClient();
    const { data: periodRows } = await supabase
      .from('normalised_financials')
      .select('period')
      .eq('org_id', orgId);
    if (periodRows) {
      const unique = new Set(periodRows.map((r: { period: string }) => r.period));
      availablePeriods = Array.from(unique).sort();
    }
  } catch {
    // Table may not exist yet
  }

  // Fetch org accounting config (year-end, currency) for FY-aware UI
  let yearEndMonth = 12;
  let yearEndDay = 31;
  let baseCurrency = 'GBP';
  let isAccountingConfigured = false;
  try {
    const supabase = await createClient();
    const { data: config } = await supabase
      .from('org_accounting_config')
      .select('financial_year_end_month, financial_year_end_day, base_currency')
      .eq('org_id', orgId)
      .single();
    if (config) {
      yearEndMonth = config.financial_year_end_month;
      yearEndDay = config.financial_year_end_day;
      baseCurrency = config.base_currency || 'GBP';
      isAccountingConfigured = true;
    }
  } catch {
    // Table may not exist yet pre-migration, use calendar year defaults
  }

  return (
    <UserProvider value={{ userId, orgId, role, displayName, orgName, isAdvisorMode, advisorOwnOrgId }}>
      <AccountingConfigProvider
        yearEndMonth={yearEndMonth}
        yearEndDay={yearEndDay}
        baseCurrency={baseCurrency}
        isConfigured={isAccountingConfigured}
      >
      <CurrencyProvider initialCurrency={baseCurrency}>
        <div className="flex h-screen">
          {/* Desktop sidebar - hidden on mobile */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            {isDemoMode && <DemoBanner />}
            <div className="flex items-center">
              {/* Mobile hamburger toggle */}
              <div className="md:hidden pl-3 shrink-0">
                <MobileSidebarToggle />
              </div>
              <div className="flex-1 min-w-0">
                <Header
                  displayName={displayName}
                  orgName={orgName}
                  role={role}
                />
              </div>
            </div>
            <GlobalPeriodProvider availablePeriods={availablePeriods}>
              <GlobalPeriodSelector />
              <DrillDownProviderWrapper orgId={orgId}>
                <ChallengeProvider>
                  <main className="flex-1 overflow-y-auto p-6">{children}</main>
                  <ChallengePanel />
                </ChallengeProvider>
              </DrillDownProviderWrapper>
            </GlobalPeriodProvider>
          </div>
          <MobileQuickActions />
        </div>
      </CurrencyProvider>
      </AccountingConfigProvider>
    </UserProvider>
  );
}
