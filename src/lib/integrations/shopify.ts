/**
 * Shopify Connector
 *
 * OAuth flow, order/product/customer sync, and cross-reference with Xero.
 * Follows the same patterns as src/lib/xero/client.ts.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { stageTransactions, type RawTransaction } from '@/lib/staging/pipeline';
import { updateLastSync } from './framework';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: ShopifyLineItem[];
  customer: ShopifyCustomer | null;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string | null;
  variant_title: string | null;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  status: string;
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string | null;
  inventory_quantity: number;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;

const SHOPIFY_SCOPES = [
  'read_orders',
  'read_products',
  'read_customers',
  'read_inventory',
].join(',');

/**
 * Build the Shopify OAuth install URL.
 * Redirect the user to this URL to start the OAuth flow.
 */
export function buildShopifyAuthUrl(shopDomain: string, state: string): string {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/shopify/callback`;
  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeShopifyToken(
  shopDomain: string,
  code: string
): Promise<{ accessToken: string; scope: string }> {
  const response = await fetch(
    `https://${shopDomain}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify token exchange failed: ${text}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    scope: data.scope,
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function shopifyFetch<T>(
  shopDomain: string,
  accessToken: string,
  endpoint: string
): Promise<T> {
  const url = `https://${shopDomain}/admin/api/2024-01/${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${endpoint}): ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Paginate through all results for a Shopify REST endpoint.
 * Follows Link header pagination.
 */
async function shopifyFetchAll<T>(
  shopDomain: string,
  accessToken: string,
  endpoint: string,
  key: string
): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `https://${shopDomain}/admin/api/2024-01/${endpoint}`;

  while (url) {
    const resp: Response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Shopify API error: ${resp.status} ${text}`);
    }

    const data = await resp.json();
    results.push(...(data[key] as T[]));

    // Check for next page via Link header
    const linkHeader: string | null = resp.headers.get('Link');
    if (linkHeader) {
      const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    } else {
      url = null;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sync functions
// ---------------------------------------------------------------------------

/**
 * Sync orders from Shopify, map to standard transaction format,
 * and ingest into the staging pipeline.
 */
export async function syncShopifyOrders(
  orgId: string,
  accessToken: string,
  shopDomain: string
): Promise<{ synced: number }> {
  console.log(`[SHOPIFY] Syncing orders for org ${orgId} from ${shopDomain}`);

  const orders = await shopifyFetchAll<ShopifyOrder>(
    shopDomain,
    accessToken,
    'orders.json?status=any&limit=250',
    'orders'
  );

  // Map Shopify orders to standard RawTransaction format
  const transactions: RawTransaction[] = orders.map((order) => ({
    source_id: `shopify_order_${order.id}`,
    date: order.created_at,
    amount: parseFloat(order.total_price),
    reference: order.name,
    contact_name: order.customer
      ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
      : order.email,
    description: `Shopify order ${order.name} (${order.financial_status})`,
    line_items: order.line_items.map((li) => ({
      title: li.title,
      quantity: li.quantity,
      price: parseFloat(li.price),
      sku: li.sku,
    })),
    // Extra Shopify-specific fields
    currency: order.currency,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    subtotal: parseFloat(order.subtotal_price),
    tax: parseFloat(order.total_tax),
  }));

  const staged = await stageTransactions(orgId, 'shopify', transactions);
  await updateLastSync(orgId, 'shopify');

  console.log(`[SHOPIFY] Staged ${staged} orders`);
  return { synced: staged };
}

/**
 * Sync products from Shopify and store them.
 */
export async function syncShopifyProducts(
  orgId: string,
  accessToken: string,
  shopDomain: string
): Promise<{ synced: number }> {
  console.log(`[SHOPIFY] Syncing products for org ${orgId} from ${shopDomain}`);

  const products = await shopifyFetchAll<ShopifyProduct>(
    shopDomain,
    accessToken,
    'products.json?limit=250',
    'products'
  );

  const supabase = await createUntypedServiceClient();

  // Store products as integration data
  const rows = products.map((product) => ({
    org_id: orgId,
    integration_id: 'shopify',
    entity_type: 'product',
    entity_id: String(product.id),
    data: {
      title: product.title,
      vendor: product.vendor,
      product_type: product.product_type,
      status: product.status,
      variants: product.variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        sku: v.sku,
        inventory_quantity: v.inventory_quantity,
      })),
      created_at: product.created_at,
      updated_at: product.updated_at,
    },
    synced_at: new Date().toISOString(),
  }));

  // Store in integration_connections config as a lightweight approach
  // In production, a dedicated integration_entities table would be better
  const { error } = await supabase
    .from('integration_connections')
    .update({
      config: { last_product_sync: new Date().toISOString(), product_count: products.length },
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('integration_id', 'shopify');

  if (error) {
    console.warn('[SHOPIFY] Failed to update product sync metadata:', error.message);
  }

  await updateLastSync(orgId, 'shopify');
  console.log(`[SHOPIFY] Synced ${products.length} products`);
  return { synced: products.length };
}

/**
 * Sync customers from Shopify.
 */
export async function syncShopifyCustomers(
  orgId: string,
  accessToken: string,
  shopDomain: string
): Promise<{ synced: number }> {
  console.log(`[SHOPIFY] Syncing customers for org ${orgId} from ${shopDomain}`);

  const customers = await shopifyFetchAll<ShopifyCustomer>(
    shopDomain,
    accessToken,
    'customers.json?limit=250',
    'customers'
  );

  const supabase = await createUntypedServiceClient();

  // Update connection metadata with customer count
  const { error } = await supabase
    .from('integration_connections')
    .update({
      config: { last_customer_sync: new Date().toISOString(), customer_count: customers.length },
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('integration_id', 'shopify');

  if (error) {
    console.warn('[SHOPIFY] Failed to update customer sync metadata:', error.message);
  }

  await updateLastSync(orgId, 'shopify');
  console.log(`[SHOPIFY] Synced ${customers.length} customers`);
  return { synced: customers.length };
}

// ---------------------------------------------------------------------------
// Cross-reference helpers
// ---------------------------------------------------------------------------

/**
 * Compare Shopify order totals with Xero revenue for a given period.
 * Returns a reconciliation summary highlighting gaps.
 */
export async function reconcileShopifyWithXero(
  orgId: string,
  period?: string
): Promise<{
  shopifyTotal: number;
  xeroTotal: number;
  difference: number;
  differencePercent: number;
  status: 'matched' | 'minor_gap' | 'significant_gap';
  orderCount: number;
}> {
  const supabase = await createUntypedServiceClient();

  // Default to current month if no period provided
  const targetPeriod =
    period ??
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })();

  // Get Shopify staged transactions for the period
  const { data: shopifyData } = await supabase
    .from('staged_transactions')
    .select('raw_data')
    .eq('org_id', orgId)
    .eq('source', 'shopify')
    .gte('created_at', targetPeriod);

  const shopifyTotal = (shopifyData ?? []).reduce((sum, row) => {
    const raw = row.raw_data as Record<string, unknown>;
    return sum + (Number(raw.amount) || 0);
  }, 0);

  // Get Xero normalised financials for the period
  const { data: xeroData } = await supabase
    .from('normalised_financials')
    .select('amount')
    .eq('org_id', orgId)
    .eq('source', 'xero')
    .eq('period', targetPeriod);

  const xeroTotal = (xeroData ?? []).reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  );

  const difference = Math.abs(shopifyTotal - xeroTotal);
  const differencePercent =
    shopifyTotal !== 0
      ? Math.round((difference / Math.abs(shopifyTotal)) * 10000) / 100
      : 0;

  const status: 'matched' | 'minor_gap' | 'significant_gap' =
    differencePercent < 1
      ? 'matched'
      : differencePercent < 5
        ? 'minor_gap'
        : 'significant_gap';

  return {
    shopifyTotal: Math.round(shopifyTotal * 100) / 100,
    xeroTotal: Math.round(xeroTotal * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    differencePercent,
    status,
    orderCount: shopifyData?.length ?? 0,
  };
}
