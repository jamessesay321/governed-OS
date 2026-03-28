import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebarToggle } from '@/components/layout/mobile-sidebar';
import { Header, MobileQuickActions } from '@/components/layout/header';
import { DemoBanner } from '@/components/demo/demo-banner';
import { UserProvider } from '@/components/providers/user-context';
import { CurrencyProvider } from '@/components/providers/currency-context';
// Ask Grove functionality is merged into the CMD+K search bar in the Header

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, role, displayName, orgName } = await getUserProfile();

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

  return (
    <UserProvider value={{ userId, orgId, role, displayName, orgName }}>
      <CurrencyProvider>
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
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
          <MobileQuickActions />
        </div>
      </CurrencyProvider>
    </UserProvider>
  );
}
