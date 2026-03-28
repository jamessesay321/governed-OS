import { createUntypedServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentMemory {
  orgId: string;
  agentId: string;
  key: string; // e.g. 'transaction_category:FABRIC_SUPPLIER_LTD'
  value: string; // e.g. 'Direct Materials'
  source: 'user_correction' | 'confirmed' | 'learned';
  confidence: number;
  timesApplied: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Store a memory entry for an agent.
 * Upserts on (org_id, agent_id, key) so repeated calls update the value.
 */
export async function remember(
  orgId: string,
  agentId: string,
  key: string,
  value: string,
  source: AgentMemory['source'],
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase.from('agent_memory').upsert(
    {
      org_id: orgId,
      agent_id: agentId,
      key,
      value,
      source,
      confidence: source === 'user_correction' ? 1.0 : 0.5,
      times_applied: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,agent_id,key' },
  );

  if (error) {
    console.error('[agents/memory] remember error:', error.message);
  }
}

/**
 * Recall a single memory entry by exact key.
 */
export async function recall(
  orgId: string,
  agentId: string,
  key: string,
): Promise<AgentMemory | null> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('org_id', orgId)
    .eq('agent_id', agentId)
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('[agents/memory] recall error:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    orgId: data.org_id as string,
    agentId: data.agent_id as string,
    key: data.key as string,
    value: data.value as string,
    source: data.source as AgentMemory['source'],
    confidence: data.confidence as number,
    timesApplied: data.times_applied as number,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Recall all memory entries for an agent, optionally filtered by key prefix.
 */
export async function recallAll(
  orgId: string,
  agentId: string,
  prefix?: string,
): Promise<AgentMemory[]> {
  const supabase = await createUntypedServiceClient();

  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('org_id', orgId)
    .eq('agent_id', agentId)
    .order('times_applied', { ascending: false });

  if (prefix) {
    query = query.like('key', `${prefix}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[agents/memory] recallAll error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    orgId: row.org_id as string,
    agentId: row.agent_id as string,
    key: row.key as string,
    value: row.value as string,
    source: row.source as AgentMemory['source'],
    confidence: row.confidence as number,
    timesApplied: row.times_applied as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

/**
 * Reinforce a memory entry by incrementing timesApplied and boosting confidence.
 */
export async function reinforceMemory(
  orgId: string,
  agentId: string,
  key: string,
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  // Fetch current values
  const { data, error: fetchError } = await supabase
    .from('agent_memory')
    .select('times_applied, confidence')
    .eq('org_id', orgId)
    .eq('agent_id', agentId)
    .eq('key', key)
    .maybeSingle();

  if (fetchError || !data) {
    console.error('[agents/memory] reinforceMemory: entry not found');
    return;
  }

  const currentApplied = (data.times_applied as number) ?? 0;
  const currentConfidence = (data.confidence as number) ?? 0.5;
  // Confidence asymptotically approaches 1.0
  const newConfidence = Math.min(1.0, currentConfidence + (1 - currentConfidence) * 0.1);

  const { error } = await supabase
    .from('agent_memory')
    .update({
      times_applied: currentApplied + 1,
      confidence: newConfidence,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('agent_id', agentId)
    .eq('key', key);

  if (error) {
    console.error('[agents/memory] reinforceMemory error:', error.message);
  }
}

/**
 * Record a user correction, overwriting the existing value and setting
 * confidence to 1.0 (user corrections are always trusted).
 */
export async function correctMemory(
  orgId: string,
  agentId: string,
  key: string,
  newValue: string,
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('agent_memory')
    .upsert(
      {
        org_id: orgId,
        agent_id: agentId,
        key,
        value: newValue,
        source: 'user_correction',
        confidence: 1.0,
        times_applied: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,agent_id,key' },
    );

  if (error) {
    console.error('[agents/memory] correctMemory error:', error.message);
  }
}
