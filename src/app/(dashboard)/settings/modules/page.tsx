import { getUserProfile } from '@/lib/auth/get-user-profile';
import { ModulesSettingsClient } from './modules-settings-client';

export default async function ModulesSettingsPage() {
  const { orgId, role } = await getUserProfile();

  return <ModulesSettingsClient orgId={orgId} role={role} />;
}
