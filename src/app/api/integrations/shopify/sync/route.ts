import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  syncShopifyOrders,
  syncShopifyProducts,
  syncShopifyCustomers,
} from '@/lib/integrations/shopify';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/integrations/shopify/sync
 * Triggers a manual Shopify re-sync (orders, products, customers).
 * Requires advisor+ role.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('advisor');
    const orgId = profile.org_id as string;

    // Get stored Shopify credentials
    const supabase = await createUntypedServiceClient();
    const { data: conn, error: connErr } = await supabase
      .from('integration_connections')
      .select('credentials, status')
      .eq('org_id', orgId)
      .eq('integration_id', 'shopify')
      .single();

    if (connErr || !conn) {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 404 }
      );
    }

    if (conn.status !== 'active') {
      return NextResponse.json(
        { error: `Shopify connection is ${conn.status}` },
        { status: 400 }
      );
    }

    const { accessToken, shopDomain } = conn.credentials as {
      accessToken: string;
      shopDomain: string;
    };

    if (!accessToken || !shopDomain) {
      return NextResponse.json(
        { error: 'Missing Shopify credentials' },
        { status: 400 }
      );
    }

    // Run all syncs
    const [orders, products, customers] = await Promise.all([
      syncShopifyOrders(orgId, accessToken, shopDomain),
      syncShopifyProducts(orgId, accessToken, shopDomain),
      syncShopifyCustomers(orgId, accessToken, shopDomain),
    ]);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'shopify.manual_sync',
      entityType: 'integration_connection',
      metadata: {
        ordersSynced: orders.synced,
        productsSynced: products.synced,
        customersSynced: customers.synced,
      },
    });

    return NextResponse.json({
      success: true,
      orders: orders.synced,
      products: products.synced,
      customers: customers.synced,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[SHOPIFY SYNC] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
