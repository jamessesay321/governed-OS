import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import crypto from 'crypto';

/**
 * GET /api/integrations/shopify/callback
 * Handles Shopify OAuth callback:
 * 1. Validates the state param matches the cookie (CSRF protection)
 * 2. Validates HMAC signature from Shopify
 * 3. Exchanges the authorization code for a permanent access token
 * 4. Stores the token in integration_connections via Supabase
 * 5. Sets process.env.SHOPIFY_ACCESS_TOKEN for immediate use
 * 6. Redirects to /storefront on success
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');
    const shop = searchParams.get('shop');

    // ---- Validate required params ----
    if (!code || !state || !shop) {
      return redirectWithError(request, 'Missing required OAuth parameters (code, state, or shop).');
    }

    // ---- Validate state against cookie (CSRF protection) ----
    const storedState = request.cookies.get('shopify_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      return redirectWithError(request, 'OAuth state mismatch. Please try connecting again.');
    }

    // ---- Validate HMAC signature from Shopify ----
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!clientSecret) {
      return redirectWithError(request, 'SHOPIFY_CLIENT_SECRET is not configured.');
    }

    if (hmac) {
      const isValid = validateShopifyHmac(searchParams, clientSecret);
      if (!isValid) {
        return redirectWithError(request, 'HMAC validation failed. The request may have been tampered with.');
      }
    }

    // ---- Exchange authorization code for permanent access token ----
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    if (!clientId) {
      return redirectWithError(request, 'SHOPIFY_CLIENT_ID is not configured.');
    }

    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[SHOPIFY CALLBACK] Token exchange failed:', errorText);
      return redirectWithError(request, 'Failed to exchange authorization code for access token.');
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      scope: string;
    };

    const accessToken = tokenData.access_token;
    const scope = tokenData.scope;

    if (!accessToken) {
      return redirectWithError(request, 'No access token received from Shopify.');
    }

    // ---- Store connection in Supabase integration_connections table ----
    const supabase = await createUntypedServiceClient();

    const { error: upsertError } = await supabase
      .from('integration_connections')
      .upsert(
        {
          org_id: orgId,
          integration_id: 'shopify',
          status: 'active',
          credentials: {
            accessToken,
            scope,
            shopDomain: shop,
          },
          sync_frequency: 'daily',
          config: { shopDomain: shop },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,integration_id' }
      );

    if (upsertError) {
      console.error('[SHOPIFY CALLBACK] Supabase upsert error:', upsertError);
      return redirectWithError(request, 'Failed to store Shopify connection.');
    }

    // ---- Set access token in process.env for immediate use ----
    process.env.SHOPIFY_ACCESS_TOKEN = accessToken;

    // ---- Audit log ----
    await logAudit({
      orgId,
      userId: user.id,
      action: 'shopify.connected',
      entityType: 'integration_connection',
      metadata: { shopDomain: shop, scope },
    });

    // ---- Clear the state cookie and redirect to /storefront ----
    const successUrl = new URL('/storefront', request.url);
    successUrl.searchParams.set('success', 'true');
    successUrl.searchParams.set('shop', shop);

    const response = NextResponse.redirect(successUrl);
    response.cookies.set('shopify_oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Delete the cookie
    });

    return response;
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return redirectWithError(request, 'You need admin permissions to connect Shopify.');
    }
    console.error('[SHOPIFY CALLBACK] Error:', err);
    return redirectWithError(request, 'Something went wrong during Shopify connection.');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Redirect to /storefront with an error message.
 */
function redirectWithError(request: NextRequest, message: string): NextResponse {
  const url = new URL('/storefront', request.url);
  url.searchParams.set('error', message);
  const response = NextResponse.redirect(url);
  // Clear the state cookie on error too
  response.cookies.set('shopify_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/**
 * Validate the HMAC signature Shopify sends with the callback.
 * Shopify signs all query params (except hmac) with the app's client secret.
 */
function validateShopifyHmac(
  searchParams: URLSearchParams,
  secret: string
): boolean {
  const hmac = searchParams.get('hmac');
  if (!hmac) return false;

  // Build the message from all params except 'hmac', sorted alphabetically
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'hmac') {
      params.set(key, value);
    }
  });

  // Sort params alphabetically by key
  const sortedParams = new URLSearchParams(
    [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
  );

  const message = sortedParams.toString();
  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(computedHmac, 'hex')
    );
  } catch {
    // If buffers have different lengths, they don't match
    return false;
  }
}
