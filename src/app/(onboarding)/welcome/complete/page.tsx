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

  // Fetch real setup stats for the completion summary
  let accountsMapped = 0;
  let dataHealthScore: number | null = null;
  let periodsAvailable = 0;

  try {
    const [mappingsResult, healthResult, financialsResult] = await Promise.all([
      service.from('account_mappings' as any).select('id', { count: 'exact', head: true }).eq('org_id', profile.org_id),
      (service as any).from('data_health_reports').select('overall_score').eq('org_id', profile.org_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      service.from('normalised_financials').select('period').eq('org_id', profile.org_id),
    ]);

    accountsMapped = mappingsResult.count ?? 0;
    dataHealthScore = (healthResult.data as Record<string, unknown> | null)?.overall_score as number | null;
    const uniquePeriods = new Set((financialsResult.data ?? []).map((f: Record<string, unknown>) => f.period));
    periodsAvailable = uniquePeriods.size;
  } catch {
    // Best effort — fallback to zeros
  }

  return (
    <OnboardingCompleteClient
      orgName={orgName}
      interviewCompleted={interviewCompleted}
      xeroConnected={xeroConnected}
      setupStats={{
        accountsMapped,
        dataHealthScore,
        periodsAvailable,
      }}
    />
  );
}
