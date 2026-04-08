import { getUserProfile } from '@/lib/auth/get-user-profile';
import { DriversClient } from './drivers-client';

export default async function DriversPage() {
  const { orgId, role } = await getUserProfile();

  return <DriversClient orgId={orgId} role={role} />;
}
