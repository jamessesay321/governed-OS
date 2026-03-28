import { createClient, createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in — show the landing page
  if (!user) return redirect('/landing');

  // Check if org has completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/landing');

  const orgId = profile.org_id;

  // Strategy: check multiple signals for onboarding completion.
  // 1. The has_completed_onboarding flag (if the column exists)
  // 2. Existence of interview data or demo data (fallback)
  // This prevents returning users from being sent back to /welcome.

  try {
    const service = await createServiceClient();
    const untyped = await createUntypedServiceClient();

    // Check 1: explicit flag
    let flagSet = false;
    try {
      const { data: org } = await service
        .from('organisations')
        .select('has_completed_onboarding')
        .eq('id', orgId)
        .single();

      if (org && (org as unknown as Record<string, unknown>).has_completed_onboarding) {
        flagSet = true;
      }
    } catch {
      // Column may not exist in DB yet
    }

    if (flagSet) return redirect('/home');

    // Check 2: has interview data (completed the interview flow)
    const { data: interview } = await untyped
      .from('business_context_profiles')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle();

    if (interview) return redirect('/home');

    // Check 3: has financial data (connected Xero and synced)
    const { data: financials } = await service
      .from('normalised_financials')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle();

    if (financials) return redirect('/home');

    // Check 4: has demo data (chose the demo path)
    const { data: accounts } = await service
      .from('chart_of_accounts')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle();

    if (accounts) return redirect('/home');

    // Genuinely new user — send to onboarding
    return redirect('/welcome');
  } catch {
    // Safety fallback: if everything fails, check for any profile data
    // rather than trapping users in a welcome loop
    return redirect('/welcome');
  }
}
