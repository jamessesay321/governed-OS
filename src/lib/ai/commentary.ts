import { createServiceClient } from '@/lib/supabase/server';
import { runAllAnalyses } from './analysis';
import type { AnalysisResult } from './analysis';

/**
 * Run all AI analyses on model snapshots and persist as commentary.
 * AI NEVER modifies assumptions or calculations.
 */
export async function generateAndPersistCommentary(
  orgId: string,
  modelVersionId: string,
  scenarioId: string
): Promise<number> {
  const supabase = await createServiceClient();

  // Fetch model snapshots
  const { data: snapshots, error: snapError } = await supabase
    .from('model_snapshots')
    .select('*')
    .eq('org_id', orgId)
    .eq('model_version_id', modelVersionId)
    .order('period', { ascending: true });

  if (snapError) {
    throw new Error(`Failed to fetch model snapshots: ${snapError.message}`);
  }

  // Fetch unit economics snapshots
  const { data: unitEconomics, error: ueError } = await supabase
    .from('unit_economics_snapshots')
    .select('*')
    .eq('org_id', orgId)
    .eq('model_version_id', modelVersionId);

  if (ueError) {
    throw new Error(`Failed to fetch unit economics: ${ueError.message}`);
  }

  // Run all analyses (pure functions)
  const results: AnalysisResult[] = runAllAnalyses(
    snapshots ?? [],
    unitEconomics ?? []
  );

  if (results.length === 0) return 0;

  // Persist commentary
  const rows = results.map((r) => ({
    org_id: orgId,
    model_version_id: modelVersionId,
    scenario_id: scenarioId,
    commentary_type: r.type,
    title: r.title,
    body: r.body,
    confidence_score: r.confidenceScore,
    source_data_ids: r.sourceDataIds,
    ai_model_name: 'governed-os-analysis',
    ai_model_version: '1.0.0',
    metadata: {},
  }));

  const { error: insertError } = await supabase.from('ai_commentary').insert(rows);

  if (insertError) {
    throw new Error(`Failed to persist AI commentary: ${insertError.message}`);
  }

  return rows.length;
}
