import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header, MobileQuickActions } from '@/components/layout/header';
import { DemoBanner } from '@/components/demo/demo-banner';
import { UserProvider } from '@/components/providers/user-context';
import { CurrencyProvider } from '@/components/providers/currency-context';
// CommandPalette available at @/components/command-palette/command-palette
// Header already has Cmd+K search built in

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
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {isDemoMode && <DemoBanner />}
            <Header
              displayName={displayName}
              orgName={orgName}
              role={role}
            />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
          <MobileQuickActions />
        </div>
      </CurrencyProvider>
    </UserProvider>
  );
}
