import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { generatePrintableHTML } from '@/lib/reports/pdf';
import { renderHtmlToPdf } from '@/lib/reports/pdf-render';
import type { Report } from '@/types/reports';

/**
 * GET /api/reports/[orgId]/[reportId]/pdf - Generate and download a PDF report.
 *
 * Query params:
 *   - theme: theme ID (default: corporate-blue)
 *   - format: "html" to return raw HTML instead of PDF (debug mode)
 *
 * Returns application/pdf by default. Uses headless Chromium via Puppeteer
 * for server-side PDF rendering with full CSS support.
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

    const themeId = request.nextUrl.searchParams.get('theme') ?? undefined;
    const format = request.nextUrl.searchParams.get('format');
    const html = generatePrintableHTML(report as unknown as Report, orgName, themeId);

    // Debug mode: return HTML directly
    if (format === 'html') {
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${sanitiseFilename((report as any).title)}.html"`,
        },
      });
    }

    // Default: render to PDF via headless Chromium
    const pdfBuffer = await renderHtmlToPdf(html);
    const filename = sanitiseFilename((report as any).title);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
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

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_ ]/g, '').trim() || 'report';
}
