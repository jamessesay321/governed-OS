import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { mergeProgressWithSteps } from '@/lib/roadmap/roadmap-data';
import type { RoadmapProgressRow } from '@/lib/roadmap/roadmap-data';
import { RoadmapClient } from './roadmap-client';

export default async function RoadmapPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Fetch persisted progress rows
  const { data: rows } = await supabase
    .from('roadmap_progress')
    .select('step_id, status, completed_at')
    .eq('org_id', orgId);

  const dbRows = (rows ?? []) as unknown as RoadmapProgressRow[];

  // Auto-detection
  const autoDetected: Record<string, boolean> = { 'create-account': true };

  const { count: xeroCount } = await supabase
    .from('xero_connections')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'active');
  autoDetected['connect-xero'] = (xeroCount ?? 0) > 0;

  const { count: coaCount } = await supabase
    .from('chart_of_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  autoDetected['review-chart'] = (coaCount ?? 0) > 0;

  const roadmap = mergeProgressWithSteps(dbRows, autoDetected);

  return <RoadmapClient initialRoadmap={roadmap} />;
}
