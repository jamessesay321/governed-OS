import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { exchangeShopifyToken, syncShopifyOrders } from '@/lib/integrations/shopify';
import { upsertConnection } from '@/lib/integrations/framework';
import { logAudit } from '@/lib/audit/log';

/**
 * GET /api/integrations/shopify/callback
 * Handles Shopify OAuth callback, exchanges code for tokens,
 * stores the connection, and triggers initial order sync.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shop = searchParams.get('shop');

    if (!code || !state || !shop) {
      return NextResponse.redirect(
        new URL('/integrations?error=missing_params', request.url)
      );
    }

    // Verify state
    let stateData: { orgId: string };
    try {
      stateData = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8')
      );
    } catch {
      return NextResponse.redirect(
        new URL('/integrations?error=invalid_state', request.url)
      );
    }

    if (stateData.orgId !== orgId) {
      return NextResponse.redirect(
        new URL('/integrations?error=org_mismatch', request.url)
      );
    }

    // Exchange code for access token
    const { accessToken, scope } = await exchangeShopifyToken(shop, code);

    // Store connection
    await upsertConnection(orgId, 'shopify', {
      status: 'active',
      credentials: {
        accessToken,
        scope,
        shopDomain: shop,
      },
      syncFrequency: 'daily',
      config: { shopDomain: shop },
    });

    // Audit log
    await logAudit({
      orgId,
      userId: user.id,
      action: 'shopify.connected',
      entityType: 'integration_connection',
      metadata: { shopDomain: shop },
    });

    // Auto-trigger initial order sync
    let synced = 0;
    try {
      const result = await syncShopifyOrders(orgId, accessToken, shop);
      synced = result.synced;
    } catch (syncErr) {
      console.error('[SHOPIFY CALLBACK] Initial sync failed:', syncErr);
    }

    const params = new URLSearchParams({
      success: 'true',
      shop,
      synced: String(synced),
    });

    return NextResponse.redirect(
      new URL(`/integrations?${params.toString()}`, request.url)
    );
  } catch (err) {
    console.error('[SHOPIFY CALLBACK] Error:', err);
    return NextResponse.redirect(
      new URL('/integrations?error=unexpected', request.url)
    );
  }
}
