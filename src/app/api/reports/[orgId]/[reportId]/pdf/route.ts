import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { generatePrintableHTML } from '@/lib/reports/pdf';
import type { Report } from '@/types/reports';

/**
 * GET /api/reports/[orgId]/[reportId]/pdf - Download print-friendly HTML report.
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

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('reports' as any)
      .select('*')
      .eq('id', reportId)
      .eq('org_id', orgId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Fetch org name
    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single();

    const orgName = org?.name || 'Organisation';

    const html = generatePrintableHTML(report as unknown as Report, orgName);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${(report as any).title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.html"`,
      },
    });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[REPORTS API] PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
