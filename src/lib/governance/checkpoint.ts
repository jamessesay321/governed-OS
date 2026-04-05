/**
 * Governance Checkpoint — wraps every AI intelligence output with audit trail.
 *
 * Every Claude API call for intelligence outputs (variance commentary, KPI insights,
 * scenario results, narratives, recommendations) flows through this checkpoint.
 *
 * Phase 1: All outputs auto-approve but the audit trail infrastructure exists from Day 1.
 * Phase 2: Advisor-configurable approval gates per output type.
 *
 * This is what separates Advisory OS from every competitor. Blocks.diy has platform
 * security (SOC 2). AthenaGen has on-premise deployment. Neither has output-level
 * governance — immutable audit trails on every AI-generated insight.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OutputType =
  | 'narrative'
  | 'variance_commentary'
  | 'kpi_insight'
  | 'health_summary'
  | 'scenario_result'
  | 'playbook_recommendation'
  | 'term_explanation'
  | 'ask_grove_answer'
  | 'account_mapping'
  | 'board_pack_section'
  | 'business_thesis'
  | 'anomaly_detection'
  | 'scenario_interpretation'
  | 'interview_recommendation'
  | 'report_section'
  | 'company_skill'
  | 'intelligence_query'
  | 'daily_briefing';

export type GovernanceStatus =
  | 'auto_approved'
  | 'pending_review'
  | 'human_approved'
  | 'rejected';

export interface DataSourceReference {
  /** What kind of source (xero_financials, chart_of_accounts, kpi_snapshot, etc.) */
  type: string;
  /** Period or identifier */
  reference: string;
  /** When this data was last refreshed */
  lastUpdated?: string;
}

export interface GovernanceCheckpointInput {
  orgId: string;
  userId?: string;
  outputType: OutputType;
  /** The AI-generated content (narrative text, JSON result, etc.) */
  content: string;
  /** Model used: 'haiku', 'sonnet', 'opus' */
  modelTier: string;
  /** Model ID: 'claude-haiku-4-20250414', etc. */
  modelId: string;
  /** SHA-256 hash of the prompt for reproducibility */
  promptHash?: string;
  /** Where the input data came from — for data lineage */
  dataSources: DataSourceReference[];
  /** Actual token counts from the API response */
  tokensUsed?: number;
  /** Was this served from cache? */
  cached?: boolean;
}

export interface GovernedOutput {
  /** The governance record ID */
  id: string;
  /** Status after checkpoint evaluation */
  status: GovernanceStatus;
  /** The content (same as input — passed through on approval) */
  content: string;
  /** Data lineage references */
  dataSources: DataSourceReference[];
}

