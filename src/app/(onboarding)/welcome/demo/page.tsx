import { getUserProfile } from '@/lib/auth/get-user-profile';
import { DemoCollectionClient } from '@/components/onboarding/demo-collection-client';

export default async function DemoPage() {
  const { displayName, orgName, orgId } = await getUserProfile();

  return (
    <DemoCollectionClient
      displayName={displayName}
      orgName={orgName}
      orgId={orgId}
    />
  );
}
