import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { getConnectedIntegrations } from '@/lib/integrations/framework';
import { fetchOrders } from '@/lib/integrations/shopify';

const querySchema = z.object({
  status: z.enum(['any', 'open', 'closed', 'cancelled']).optional().default('any'),
  limit: z.coerce.number().min(1).max(250).optional().default(50),
  since_id: z.coerce.number().optional(),
  created_at_min: z.string().datetime({ offset: true }).optional(),
  created_at_max: z.string().datetime({ offset: true }).optional(),
  page_info: z.string().optional(),
});

/**
 * GET /api/integrations/shopify/orders
 * Returns paginated Shopify orders with date filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parsed = querySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const params = parsed.data;

    // Get Shopify connection
    const connections = await getConnectedIntegrations(orgId);
    const shopifyConn = connections.find((c) => c.integrationId === 'shopify');

    if (!shopifyConn) {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 400 }
      );
    }

    const shopDomain = shopifyConn.credentials.shopDomain as string;
    const accessToken = shopifyConn.credentials.accessToken as string;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Missing Shopify credentials' },
        { status: 400 }
      );
    }

    const result = await fetchOrders({
      shopDomain,
      accessToken,
      status: params.status,
      limit: params.limit,
      sinceId: params.since_id,
      createdAtMin: params.created_at_min,
      createdAtMax: params.created_at_max,
      page_info: params.page_info,
    });

    // Map to a cleaner response shape
    const orders = result.orders.map((o) => ({
      id: o.id,
      name: o.name,
      email: o.email,
      createdAt: o.created_at,
      totalPrice: o.total_price,
      subtotalPrice: o.subtotal_price,
      totalTax: o.total_tax,
      currency: o.currency,
      financialStatus: o.financial_status,
      fulfillmentStatus: o.fulfillment_status,
      customerName: o.customer
        ? `${o.customer.first_name} ${o.customer.last_name}`.trim()
        : o.email || 'Guest',
      lineItemCount: o.line_items.length,
      lineItems: o.line_items.map((li) => ({
        title: li.title,
        quantity: li.quantity,
        price: li.price,
        sku: li.sku,
      })),
    }));

    return NextResponse.json({
      orders,
      pagination: {
        hasNextPage: result.hasNextPage,
        nextPageInfo: result.nextPageInfo,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[SHOPIFY ORDERS] GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
