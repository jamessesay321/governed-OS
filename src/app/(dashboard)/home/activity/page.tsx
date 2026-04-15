import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import ActivityClient from './activity-client';

export default async function ActivityPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  // Fetch last 50 audit log entries for this org
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch profile names for display
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('org_id', orgId);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      {/* Back Link */}
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Activity Feed
        </h1>
        <p className="mt-1 text-gray-500">
          A log of actions, updates, and events across your workspace.
        </p>
      </div>

      {/* Activity Timeline */}
      <ActivityClient logs={logs ?? []} nameMap={nameMap} />
    </div>
  );
}
