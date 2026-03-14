import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getModulesForOrg } from '@/lib/modules/registry';
import { ModulesMarketplace } from './modules-marketplace';

export default async function ModulesPage() {
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

  const modules = getModulesForOrg(profile.org_id);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-muted-foreground">
          Activate specialist modules to unlock deeper analysis and insights for your organisation.
        </p>
      </div>

      <ModulesMarketplace modules={modules} orgId={profile.org_id} />
    </div>
  );
}
