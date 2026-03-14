import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { runAssessment, getLatestAssessment } from '@/lib/playbook/assessment';
import { generateActions } from '@/lib/playbook/actions';

type RouteParams = { params: Promise<{ orgId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const templateId = body.templateId || 'tpl-general-sme-growth';

    const assessment = await runAssessment(orgId, templateId);
    const actions = await generateActions(assessment);

    return NextResponse.json({ assessment, actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assessment failed';
    const status = message.includes('authenticated') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
