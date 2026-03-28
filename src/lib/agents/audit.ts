import { createUntypedServiceClient } from '@/lib/supabase/server';
import type { SourceCitation } from './runtime';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentAuditEntry {
  id: string;
  orgId: string;
  agentId: string;
  runId: string;
  action: string; // e.g. 'categorise_transaction', 'flag_anomaly', 'generate_narrative'
  detail: string;
  sourceCitations: SourceCitation[];
  confidence: number;
  decision: 'auto_approved' | 'flagged' | 'escalated' | 'user_approved' | 'user_rejected';
  createdAt: string;
}

export interface AgentStats {
  totalRuns: number;
  totalItems: number;
  autoApproved: number;
  flagged: number;
  userApproved: number;
  userRejected: number;
  accuracyRate: number;
  averageConfidence: number;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Log a single action taken by an agent during a run.
 */
export async function logAgentAction(
  entry: Omit<AgentAuditEntry, 'id' | 'createdAt'>,
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase.from('agent_audit').insert({
    org_id: entry.orgId,
    agent_id: entry.agentId,
    run_id: entry.runId,
    action: entry.action,
    detail: entry.detail,
    source_citations: entry.sourceCitations,
    confidence: entry.confidence,
    decision: entry.decision,
  });

  if (error) {
    console.error('[agents/audit] logAgentAction error:', error.message);
  }
}

/**
 * Retrieve the audit trail for an org, optionally filtered by agent.
 */
export async function getAgentAuditTrail(
  orgId: string,
  agentId?: string,
  limit: number = 100,
): Promise<AgentAuditEntry[]> {
  const supabase = await createUntypedServiceClient();

  let query = supabase
    .from('agent_audit')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[agents/audit] getAgentAuditTrail error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    orgId: row.org_id as string,
    agentId: row.agent_id as string,
    runId: row.run_id as string,
    action: row.action as string,
    detail: row.detail as string,
    sourceCitations: (row.source_citations as SourceCitation[]) ?? [],
    confidence: row.confidence as number,
    decision: row.decision as AgentAuditEntry['decision'],
    createdAt: row.created_at as string,
  }));
}

/**
 * Compute aggregate stats for an agent within an org.
 */
export async function getAgentStats(
  orgId: string,
  agentId: string,
): Promise<AgentStats> {
  const supabase = await createUntypedServiceClient();

  // Fetch all audit entries for this agent
  const { data: auditEntries, error: auditError } = await supabase
    .from('agent_audit')
    .select('decision, confidence')
    .eq('org_id', orgId)
    .eq('agent_id', agentId);

  if (auditError) {
    console.error('[agents/audit] getAgentStats audit error:', auditError.message);
  }

  // Fetch run counts
  const { data: runs, error: runsError } = await supabase
    .from('agent_runs')
    .select('items_processed')
    .eq('org_id', orgId)
    .eq('agent_id', agentId);

  if (runsError) {
    console.error('[agents/audit] getAgentStats runs error:', runsError.message);
  }

  const entries = auditEntries ?? [];
  const runRows = runs ?? [];

  const autoApproved = entries.filter(e => e.decision === 'auto_approved').length;
  const flagged = entries.filter(e => e.decision === 'flagged').length;
  const userApproved = entries.filter(e => e.decision === 'user_approved').length;
  const userRejected = entries.filter(e => e.decision === 'user_rejected').length;

  const totalDecisions = autoApproved + userApproved + userRejected;
  const correctDecisions = autoApproved + userApproved;
  const accuracyRate = totalDecisions > 0 ? correctDecisions / totalDecisions : 0;

  const confidenceSum = entries.reduce((sum, e) => sum + ((e.confidence as number) ?? 0), 0);
  const averageConfidence = entries.length > 0 ? confidenceSum / entries.length : 0;

  const totalItems = runRows.reduce((sum, r) => sum + ((r.items_processed as number) ?? 0), 0);

  return {
    totalRuns: runRows.length,
    totalItems,
    autoApproved,
    flagged,
    userApproved,
    userRejected,
    accuracyRate,
    averageConfidence,
  };
}
