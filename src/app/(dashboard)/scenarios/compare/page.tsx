import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CompareClient } from './compare-client';

export default async function ComparisonPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('id, name, status')
    .eq('org_id', profile.org_id)
    .in('status', ['active', 'locked'])
    .order('name');

  return <CompareClient scenarios={scenarios ?? []} />;
}
