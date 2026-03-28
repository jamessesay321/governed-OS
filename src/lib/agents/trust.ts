import { createUntypedServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Guided:     Agent suggests, human approves everything.
 * Confident:  Agent handles routine items, flags exceptions (confidence < 0.85).
 * Autonomous: Agent handles everything, only flags genuine anomalies (confidence < 0.7).
 */
export type TrustLevel = 'guided' | 'confident' | 'autonomous';

export interface TrustConfig {
  level: TrustLevel;
  autoApproveThreshold: number; // confidence above this = auto-approve
  escalateThreshold: number; // confidence below this = escalate to human
  runsAnalysed: number;
  accuracyRate: number;
  lastEvaluatedAt: string;
}

// ---------------------------------------------------------------------------
// Threshold configuration per trust level
// ---------------------------------------------------------------------------

const TRUST_THRESHOLDS: Record<TrustLevel, { autoApproveThreshold: number; escalateThreshold: number }> = {
  guided: { autoApproveThreshold: 1.0, escalateThreshold: 0.0 }, // nothing auto, everything flagged
  confident: { autoApproveThreshold: 0.85, escalateThreshold: 0.7 },
  autonomous: { autoApproveThreshold: 0.7, escalateThreshold: 0.5 },
};

/**
 * Get the threshold configuration for a given trust level.
 */
export function getTrustConfig(level: TrustLevel): { autoApproveThreshold: number; escalateThreshold: number } {
  return TRUST_THRESHOLDS[level];
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate the current trust level for an org + agent.
 * Reads from the database; returns sensible defaults when no record exists.
 */
export async function evaluateTrustLevel(orgId: string, agentId: string): Promise<TrustConfig> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('agent_trust_levels')
    .select('*')
    .eq('org_id', orgId)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (error) {
    console.error('[agents/trust] evaluateTrustLevel error:', error.message);
  }

  if (!data) {
    // No record yet — default to guided
    const thresholds = getTrustConfig('guided');
    return {
      level: 'guided',
      ...thresholds,
      runsAnalysed: 0,
      accuracyRate: 0,
      lastEvaluatedAt: new Date().toISOString(),
    };
  }

  const level = (data.trust_level as TrustLevel) ?? 'guided';
  const thresholds = getTrustConfig(level);

  return {
    level,
    ...thresholds,
    runsAnalysed: (data.runs_analysed as number) ?? 0,
    accuracyRate: (data.accuracy_rate as number) ?? 0,
    lastEvaluatedAt: (data.last_evaluated_at as string) ?? new Date().toISOString(),
  };
}

/**
 * Determine whether a specific action with the given confidence should be
 * auto-approved (no human review needed) for this org + agent.
 */
export async function shouldAutoApprove(
  orgId: string,
  agentId: string,
  confidence: number,
): Promise<boolean> {
  const config = await evaluateTrustLevel(orgId, agentId);
  return confidence >= config.autoApproveThreshold;
}

/**
 * Determine whether a specific action with the given confidence should be
 * escalated to a human for this org + agent.
 */
export async function shouldEscalate(
  orgId: string,
  agentId: string,
  confidence: number,
): Promise<boolean> {
  const config = await evaluateTrustLevel(orgId, agentId);
  return confidence < config.escalateThreshold;
}