interface AuditTrailEntry {
  action: string;
  timestamp: string;
  actor: string;
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Governance configuration — per output type
// ---------------------------------------------------------------------------

interface GovernanceConfig {
  /** Auto-approve this output type? (Phase 1: all true) */
  autoApprove: boolean;
  /** Which role must approve if not auto-approved? */
  approverRole: string;
  /** Persist to agent_outputs table? Some outputs are lightweight and don't need persistence. */
  persist: boolean;
}

/**
 * Phase 1 defaults: everything auto-approves, but the audit trail exists.
 * Phase 2: configurable per org via agent_configs table.
 */
const DEFAULT_GOVERNANCE: Record<OutputType, GovernanceConfig> = {
  narrative:                { autoApprove: true, approverRole: 'advisor', persist: true },
  variance_commentary:      { autoApprove: true, approverRole: 'advisor', persist: true },
  kpi_insight:              { autoApprove: true, approverRole: 'advisor', persist: true },
  health_summary:           { autoApprove: true, approverRole: 'advisor', persist: true },
  scenario_result:          { autoApprove: true, approverRole: 'advisor', persist: true },
  playbook_recommendation:  { autoApprove: true, approverRole: 'advisor', persist: true },
  board_pack_section:       { autoApprove: true, approverRole: 'advisor', persist: true },
  // Analysis & intelligence outputs
  business_thesis:          { autoApprove: true, approverRole: 'advisor', persist: true },
  anomaly_detection:        { autoApprove: true, approverRole: 'advisor', persist: true },
  scenario_interpretation:  { autoApprove: true, approverRole: 'advisor', persist: true },
  report_section:           { autoApprove: true, approverRole: 'advisor', persist: true },
  // Lightweight outputs — still audit-logged but not persisted to agent_outputs
  term_explanation:         { autoApprove: true, approverRole: 'viewer',  persist: false },
  ask_grove_answer:         { autoApprove: true, approverRole: 'viewer',  persist: false },
  account_mapping:          { autoApprove: true, approverRole: 'advisor', persist: false },
  interview_recommendation: { autoApprove: true, approverRole: 'advisor', persist: false },
  company_skill:            { autoApprove: true, approverRole: 'advisor', persist: false },
  intelligence_query:       { autoApprove: true, approverRole: 'viewer',  persist: false },
  daily_briefing:           { autoApprove: true, approverRole: 'advisor', persist: true },
};

// ---------------------------------------------------------------------------
// Core checkpoint function
// ---------------------------------------------------------------------------

/**
 * Pass every AI intelligence output through this checkpoint.
 *
 * What it does:
 * 1. Logs the output to audit_logs with full metadata (model, tokens, data sources)
 * 2. Persists to agent_outputs table if configured (for data lineage and review)
 * 3. Returns the content with governance status
 *
 * Phase 1: All outputs auto-approve. The value is the audit trail.
 * Phase 2: Configurable approval gates where advisors review before SMEs see outputs.
 */
export async function governedOutput(
  input: GovernanceCheckpointInput
): Promise<GovernedOutput> {
  const config = DEFAULT_GOVERNANCE[input.outputType];
  const now = new Date().toISOString();
  let outputId = crypto.randomUUID();

  const auditEntry: AuditTrailEntry = {
    action: 'ai_output_created',
    timestamp: now,
    actor: input.userId ?? 'system',
    details: {
      outputType: input.outputType,
      modelTier: input.modelTier,
      modelId: input.modelId,
      tokensUsed: input.tokensUsed ?? 0,
      cached: input.cached ?? false,
      dataSourceCount: input.dataSources.length,
      promptHash: input.promptHash,
    },
  };

  const status: GovernanceStatus = config.autoApprove
    ? 'auto_approved'
    : 'pending_review';

  // 1. Always log to audit_logs (immutable, never fails silently in critical mode)
  try {
    await logAudit(
      {
        orgId: input.orgId,
        userId: input.userId ?? 'system',
        action: `ai_output:${input.outputType}`,
        entityType: 'ai_output',
        entityId: outputId,
        changes: {
          status,
          model: input.modelId,
          tokensUsed: input.tokensUsed ?? 0,
          cached: input.cached ?? false,
        },
        metadata: {
          dataSources: input.dataSources,
          promptHash: input.promptHash,
        },
      },
      { critical: false } // Don't break the user's request if audit write fails
    );
  } catch (err) {
    console.error('[governance/checkpoint] audit log failed:', err);
  }

  // 2. Persist to agent_outputs if configured (for data lineage queries)
  if (config.persist) {
    try {
      const supabase = await createUntypedServiceClient();
      const { data, error } = await supabase
        .from('agent_outputs')
        .insert({
          id: outputId,
          organisation_id: input.orgId,
          output_type: input.outputType,
          output_content: {
            text: input.content.slice(0, 10000), // Cap storage, full response in cache
            model_tier: input.modelTier,
          },
          model_used: input.modelId,
          prompt_hash: input.promptHash ?? null,
          data_sources: input.dataSources,
          governance_status: status,
          approved_by: status === 'auto_approved' ? null : null,
          approved_at: status === 'auto_approved' ? now : null,
          audit_trail: [auditEntry],
          created_at: now,
        })
        .select('id')
        .maybeSingle();

      if (error) {
        // Table might not exist yet — this is Phase 2 infrastructure
        // Log but don't break the request
        console.warn('[governance/checkpoint] agent_outputs insert skipped:', error.message);
      } else if (data) {
        outputId = data.id as string;
      }
    } catch (err) {
      console.warn('[governance/checkpoint] agent_outputs insert failed:', err);
    }
  }

  return {
    id: outputId,
    status,
    content: input.content,
    dataSources: input.dataSources,
  };
}

// ---------------------------------------------------------------------------
// Helper: build data source references from common patterns
// ---------------------------------------------------------------------------

export function xeroFinancialsSource(period: string, lastSync?: string): DataSourceReference {
  return {
    type: 'xero_financials',
    reference: period,
    lastUpdated: lastSync,
  };
}

export function accountMappingsSource(count: number): DataSourceReference {
  return {
    type: 'account_mappings',
    reference: `${count} mapped accounts`,
  };
}

export function companySkillSource(version: string): DataSourceReference {
  return {
    type: 'company_skill',
    reference: `v${version}`,
  };
}

export function kpiSnapshotSource(period: string, kpiCount: number): DataSourceReference {
  return {
    type: 'kpi_snapshots',
    reference: `${kpiCount} KPIs for ${period}`,
  };
}
