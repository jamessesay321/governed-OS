import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  // Check if onboarding is already completed
  const service = await createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  try {
    const { data: org } = await service
      .from('organisations')
      .select('has_completed_onboarding')
      .eq('id', profile.org_id)
      .single();

    if (org && (org as any).has_completed_onboarding) {
      return redirect('/dashboard');
    }
  } catch {
    // Column may not exist yet — proceed with onboarding
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header — logo only */}
      <header className="border-b">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <h1 className="text-lg font-semibold">Governed OS</h1>
        </div>
      </header>

      {/* Centered content area */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
