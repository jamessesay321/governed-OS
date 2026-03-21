import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { fetchLatestEvents } from '@/lib/intelligence/events';
import { IntelligenceClient } from './intelligence-client';

export default async function IntelligencePage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  // Fetch events
  let events: Awaited<ReturnType<typeof fetchLatestEvents>> = [];
  try {
    events = await fetchLatestEvents(50);
  } catch {
    // Table may not exist yet — show empty state
  }

  // Fetch existing impacts for this org
  let impacts: Array<Record<string, unknown>> = [];
  try {
    const { data } = await supabase
      .from('intelligence_impacts' as any)
      .select('*')
      .eq('org_id', orgId);
    impacts = (data as unknown as Array<Record<string, unknown>>) ?? [];
  } catch {
    // Table may not exist yet
  }

  // Map impacts to events
  const impactByEventId = new Map<string, Record<string, unknown>>();
  for (const impact of impacts) {
    impactByEventId.set(impact.event_id as string, impact);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventsWithImpacts = events.map((event) => ({
    ...event,
    impact: (impactByEventId.get(event.id) as any) ?? null,
  }));

  return (
    <IntelligenceClient
      events={eventsWithImpacts}
      orgId={orgId}
      role={role}
    />
  );
}
