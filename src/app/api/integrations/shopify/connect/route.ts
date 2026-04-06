import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

/**
 * POST /api/integrations/shopify/connect
 * Connects Shopify using a Custom App Admin API access token.
 * Much simpler than OAuth — user pastes their token and shop domain.
 */

const ConnectSchema = z.object({
  shopDomain: z.string().min(1).regex(/\.myshopify\.com$/, 'Must be a .myshopify.com domain'),
  accessToken: z.string().min(10, 'Access token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = ConnectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { shopDomain, accessToken } = parsed.data;

    // Verify the token works by calling Shopify
    const verifyRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: 'Invalid token or shop domain. Please check your credentials.' },
        { status: 401 }
      );
    }

    const shopData = await verifyRes.json();

    // Store in Supabase
    const supabase = await createUntypedServiceClient();

    // Upsert — update if exists, create if not
    const { error: dbError } = await supabase
      .from('integration_connections')
      .upsert(
        {
          org_id: orgId,
          integration_id: 'shopify',
          status: 'active',
          credentials: {
            shopDomain,
            accessToken,
            shopName: shopData.shop?.name ?? shopDomain,
            method: 'custom_app_token',
          },
          sync_frequency: 'daily',
          config: {},
          last_sync_at: null,
        },
        { onConflict: 'org_id,integration_id' }
      );

    if (dbError) {
      console.error('[SHOPIFY_CONNECT] DB error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save connection' },
        { status: 500 }
      );
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'integration.connected',
      entityType: 'integration',
      entityId: 'shopify',
      metadata: {
        shopDomain,
        shopName: shopData.shop?.name,
        method: 'custom_app_token',
      },
    });

    return NextResponse.json({
      success: true,
      shopName: shopData.shop?.name ?? shopDomain,
    });
  } catch (err) {
    console.error('[SHOPIFY_CONNECT] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
