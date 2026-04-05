import { getUserProfile } from '@/lib/auth/get-user-profile';
import { RetentionClient } from './retention-client';

export default async function RetentionPage() {
  const { orgId } = await getUserProfile();

  // Check if Klaviyo API key is configured (server-side only)
  const klaviyoConfigured = !!process.env.KLAVIYO_API_KEY;

  return (
    <RetentionClient orgId={orgId} klaviyoConfigured={klaviyoConfigured} />
  );
}
