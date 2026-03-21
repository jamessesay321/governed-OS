import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { runAssessment, getLatestAssessment } from '@/lib/playbook/assessment';
import { generateActions } from '@/lib/playbook/actions';
import { logAudit } from '@/lib/audit/log';
import { autoStoreToVault } from '@/lib/vault/auto-store';
import { z } from 'zod';

type RouteParams = { params: Promise<{ orgId: string }> };

const assessSchema = z.object({
  templateId: z.string().min(1).max(100).default('tpl-general-sme-growth'),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = assessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { templateId } = parsed.data;
    const assessment = await runAssessment(orgId, templateId);
    const actions = await generateActions(assessment);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'playbook.assessment_run',
      entityType: 'playbook_assessment',
      metadata: { templateId, actionCount: actions.length },
    });

    // Auto-store to Knowledge Vault (best-effort)
    autoStoreToVault({
      orgId,
      userId: user.id,
      itemType: 'playbook_assessment',
      title: `Playbook Assessment — ${templateId}`,
      description: `Assessment with ${actions.length} recommended actions`,
      tags: ['playbook', 'assessment', templateId, 'auto-generated'],
      content: { assessment, actions },
      provenance: { data_freshness_at: new Date().toISOString() },
      sourceEntityType: 'playbook_assessment',
    });

    return NextResponse.json({ assessment, actions });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[playbook/assess] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Assessment failed' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assessment = await getLatestAssessment(orgId);

    if (!assessment) {
      return NextResponse.json(
        { error: 'No assessment found. Run an assessment first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ assessment });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch assessment' }, { status: 500 });
  }
}
