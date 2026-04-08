import { getUserProfile } from '@/lib/auth/get-user-profile';
import { ScheduledReportsClient } from './scheduled-reports-client';

export default async function ScheduledReportsPage() {
  const { orgId, userId } = await getUserProfile();

  return <ScheduledReportsClient orgId={orgId} userId={userId} />;
}
