import { getUserProfile } from '@/lib/auth/get-user-profile';
import { isAcuityConfigured } from '@/lib/integrations/acuity';
import { SchedulingClient } from './scheduling-client';

export default async function SchedulingPage() {
  const { orgId, role } = await getUserProfile();

  const configured = isAcuityConfigured();

  return (
    <SchedulingClient
      orgId={orgId}
      role={role}
      acuityConfigured={configured}
    />
  );
}
