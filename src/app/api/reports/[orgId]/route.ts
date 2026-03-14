import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { generateReport } from '@/lib/reports/generator';
import { logAudit } from '@/lib/audit/log';
import type { GenerateReportOptions } from '@/types/reports';

/**
 * GET /api/reports/[orgId] - List reports for an organisation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { user, profile } = await getAuthenticatedUser();

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();
    const { data: reports, error } = await supabase
      .from('reports' as any)
      .select('id, org_id, report_type, title, status, period_start, period_end, generated_by, approved_by, created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[REPORTS API] List error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[REPORTS API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/reports/[orgId] - Generate a new report.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { user, profile } = await getAuthenticatedUser();

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const options: GenerateReportOptions = {
      reportType: body.reportType,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      selectedSections: body.selectedSections,
      title: body.title,
    };

    if (!options.reportType || !options.periodStart || !options.periodEnd) {
      return NextResponse.json(
        { error: 'reportType, periodStart, and periodEnd are required' },
        { status: 400 }
      );
    }

    const report = await generateReport(orgId, user.id, options);

    // Persist the report
    const supabase = await createServiceClient();
    const { error: insertError } = await supabase.from('reports' as any).insert({
      id: report.id,
      org_id: report.org_id,
      report_type: report.report_type,
      title: report.title,
      status: report.status,
      period_start: report.period_start,
      period_end: report.period_end,
      sections: report.sections as unknown as Record<string, unknown>,
      ai_commentary: report.ai_commentary,
      generated_by: report.generated_by,
      approved_by: report.approved_by,
      pdf_url: report.pdf_url,
    });

    if (insertError) {
      console.error('[REPORTS API] Insert error:', insertError.message);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'report.generated',
      entityType: 'report',
      entityId: report.id,
      metadata: { reportType: options.reportType, periodStart: options.periodStart, periodEnd: options.periodEnd },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[REPORTS API] Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
