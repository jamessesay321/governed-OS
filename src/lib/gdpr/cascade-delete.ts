import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tables to delete in FK-safe order (children first, parent last).
 * audit_logs is intentionally EXCLUDED — immutable by design.
 */
export const DELETION_ORDER: string[] = [
  'normalised_financials',
  'raw_transactions',
  'xero_connections',
  'scenario_assumptions',
  'scenarios',
  'kpi_snapshots',
  'ai_token_usage',
  'vault_items',
  'number_challenges',
  'budget_lines',
  'notifications',
  'alert_rules',
  'data_deletion_requests',
  'subscriptions',
  'org_invitations',
  'profiles',
];

export type DeletionStep = {
  table: string;
  rowsDeleted: number;
  success: boolean;
  error?: string;
};

export type DeletionManifest = {
  orgId: string;
  steps: DeletionStep[];
  orgDeleted: boolean;
  completedAt: string;
};

/**
 * Cascade-delete all data for an org in FK-safe order.
 * Each step is wrapped in try/catch so partial completion is tracked.
 * Returns a manifest of what was deleted.
 */
export async function cascadeDeleteOrg(
  supabase: SupabaseClient,
  orgId: string,
): Promise<DeletionManifest> {
  const steps: DeletionStep[] = [];

  for (const table of DELETION_ORDER) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('org_id', orgId)
        .select('id');

      if (error) {
        steps.push({
          table,
          rowsDeleted: 0,
          success: false,
          error: error.message,
        });
      } else {
        steps.push({
          table,
          rowsDeleted: data?.length ?? 0,
          success: true,
        });
      }
    } catch (err) {
      steps.push({
        table,
        rowsDeleted: 0,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Finally delete the organisation itself
  let orgDeleted = false;
  try {
    const { error } = await supabase
      .from('organisations')
      .delete()
      .eq('id', orgId);

    if (!error) {
      orgDeleted = true;
    } else {
      steps.push({
        table: 'organisations',
        rowsDeleted: 0,
        success: false,
        error: error.message,
      });
    }
  } catch (err) {
    steps.push({
      table: 'organisations',
      rowsDeleted: 0,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return {
    orgId,
    steps,
    orgDeleted,
    completedAt: new Date().toISOString(),
  };
}
