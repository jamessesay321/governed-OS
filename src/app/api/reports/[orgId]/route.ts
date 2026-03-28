import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { generateReport } from '@/lib/reports/generator';
import { logAudit } from '@/lib/audit/log';
import { autoStoreToVault } from '@/lib/vault/auto-store';
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

    const report = await generateReport(orgId, options.reportType, options.periodStart);

    // Persist the report to the legacy reports table
    const supabase = await createServiceClient();
    const { error: insertError } = await supabase.from('reports' as any).insert({
      id: report.id,
      org_id: report.orgId,
      report_type: report.templateId,
      title: report.title,
      status: report.status,
      period_start: report.period,
      period_end: report.period,
      sections: report.sections as unknown as Record<string, unknown>,
      generated_by: report.generatedBy,
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

    // Auto-store to Knowledge Vault (best-effort, non-blocking)
    const vaultItemType = options.reportType === 'board_pack' ? 'board_pack' as const : 'custom_report' as const;
    autoStoreToVault({
      orgId,
      userId: user.id,
      itemType: vaultItemType,
      title: report.title,
      description: `${options.reportType} report for ${options.periodStart} to ${options.periodEnd}`,
      tags: [options.reportType, 'report', 'auto-generated'],
      content: { sections: report.sections },
      provenance: { source_entity_type: 'report', source_entity_id: report.id },
      sourceEntityType: 'report',
      sourceEntityId: report.id,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
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
