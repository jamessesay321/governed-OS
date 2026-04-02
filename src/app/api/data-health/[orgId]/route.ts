import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { orgIdSchema } from '@/lib/schemas';

/**
 * GET /api/data-health/:orgId
 *
 * Returns the most recent data health report for an org.
 * Falls back gracefully if no reports exist yet.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId: rawOrgId } = await params;

    // Validate orgId is a valid UUID
    const parsed = orgIdSchema.safeParse(rawOrgId);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid organisation ID' }, { status: 400 });
    }
    const orgId = parsed.data;

    // Auth: ensure user belongs to this org
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();

    // Get the most recent health report for this org
    const { data: report, error } = await supabase
      .from('data_health_reports')
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(1)
      .single();

    if (error || !report) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[DATA HEALTH API]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
