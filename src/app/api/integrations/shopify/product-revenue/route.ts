import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * GET /api/integrations/shopify/product-revenue?period=2026-04&orgId=...
 *
 * Aggregates Shopify line-item data from staged_transactions to produce
 * a product-level revenue breakdown. This is the magic that splits the
 * single "Shopify Sales" Xero account into actual product categories.
 *
 * Returns products sorted by revenue descending with percentages.
 * DETERMINISTIC — pure SQL aggregation, no AI.
 */

const querySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  orgId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRole('viewer');
    const url = new URL(request.url);
    const params = querySchema.safeParse({
      period: url.searchParams.get('period'),
      orgId: url.searchParams.get('orgId'),
    });

    if (!params.success) {
      return NextResponse.json(
        { error: params.error.issues[0]?.message ?? 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { period, orgId } = params.data;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date range for the period
    const [year, month] = period.split('-').map(Number);
    const startDate = `${period}-01`;
    // End date: first day of next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const db = await createUntypedServiceClient();

    // Query staged_transactions for Shopify orders in this period
    // Extract and aggregate line items using Postgres JSONB functions
    const { data: orders, error } = await db
      .from('staged_transactions')
      .select('raw_data')
      .eq('org_id', orgId)
      .eq('source', 'shopify')
      .gte('raw_data->>date', startDate)
      .lt('raw_data->>date', endDate);

    if (error) {
      console.error('[SHOPIFY_PRODUCT_REVENUE] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch Shopify data' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        products: [],
        total: 0,
        orderCount: 0,
        period,
        source: 'shopify',
      });
    }

    // Aggregate line items by product title
    const productMap = new Map<string, {
      revenue: number;
      units: number;
      orderCount: number;
      skus: Set<string>;
    }>();

    let totalRevenue = 0;
    let totalOrders = 0;

    for (const row of orders) {
      const rawData = row.raw_data as Record<string, unknown>;

      // Skip voided/refunded orders
      const financialStatus = rawData.financial_status as string | undefined;
      if (financialStatus === 'voided' || financialStatus === 'refunded') continue;

      totalOrders++;

      const lineItems = rawData.line_items as Array<{
        title?: string;
        quantity?: number;
        price?: string | number;
        sku?: string | null;
        variant_title?: string | null;
      }> | undefined;

      if (!lineItems || !Array.isArray(lineItems)) continue;

      for (const item of lineItems) {
        const title = item.title ?? 'Unknown Product';
        const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
        const price = typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price ?? '0'));
        const lineRevenue = price * quantity;

        const existing = productMap.get(title) ?? {
          revenue: 0,
          units: 0,
          orderCount: 0,
          skus: new Set<string>(),
        };

        existing.revenue += lineRevenue;
        existing.units += quantity;
        existing.orderCount++;
        if (item.sku) existing.skus.add(item.sku);

        productMap.set(title, existing);
        totalRevenue += lineRevenue;
      }
    }

    // Convert to sorted array with percentages
    const products = Array.from(productMap.entries())
      .map(([title, data]) => ({
        title,
        revenue: Math.round(data.revenue * 100) / 100,
        units: data.units,
        orderCount: data.orderCount,
        percentage: totalRevenue > 0
          ? Math.round((data.revenue / totalRevenue) * 1000) / 10
          : 0,
        sku: data.skus.size === 1 ? Array.from(data.skus)[0] : undefined,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      products,
      total: Math.round(totalRevenue * 100) / 100,
      orderCount: totalOrders,
      period,
      source: 'shopify',
    });
  } catch (err) {
    console.error('[SHOPIFY_PRODUCT_REVENUE] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
