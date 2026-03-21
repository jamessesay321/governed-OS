import { getUserProfile } from '@/lib/auth/get-user-profile';
import { getModulesForOrg } from '@/lib/modules/registry';
import { ModulesMarketplace } from './modules-marketplace';

export default async function ModulesPage() {
  const { orgId } = await getUserProfile();
  const modules = getModulesForOrg(orgId);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Module Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and activate specialist modules to unlock deeper analysis, forecasting and compliance tools for your organisation.
        </p>
      </div>
      <ModulesMarketplace modules={modules} orgId={orgId} />
    </div>
  );
}
