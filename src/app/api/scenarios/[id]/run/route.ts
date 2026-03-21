import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { runModelPipeline } from '@/lib/scenarios/scenario-pipeline';
import { generateAndPersistCommentary } from '@/lib/ai/commentary';
import { autoStoreToVault } from '@/lib/vault/auto-store';

type Params = { params: Promise<{ id: string }> };

// POST /api/scenarios/[id]/run — Run model pipeline (advisor+)
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('advisor');

    const result = await runModelPipeline(profile.org_id, user.id, id);

    // Generate AI commentary asynchronously (best effort)
    try {
      await generateAndPersistCommentary(
        profile.org_id,
        result.modelVersionId,
        id
      );
    } catch {
      // AI commentary failures don't block the pipeline
    }

    // Auto-store scenario output to Knowledge Vault (best-effort)
    autoStoreToVault({
      orgId: profile.org_id,
      userId: user.id,
      itemType: 'scenario_output',
      title: `Scenario Run — ${result.snapshotCount} periods`,
      description: `Model pipeline output for scenario ${id}`,
      tags: ['scenario', 'model-run', 'auto-generated'],
      content: { modelVersionId: result.modelVersionId, snapshotCount: result.snapshotCount, scenarioId: id },
      provenance: { source_entity_type: 'scenario', source_entity_id: id },
      sourceEntityType: 'scenario',
      sourceEntityId: id,
    });

    return NextResponse.json({
      modelVersionId: result.modelVersionId,
      snapshotCount: result.snapshotCount,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[scenarios/run] POST error:', e);
    return NextResponse.json({ error: 'Failed to run scenario pipeline' }, { status: 500 });
  }
}
