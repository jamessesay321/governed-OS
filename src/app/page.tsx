import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  // Check if org has completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  try {
    const service = await createServiceClient();
    const { data: org } = await service
      .from('organisations')
      .select('has_completed_onboarding')
      .eq('id', profile.org_id)
      .single();

    // TODO: Regenerate Supabase types after migration to remove this cast
    if (org && (org as unknown as Record<string, unknown>).has_completed_onboarding) {
      return redirect('/home');
    }

    // New user — send to onboarding
    return redirect('/welcome');
  } catch {
    // Column may not exist yet — default to home
    return redirect('/home');
  }
}
