import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { duplicateScenarioSchema } from '@/lib/schemas';
import { duplicateScenario } from '@/lib/scenarios/scenario-pipeline';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ id: string }> };

// POST /api/scenarios/[id]/duplicate — Duplicate scenario (advisor+)
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = duplicateScenarioSchema.parse(body);

    const result = await duplicateScenario(profile.org_id, user.id, id, parsed.name);

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.duplicated',
      entityType: 'scenario',
      entityId: result.scenario.id,
      metadata: { sourceScenarioId: id, newName: parsed.name },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
