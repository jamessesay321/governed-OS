import { getUserProfile } from '@/lib/auth/get-user-profile';
import { getConnectedIntegrations } from '@/lib/integrations/framework';
import {
  fetchOrders,
  fetchOrderCount,
  getRevenueByPeriod,
  getTopProducts,
  reconcileShopifyWithXero,
} from '@/lib/integrations/shopify';
import StorefrontClient from './storefront-client';

export default async function StorefrontPage() {
  const { orgId } = await getUserProfile();

  // Check Shopify connection
  const connections = await getConnectedIntegrations(orgId);
  const shopifyConn = connections.find((c) => c.integrationId === 'shopify');
  const connected = !!shopifyConn;

  if (!connected) {
    return (
      <StorefrontClient
        orgId={orgId}
        connected={false}
        summary={null}
        orders={[]}
        revenueByPeriod={[]}
        topProducts={[]}
        reconciliation={null}
        lastSyncAt={null}
      />
    );
  }

  const shopDomain = shopifyConn.credentials.shopDomain as string;
  const accessToken = shopifyConn.credentials.accessToken as string;

  // Fetch data in parallel for performance
  let orders: Awaited<ReturnType<typeof fetchOrders>>['orders'] = [];
  let orderCount = 0;
  let reconciliation: Awaited<ReturnType<typeof reconcileShopifyWithXero>> | null = null;

  try {
    const [ordersResult, countResult, reconResult] = await Promise.allSettled([
      fetchOrders({ shopDomain, accessToken, status: 'any', limit: 250 }),
      fetchOrderCount(shopDomain, accessToken),
      reconcileShopifyWithXero(orgId),
    ]);

    if (ordersResult.status === 'fulfilled') {
      orders = ordersResult.value.orders;
    }
    if (countResult.status === 'fulfilled') {
      orderCount = countResult.value;
    }
    if (reconResult.status === 'fulfilled') {
      reconciliation = reconResult.value;
    }
  } catch (err) {
    console.error('[STOREFRONT] Failed to fetch Shopify data:', err);
  }

  // Compute derived data
  const revenueByPeriod = getRevenueByPeriod(orders);
  const topProducts = getTopProducts(orders, 10);

  const activeOrders = orders.filter(
    (o) => o.financial_status !== 'voided' && o.financial_status !== 'refunded'
  );
  const totalRevenue = activeOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_price),
    0
  );
  const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

  // Map orders to serialisable shape for the client component
  const serialisedOrders = orders.slice(0, 100).map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    createdAt: o.created_at,
    totalPrice: o.total_price,
    currency: o.currency,
    financialStatus: o.financial_status,
    fulfillmentStatus: o.fulfillment_status,
    customerName: o.customer
      ? `${o.customer.first_name} ${o.customer.last_name}`.trim()
      : o.email || 'Guest',
    lineItemCount: o.line_items.length,
  }));

  return (
    <StorefrontClient
      orgId={orgId}
      connected={true}
      summary={{
        totalOrders: orderCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        currency: orders[0]?.currency ?? 'GBP',
      }}
      orders={serialisedOrders}
      revenueByPeriod={revenueByPeriod}
      topProducts={topProducts}
      reconciliation={reconciliation}
      lastSyncAt={shopifyConn.lastSyncAt ?? null}
    />
  );
}
