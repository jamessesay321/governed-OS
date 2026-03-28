import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { generateReport } from '@/lib/reports/generator';
import { getBuilderTemplate } from '@/lib/reports/templates';

/**
 * POST /api/reports/generate
 * Generate a report from a template using the report builder engine.
 * Requires admin role.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    // Parse body
    const body = await request.json();
    const { templateId, period, customSections } = body as {
      templateId: string;
      period?: string;
      customSections?: string[];
    };

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    // Validate template exists
    const template = getBuilderTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Unknown template: ${templateId}` },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateCheck = checkRateLimit(orgId, 'report-generate');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateCheck) }
      );
    }

    // Budget check
    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'AI token budget exceeded for this billing period.' },
        { status: 402 }
      );
    }

    // Generate the report
    const report = await generateReport(orgId, templateId, period);

    // Track estimated token usage (narrative sections use AI)
    const narrativeSections = report.sections.filter(
      (s) => s.type === 'narrative' && s.content.narrative
    );
    const estimatedTokens = narrativeSections.length * 500; // rough estimate per narrative
    if (estimatedTokens > 0) {
      await trackTokenUsage(orgId, estimatedTokens, 'report-generate');
    }

    return NextResponse.json(
      { report },
      { status: 201, headers: getRateLimitHeaders(rateCheck) }
    );
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[REPORT GENERATE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
