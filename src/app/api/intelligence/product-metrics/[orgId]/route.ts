import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { parseLineItems, getPeriodDateRange } from '@/lib/intelligence/line-item-parser';
import { calculateIndustryKPIs } from '@/lib/intelligence/industry-kpis';
import { z } from 'zod';

const querySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
});

/**
 * GET /api/intelligence/product-metrics/[orgId]?period=YYYY-MM
 *
 * Returns product-level metrics parsed from raw transaction line items.
 * Includes industry-specific KPIs and category breakdown.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      period: url.searchParams.get('period'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { period } = parsed.data;
    const { startDate, endDate } = getPeriodDateRange(period);

    // Fetch org industry for classification
    const supabase = await createUntypedServiceClient();
    const { data: orgData } = await supabase
      .from('organisations')
      .select('industry')
      .eq('id', orgId)
      .single();

    const industry = ((orgData as Record<string, unknown>)?.industry as string) ?? '';

    // Parse line items and compute metrics
    const result = await parseLineItems(orgId, startDate, endDate, industry);

    // Calculate industry-specific KPIs
    const productKPIs = calculateIndustryKPIs(result, industry);

    return NextResponse.json({
      period,
      industry,
      metrics: result.metrics,
      totalUnits: result.totalUnits,
      totalRevenue: result.totalRevenue,
      uniqueCustomers: result.uniqueCustomers,
      topCategory: result.topCategory,
      categoryBreakdown: result.categoryBreakdown,
      kpis: productKPIs,
    });
  } catch (err) {
    console.error('[PRODUCT-METRICS] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to compute product metrics' },
      { status: 500 }
    );
  }
}
