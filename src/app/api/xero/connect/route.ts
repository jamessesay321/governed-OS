import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { buildConsentUrl } from '@/lib/xero/client';
import { randomBytes } from 'crypto';

/**
 * GET /api/xero/connect
 * Initiates Xero OAuth flow. Requires admin+ role.
 * Validates credentials are configured before redirecting.
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRole('admin');

    // Validate Xero credentials are configured
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    console.log('[XERO CONNECT] Credentials check:', {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length ?? 0,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret?.length ?? 0,
    });

    if (!clientId || !clientSecret) {
      const url = new URL('/integrations', request.url);
      url.searchParams.set('error', 'xero_not_configured');
      url.searchParams.set(
        'message',
        'Xero API credentials are not set up yet. Add XERO_CLIENT_ID and XERO_CLIENT_SECRET to your environment variables.'
      );
      return NextResponse.redirect(url);
    }

    // Generate state parameter to prevent CSRF
    const state = Buffer.from(
      JSON.stringify({
        orgId: profile.org_id,
        nonce: randomBytes(16).toString('hex'),
      })
    ).toString('base64url');

    const consentUrl = buildConsentUrl(state);

    return NextResponse.redirect(consentUrl);
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      const url = new URL('/integrations', request.url);
      url.searchParams.set('error', 'insufficient_role');
      url.searchParams.set(
        'message',
        'You need admin permissions to connect Xero. Ask an admin to set up the connection.'
      );
      return NextResponse.redirect(url);
    }
    console.error('[XERO CONNECT] Error:', err);
    const url = new URL('/integrations', request.url);
    url.searchParams.set('error', 'unexpected');
    url.searchParams.set('message', 'Something went wrong. Please try again.');
    return NextResponse.redirect(url);
  }
}
