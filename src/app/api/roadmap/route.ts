import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  getStepDefinitions,
  mergeProgressWithSteps,
} from '@/lib/roadmap/roadmap-data';
import type { RoadmapProgressRow, StepStatus } from '@/lib/roadmap/roadmap-data';

/* ─────────────────────────────────────────────
 * Auto-detection: check DB for steps that can
 * be inferred from existing data
 * ───────────────────────────────────────────── */
async function detectAutoSteps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
): Promise<Record<string, boolean>> {
  const detected: Record<string, boolean> = {};

  // create-account is always true (user is authenticated)
  detected['create-account'] = true;

  // connect-xero: active row in xero_connections
  const { count: xeroCount } = await supabase
    .from('xero_connections')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'active');
  detected['connect-xero'] = (xeroCount ?? 0) > 0;

  // review-chart: chart_of_accounts has rows for org
  const { count: coaCount } = await supabase
    .from('chart_of_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  detected['review-chart'] = (coaCount ?? 0) > 0;

  return detected;
}

/* ─────────────────────────────────────────────
 * GET /api/roadmap
 * Returns the full merged roadmap for the org
 * ───────────────────────────────────────────── */
export async function GET() {
  try {
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();

    // Fetch persisted progress rows
    const { data: rows, error } = await supabase
      .from('roadmap_progress')
      .select('step_id, status, completed_at')
      .eq('org_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dbRows = (rows ?? []) as unknown as RoadmapProgressRow[];

    // Auto-detect steps from existing tables
    const autoDetected = await detectAutoSteps(supabase, orgId);

    const roadmap = mergeProgressWithSteps(dbRows, autoDetected);

    return NextResponse.json(roadmap);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/* ─────────────────────────────────────────────
 * PATCH /api/roadmap
 * Body: { stepId: string, status: StepStatus }
 * Updates a single step's status and auto-unlocks
 * any dependent steps whose prereqs are now met.
 * ───────────────────────────────────────────── */
export async function PATCH(request: Request) {
  try {
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();
    const body = await request.json();

    const { stepId, status } = body as { stepId: string; status: StepStatus };

    if (!stepId || !status) {
      return NextResponse.json({ error: 'stepId and status are required' }, { status: 400 });
    }

    const validStatuses: StepStatus[] = ['completed', 'in_progress', 'locked', 'available'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    // Validate that stepId is a real step
    const definitions = getStepDefinitions();
    const stepDef = definitions.find((d) => d.id === stepId);
    if (!stepDef) {
      return NextResponse.json({ error: `Unknown step: ${stepId}` }, { status: 400 });
    }

    // Upsert the progress row
    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    const { error: upsertError } = await supabase
      .from('roadmap_progress')
      .upsert(
        {
          org_id: orgId,
          step_id: stepId,
          status,
          completed_at: completedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,step_id' },
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Auto-unlock dependent steps when marking complete
    if (status === 'completed') {
      // Fetch current progress to know what's completed
      const { data: allRows } = await supabase
        .from('roadmap_progress')
        .select('step_id, status')
        .eq('org_id', orgId);

      const completedIds = new Set(
        ((allRows ?? []) as Array<{ step_id: string; status: string }>)
          .filter((r) => r.status === 'completed')
          .map((r) => r.step_id),
      );

      // Find steps that depend on the just-completed step and are currently locked
      const dependents = definitions.filter(
        (d) =>
          d.requiredSteps.includes(stepId) &&
          !completedIds.has(d.id),
      );

      for (const dep of dependents) {
        const prereqsMet = dep.requiredSteps.every((req) => completedIds.has(req));
        if (prereqsMet) {
          // Unlock: upsert to 'available'
          await supabase
            .from('roadmap_progress')
            .upsert(
              {
                org_id: orgId,
                step_id: dep.id,
                status: 'available',
                completed_at: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'org_id,step_id' },
            );
        }
      }
    }

    // Return the updated full roadmap
    const { data: updatedRows } = await supabase
      .from('roadmap_progress')
      .select('step_id, status, completed_at')
      .eq('org_id', orgId);

    const autoDetected = await detectAutoSteps(supabase, orgId);
    const roadmap = mergeProgressWithSteps(
      (updatedRows ?? []) as unknown as RoadmapProgressRow[],
      autoDetected,
    );

    return NextResponse.json(roadmap);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
