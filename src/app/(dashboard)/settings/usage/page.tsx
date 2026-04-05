import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { redirect } from 'next/navigation';
import UsageClient from './usage-client';

export default async function UsagePage() {
  let orgId: string;

  try {
    const { profile } = await getAuthenticatedUser();
    orgId = profile.org_id as string;
    if (!orgId) redirect('/home');
  } catch {
    redirect('/login');
  }

  return <UsageClient orgId={orgId} />;
}
