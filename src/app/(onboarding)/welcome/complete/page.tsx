import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { OnboardingCompleteClient } from '@/components/onboarding/onboarding-complete-client';

export default async function OnboardingCompletePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organisations(name)')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  const service = await createServiceClient();

  // Check interview status
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

  // Check Xero connection
  let xeroConnected = false;
  try {
    const { data: connection } = await service
      .from('xero_connections' as any)
      .select('id')
      .eq('org_id', profile.org_id)
      .limit(1)
      .single();

    if (connection) xeroConnected = true;
  } catch {
    // No connection
  }

  const orgName = profile.organisations?.name || 'your organisation';

  return (
    <OnboardingCompleteClient
      orgName={orgName}
      interviewCompleted={interviewCompleted}
      xeroConnected={xeroConnected}
    />
  );
}
