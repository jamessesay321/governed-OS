import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLatestModelSnapshots } from '@/lib/scenarios/snapshots';
import { ScenarioDetailClient } from './scenario-detail-client';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ScenarioDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*, assumption_sets(*)')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (!scenario) return redirect('/scenarios');

  const { snapshots, modelVersionId } = await getLatestModelSnapshots(profile.org_id, id);

  // Fetch assumption values
  const { data: assumptionValues } = await supabase
    .from('assumption_values')
    .select('*')
    .eq('assumption_set_id', scenario.assumption_set_id)
    .eq('org_id', profile.org_id)
    .order('category')
    .order('key');

  // Fetch unit economics
  let unitEconomics = null;
  if (modelVersionId) {
    const { data } = await supabase
      .from('unit_economics_snapshots')
      .select('*')
      .eq('model_version_id', modelVersionId)
      .eq('org_id', profile.org_id);
    unitEconomics = data;
  }

  // Fetch AI commentary
  let commentary = null;
  if (modelVersionId) {
    const { data } = await supabase
      .from('ai_commentary')
      .select('*')
      .eq('model_version_id', modelVersionId)
      .eq('org_id', profile.org_id)
      .order('confidence_score', { ascending: false });
    commentary = data;
  }

  return (
    <ScenarioDetailClient
      scenario={scenario}
      snapshots={snapshots}
      assumptionValues={assumptionValues ?? []}
      unitEconomics={unitEconomics ?? []}
      commentary={commentary ?? []}
      role={profile.role}
    />
  );
}
