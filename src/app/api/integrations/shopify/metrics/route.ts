import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import { getConnectedIntegrations } from '@/lib/integrations/framework';
import { fetchOrders } from '@/lib/integrations/shopify';
import { computeAllMetrics } from '@/lib/integrations/shopify-metrics';

const querySchema = z.object({
  /** Restrict orders to those created on or after this date (ISO 8601). */
  since: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .optional(),
  /** Restrict orders to those created on or before this date (ISO 8601). */
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .optional(),
  /** Maximum number of orders to fetch (default 250, max 250). */
  limit: z.coerce.number().min(1).max(250).optional().default(250),
});

/**
 * GET /api/integrations/shopify/metrics
 *
 * Fetches orders from Shopify, runs the pure computation functions from
 * shopify-metrics.ts, and returns pre-computed business metrics.
 *
 * Query params:
 *   - since  (optional) — ISO date, fetch orders created_at >= this date
 *   - until  (optional) — ISO date, fetch orders created_at <= this date
 *   - limit  (optional) — max orders to fetch (default/max 250)
 *
 * Returns: ShopifyMetricsSummary
 */
export async function GET(request: NextRequest) {
  // ---- Auth ----
  try {
    await requireRole('viewer');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ---- Query param validation ----
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    since: url.searchParams.get('since') ?? undefined,
    until: url.searchParams.get('until') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { since, until, limit } = parsed.data;

  try {
    // ---- Resolve Shopify connection ----
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const connections = await getConnectedIntegrations(orgId);
    const shopifyConn = connections.find((c) => c.integrationId === 'shopify');

    if (!shopifyConn) {
      return NextResponse.json(
        { connected: false, error: 'Shopify not connected' },
        { status: 200 }
      );
    }

    const shopDomain = shopifyConn.credentials.shopDomain as string;
    const accessToken = shopifyConn.credentials.accessToken as string;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { connected: false, error: 'Missing Shopify credentials' },
        { status: 200 }
      );
    }

    // ---- Fetch orders from Shopify API ----
    const { orders } = await fetchOrders({
      shopDomain,
      accessToken,
      status: 'any',
      limit,
      createdAtMin: since,
      createdAtMax: until,
    });

    // ---- Run pure computation layer ----
    const metrics = computeAllMetrics(orders);

    return NextResponse.json({
      connected: true,
      shopDomain,
      ...metrics,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to compute Shopify metrics';
    console.error('[SHOPIFY METRICS]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
