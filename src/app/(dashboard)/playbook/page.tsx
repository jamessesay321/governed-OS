import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLatestAssessment } from '@/lib/playbook/assessment';
import { PlaybookClient } from '@/components/playbook/playbook-client';

export default async function PlaybookPage() {
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

  // Try to load existing assessment
  let assessment = null;
  try {
    assessment = await getLatestAssessment(profile.org_id);
  } catch {
    // No assessment yet - that's fine
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Growth Playbook</h1>
        <p className="text-muted-foreground">
          Assess your organisation&apos;s maturity and get a tailored action plan.
        </p>
      </div>

      <PlaybookClient
        initialAssessment={assessment}
        initialActions={[]}
        orgId={profile.org_id}
      />
    </div>
  );
}
