import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { OnboardingConnectClient } from '@/components/onboarding/onboarding-connect-client';

export default async function OnboardingConnectPage() {
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

  const service = await createServiceClient();

  // Check Xero connection status
  let isXeroConnected = false;
  let tenantName: string | null = null;

  try {
    const { data: connection } = await service
      .from('xero_connections' as any)
      .select('tenant_name')
      .eq('org_id', profile.org_id)
      .limit(1)
      .single();

    if (connection) {
      isXeroConnected = true;
      tenantName = (connection as any).tenant_name || null;
    }
  } catch {
    // Table may not exist or no connection
  }

  // Check if interview was completed
  let interviewCompleted = false;
  try {
    const { data: interview } = await service
      .from('business_context_profiles' as any)
      .select('id')
      .eq('org_id', profile.org_id)
      .eq('status', 'completed')
      .limit(1)
      .single();

    if (interview) interviewCompleted = true;
  } catch {
    // No completed interview
  }

  return (
    <OnboardingConnectClient
      isConnected={isXeroConnected}
      tenantName={tenantName}
      interviewCompleted={interviewCompleted}
    />
  );
}
