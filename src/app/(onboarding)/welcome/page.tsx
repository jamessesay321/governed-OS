import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WelcomeClient } from '@/components/onboarding/welcome-client';

export default async function WelcomePage() {
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

  const orgName = profile.organisations?.name || 'your organisation';

  return (
    <WelcomeClient
      displayName={profile.display_name}
      orgName={orgName}
    />
  );
}
