import { getUserProfile } from '@/lib/auth/get-user-profile';
import { KeyActionsClient } from './key-actions-client';

export default async function KeyActionsPage() {
  const { orgId } = await getUserProfile();

  return <KeyActionsClient orgId={orgId} />;
}
