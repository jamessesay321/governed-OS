import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { logAudit } from '@/lib/audit/log';

/**
 * GET /api/reports/[orgId]/[reportId] - Get report detail.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; reportId: string }> }
) {
  try {
    const { orgId, reportId } = await params;
    const { profile } = await getAuthenticatedUser();

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();
    const { data: report, error } = await supabase
      .from('reports' as any)
      .select('*')
      .eq('id', reportId)
      .eq('org_id', orgId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[REPORTS API] Detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/reports/[orgId]/[reportId] - Update report status (publish/approve) or commentary.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; reportId: string }> }
) {
  try {
    const { orgId, reportId } = await params;
    const { user, profile } = await getAuthenticatedUser();

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.status && ['draft', 'published'].includes(body.status)) {
      updates.status = body.status;
      if (body.status === 'published') {
        updates.approved_by = user.id;
      }
    }

    if (body.sections) {
      updates.sections = body.sections;
    }

    if (body.ai_commentary !== undefined) {
      updates.ai_commentary = body.ai_commentary;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = await createServiceClient();
    const { data: report, error } = await supabase
      .from('reports' as any)
      .update(updates)
      .eq('id', reportId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('[REPORTS API] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: body.status === 'published' ? 'report.published' : 'report.updated',
      entityType: 'report',
      entityId: reportId,
      changes: updates,
    });

    return NextResponse.json({ report });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[REPORTS API] Patch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
