import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { getConnectedIntegrations } from '@/lib/integrations/framework';
import {
  fetchOrders,
  fetchOrderCount,
  getRevenueByPeriod,
  getTopProducts,
  syncShopifyOrders,
  syncShopifyProducts,
  syncShopifyCustomers,
  reconcileShopifyWithXero,
} from '@/lib/integrations/shopify';
import { logAudit } from '@/lib/audit/log';
import { syncLimiter } from '@/lib/rate-limit';

/**
 * GET /api/integrations/shopify
 * Returns order/product summary for the storefront dashboard.
 */
export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    // Get Shopify connection
    const connections = await getConnectedIntegrations(orgId);
    const shopifyConn = connections.find((c) => c.integrationId === 'shopify');

    if (!shopifyConn) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const shopDomain = shopifyConn.credentials.shopDomain as string;
    const accessToken = shopifyConn.credentials.accessToken as string;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { connected: false, error: 'Missing Shopify credentials' },
        { status: 200 }
      );
    }

    // Fetch recent orders (last 250 for summary computation)
    const { orders } = await fetchOrders({
      shopDomain,
      accessToken,
      status: 'any',
      limit: 250,
    });

    const orderCount = await fetchOrderCount(shopDomain, accessToken);
    const revenueByPeriod = getRevenueByPeriod(orders);
    const topProducts = getTopProducts(orders, 10);

    // Compute totals from fetched orders
    const totalRevenue = orders.reduce((sum, o) => {
      if (o.financial_status === 'voided' || o.financial_status === 'refunded') return sum;
      return sum + parseFloat(o.total_price);
    }, 0);

    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Reconciliation with Xero
    const reconciliation = await reconcileShopifyWithXero(orgId);

    return NextResponse.json({
      connected: true,
      summary: {
        totalOrders: orderCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        currency: orders[0]?.currency ?? 'GBP',
      },
      revenueByPeriod,
      topProducts,
      reconciliation,
      lastSyncAt: shopifyConn.lastSyncAt ?? null,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[SHOPIFY API] GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Shopify data' },
      { status: 500 }
    );
  }
}

const syncBodySchema = z.object({
  action: z.enum(['sync_orders', 'sync_products', 'sync_customers', 'full_sync']),
});

/**
 * POST /api/integrations/shopify
 * Triggers a Shopify sync (orders, products, customers, or full).
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('advisor');
    const orgId = profile.org_id as string;

    // Rate limit: 3 syncs per minute per org
    const limited = syncLimiter.check(orgId);
    if (limited) return limited;

    const body = await request.json();
    const parsed = syncBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

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

    let result: { synced: number } = { synced: 0 };

    if (action === 'sync_orders' || action === 'full_sync') {
      const orderResult = await syncShopifyOrders(orgId, accessToken, shopDomain);
      result.synced += orderResult.synced;
    }

    if (action === 'sync_products' || action === 'full_sync') {
      const productResult = await syncShopifyProducts(orgId, accessToken, shopDomain);
      result.synced += productResult.synced;
    }

    if (action === 'sync_customers' || action === 'full_sync') {
      const customerResult = await syncShopifyCustomers(orgId, accessToken, shopDomain);
      result.synced += customerResult.synced;
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: `shopify.${action}`,
      entityType: 'integration_connection',
      metadata: { shopDomain, syncedCount: result.synced },
    });

    return NextResponse.json({
      success: true,
      action,
      synced: result.synced,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[SHOPIFY API] POST error:', err);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
