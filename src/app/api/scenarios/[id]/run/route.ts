import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { runModelPipeline } from '@/lib/scenarios/scenario-pipeline';
import { generateAndPersistCommentary } from '@/lib/ai/commentary';

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

    return NextResponse.json({
      modelVersionId: result.modelVersionId,
      snapshotCount: result.snapshotCount,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
