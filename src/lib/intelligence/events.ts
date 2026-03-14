import { createServiceClient } from '@/lib/supabase/server';
import type { IntelligenceEvent } from '@/types';

/**
 * Fetch the latest intelligence events, most recent first.
 */
export async function fetchLatestEvents(limit = 20): Promise<IntelligenceEvent[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('intelligence_events' as any)
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return (data ?? []) as unknown as IntelligenceEvent[];
}

/**
 * Create a new intelligence event.
 */
export async function createEvent(
  event: Omit<IntelligenceEvent, 'id' | 'created_at'>
): Promise<IntelligenceEvent> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('intelligence_events' as any)
    .insert(event)
    .select()
    .single();

  if (error) throw new Error(`Failed to create event: ${error.message}`);
  return data as unknown as IntelligenceEvent;
}

/**
 * Get events relevant to an org's sector and country.
 * Matches events where sectors_affected or countries_affected overlap
 * with the org's profile.
 */
export async function getEventsForOrg(
  orgSector: string,
  orgCountry: string,
  limit = 20
): Promise<IntelligenceEvent[]> {
  const supabase = await createServiceClient();

  // Supabase array overlap: cs = contains, ov = overlaps
  const { data, error } = await supabase
    .from('intelligence_events' as any)
    .select('*')
    .or(
      `sectors_affected.cs.{${orgSector}},countries_affected.cs.{${orgCountry}}`
    )
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch org events: ${error.message}`);
  return (data ?? []) as unknown as IntelligenceEvent[];
}

/**
 * Get a single event by ID.
 */
export async function getEventById(eventId: string): Promise<IntelligenceEvent | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('intelligence_events' as any)
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) return null;
  return data as unknown as IntelligenceEvent;
}
