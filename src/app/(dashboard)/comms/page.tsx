import { getUserProfile } from '@/lib/auth/get-user-profile';
import { CommsClient } from './comms-client';

export default async function CommsPage() {
  const { orgId, orgName } = await getUserProfile();

  // Check whether env vars are configured server-side
  const slackConfigured = !!(
    process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET
  );

  return (
    <CommsClient
      orgId={orgId}
      orgName={orgName}
      slackConfigured={slackConfigured}
    />
  );
}
