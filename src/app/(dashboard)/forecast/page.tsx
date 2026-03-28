import { getUserProfile } from '@/lib/auth/get-user-profile';
import { ForecastDashboardClient } from './forecast-client';

export default async function ForecastPage() {
  const { orgId, role } = await getUserProfile();

  return <ForecastDashboardClient orgId={orgId} role={role} />;
}
