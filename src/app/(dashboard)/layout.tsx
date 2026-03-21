import { getUserProfile } from '@/lib/auth/get-user-profile';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { UserProvider } from '@/components/providers/user-context';
import { CurrencyProvider } from '@/components/providers/currency-context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, role, displayName, orgName } = await getUserProfile();

  return (
    <UserProvider value={{ userId, orgId, role, displayName, orgName }}>
      <CurrencyProvider>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header
              displayName={displayName}
              orgName={orgName}
              role={role}
            />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </CurrencyProvider>
    </UserProvider>
  );
}
