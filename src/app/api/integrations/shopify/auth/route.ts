import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import crypto from 'crypto';

/**
 * GET /api/integrations/shopify/auth
 * Initiates Shopify OAuth flow. Requires admin+ role.
 * Generates a state nonce, stores it in an httpOnly cookie,
 * then redirects the user to Shopify's authorization page.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');

    // Validate Shopify credentials are configured
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const storeUrl = process.env.SHOPIFY_STORE_URL;

    if (!clientId || !clientSecret) {
      const url = new URL('/storefront', request.url);
      url.searchParams.set('error', 'Shopify API credentials are not configured. Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.');
      return NextResponse.redirect(url);
    }

    if (!storeUrl) {
      const url = new URL('/storefront', request.url);
      url.searchParams.set('error', 'SHOPIFY_STORE_URL is not configured.');
      return NextResponse.redirect(url);
    }

    // Generate random state nonce for CSRF protection
    const state = crypto.randomUUID();

    // Build the Shopify OAuth authorization URL
    // All read scopes matching the Shopify Partner app configuration
    const scopes = [
      'read_orders',
      'read_products',
      'read_customers',
      'read_inventory',
      'read_fulfillments',
      'read_shipping',
      'read_analytics',
      'read_content',
      'read_themes',
      'read_locales',
      'read_shopify_payments_payouts',
      'read_shopify_payments_disputes',
      'read_reports',
      'read_price_rules',
      'read_discounts',
      'read_marketing_events',
      'read_product_listings',
      'read_draft_orders',
      'read_checkouts',
      'read_gift_cards',
      'read_locations',
    ].join(',');
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI || 'http://localhost:3000/api/integrations/shopify/callback';

    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    });

    const shopifyAuthUrl = `https://${storeUrl}/admin/oauth/authorize?${params.toString()}`;

    // Create the redirect response and set the state cookie
    const response = NextResponse.redirect(shopifyAuthUrl);
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes — enough for the OAuth flow
    });

    return response;
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      const url = new URL('/storefront', request.url);
      url.searchParams.set('error', 'You need admin permissions to connect Shopify.');
      return NextResponse.redirect(url);
    }
    console.error('[SHOPIFY AUTH] Error:', err);
    const url = new URL('/storefront', request.url);
    url.searchParams.set('error', 'Something went wrong. Please try again.');
    return NextResponse.redirect(url);
  }
}
