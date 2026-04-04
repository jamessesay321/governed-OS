import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { ReviewQueueClient } from './review-queue-client';

export default async function ReviewQueuePage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  // Fetch all challenges for the org (table not in generated types yet)
  const { data: rawChallenges } = await supabase
    .from('number_challenges' as any)
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  const challenges = ((rawChallenges ?? []) as unknown) as Array<Record<string, unknown>>;

  // Fetch display names for creators/resolvers
  const userIds = new Set<string>();
  for (const c of challenges) {
    if (c.created_by) userIds.add(c.created_by as string);
    if (c.resolved_by) userIds.add(c.resolved_by as string);
  }

  const userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', Array.from(userIds));

    for (const p of profiles ?? []) {
      userMap[p.id] = (p.display_name as string) || 'Unknown';
    }
  }

  return (
    <ReviewQueueClient
      challenges={challenges.map((c) => ({
        id: c.id as string,
        page: c.page as string,
        metricLabel: c.metric_label as string,
        metricValue: (c.metric_value as string) ?? null,
        period: (c.period as string) ?? null,
        reason: c.reason as string,
        expectedValue: (c.expected_value as string) ?? null,
        severity: c.severity as 'question' | 'concern' | 'error',
        status: c.status as 'open' | 'investigating' | 'resolved' | 'dismissed',
        createdBy: userMap[c.created_by as string] ?? 'Unknown',
        resolvedBy: c.resolved_by ? (userMap[c.resolved_by as string] ?? 'Unknown') : null,
        resolutionNotes: (c.resolution_notes as string) ?? null,
        createdAt: c.created_at as string,
        resolvedAt: (c.resolved_at as string) ?? null,
      }))}
      role={role}
    />
  );
}
