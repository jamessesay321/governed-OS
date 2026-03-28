import { createUntypedServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Every agent follows: Input -> Process -> Logic -> Output */
export type AgentStepType = 'input' | 'process' | 'logic' | 'output';

export interface AgentStep {
  type: AgentStepType;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  confidence?: number; // 0-1
  sourceCitations?: SourceCitation[];
}

export interface SourceCitation {
  source: string; // e.g. 'xero', 'shopify', 'manual'
  reference: string; // e.g. 'Invoice INV-001', 'Transaction TXN-123'
  field?: string; // e.g. 'amount', 'date'
  value?: string;
}

export interface AgentRunResult {
  agentId: string;
  runId: string;
  orgId: string;
  status: 'completed' | 'failed' | 'needs_review';
  steps: AgentStep[];
  summary: string;
  confidence: number; // overall confidence 0-1
  itemsProcessed: number;
  itemsFlagged: number;
  startedAt: string;
  completedAt: string;
  trustLevel: TrustLevel;
}

export type TrustLevel = 'guided' | 'confident' | 'autonomous';

// ---------------------------------------------------------------------------
// Abstract base class — every agent implements this
// ---------------------------------------------------------------------------

export abstract class BaseAgent {
  abstract id: string;
  abstract name: string;

  // The four pipeline stages - subclasses implement these
  abstract gatherInput(orgId: string, context: Record<string, unknown>): Promise<AgentStep>;
  abstract process(input: AgentStep): Promise<AgentStep>;
  abstract applyLogic(processed: AgentStep): Promise<AgentStep>;
  abstract generateOutput(logic: AgentStep): Promise<AgentStep>;

  /** Run the full Input -> Process -> Logic -> Output pipeline */
  async run(orgId: string, context: Record<string, unknown> = {}): Promise<AgentRunResult> {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const steps: AgentStep[] = [];

    // Get trust level for this org+agent combo
    const trustLevel = await getTrustLevel(orgId, this.id);

    try {
      // Step 1: Input
      const inputStep = await this.gatherInput(orgId, context);
      inputStep.completedAt = new Date().toISOString();
      steps.push(inputStep);
      if (inputStep.status === 'failed') throw new Error(inputStep.error || 'Input gathering failed');

      // Step 2: Process
      const processStep = await this.process(inputStep);
      processStep.completedAt = new Date().toISOString();
      steps.push(processStep);
      if (processStep.status === 'failed') throw new Error(processStep.error || 'Processing failed');

      // Step 3: Logic
      const logicStep = await this.applyLogic(processStep);
      logicStep.completedAt = new Date().toISOString();
      steps.push(logicStep);
      if (logicStep.status === 'failed') throw new Error(logicStep.error || 'Logic failed');

      // Step 4: Output
      const outputStep = await this.generateOutput(logicStep);
      outputStep.completedAt = new Date().toISOString();
      steps.push(outputStep);

      // Calculate overall confidence (average of all steps with confidence)
      const stepsWithConfidence = steps.filter(s => s.confidence !== undefined);
      const overallConfidence = stepsWithConfidence.length > 0
        ? stepsWithConfidence.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / stepsWithConfidence.length
        : 0;

      // Determine if needs review based on trust level
      const needsReview = trustLevel === 'guided' || overallConfidence < 0.8;

      const result: AgentRunResult = {
        agentId: this.id,
        runId,
        orgId,
        status: needsReview ? 'needs_review' : 'completed',
        steps,
        summary: (outputStep.output?.summary as string) ?? 'Agent run completed',
        confidence: overallConfidence,
        itemsProcessed: (outputStep.output?.itemsProcessed as number) ?? 0,
        itemsFlagged: (outputStep.output?.itemsFlagged as number) ?? 0,
        startedAt,
        completedAt: new Date().toISOString(),
        trustLevel,
      };

      // Log the run
      await logAgentRun(result);

      return result;
    } catch (error) {
      const result: AgentRunResult = {
        agentId: this.id,
        runId,
        orgId,
        status: 'failed',
        steps,
        summary: `Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        itemsProcessed: 0,
        itemsFlagged: 0,
        startedAt,
        completedAt: new Date().toISOString(),
        trustLevel,
      };
      await logAgentRun(result);
      return result;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Read the trust level for a given org + agent from the database.
 * Returns 'guided' if no record exists yet.
 */
export async function getTrustLevel(orgId: string, agentId: string): Promise<TrustLevel> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('agent_trust_levels')
    .select('trust_level')
    .eq('org_id', orgId)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (error) {
    console.error('[agents/runtime] getTrustLevel error:', error.message);
    return 'guided';
  }

  return (data?.trust_level as TrustLevel) ?? 'guided';
}

/**
 * Persist an agent run result to the agent_runs table.
 */
export async function logAgentRun(result: AgentRunResult): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase.from('agent_runs').insert({
    org_id: result.orgId,
    agent_id: result.agentId,
    run_id: result.runId,
    status: result.status,
    steps: result.steps,
    summary: result.summary,
    confidence: result.confidence,
    items_processed: result.itemsProcessed,
    items_flagged: result.itemsFlagged,
    trust_level: result.trustLevel,
    started_at: result.startedAt,
    completed_at: result.completedAt,
  });

  if (error) {
    console.error('[agents/runtime] logAgentRun error:', error.message);
  }
}

/**
 * Evaluate recent runs and upgrade/downgrade trust level automatically.
 *
 * Promotion rules (based on last 20 runs):
 *  - guided -> confident: >90% accuracy, >50 items processed
 *  - confident -> autonomous: >95% accuracy, >200 items processed
 */
export async function updateTrustLevel(orgId: string, agentId: string): Promise<TrustLevel> {
  const supabase = await createUntypedServiceClient();

  // Fetch last 20 completed/needs_review runs
  const { data: runs, error: runsError } = await supabase
    .from('agent_runs')
    .select('status, confidence, items_processed')
    .eq('org_id', orgId)
    .eq('agent_id', agentId)
    .in('status', ['completed', 'needs_review'])
    .order('completed_at', { ascending: false })
    .limit(20);

  if (runsError || !runs || runs.length === 0) {
    return 'guided';
  }

  const totalItems = runs.reduce((sum, r) => sum + ((r.items_processed as number) ?? 0), 0);
  const accuracySum = runs.reduce((sum, r) => sum + ((r.confidence as number) ?? 0), 0);
  const accuracyRate = accuracySum / runs.length;

  let newLevel: TrustLevel = 'guided';

  if (accuracyRate > 0.95 && totalItems > 200) {
    newLevel = 'autonomous';
  } else if (accuracyRate > 0.9 && totalItems > 50) {
    newLevel = 'confident';
  }

  // Upsert the trust level
  const { error: upsertError } = await supabase
    .from('agent_trust_levels')
    .upsert(
      {
        org_id: orgId,
        agent_id: agentId,
        trust_level: newLevel,
        runs_analysed: runs.length,
        accuracy_rate: accuracyRate,
        last_evaluated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,agent_id' }
    );

  if (upsertError) {
    console.error('[agents/runtime] updateTrustLevel error:', upsertError.message);
  }

  return newLevel;
}
