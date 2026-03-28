import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { buildQboConsentUrl } from '@/lib/quickbooks/client';
import { randomBytes } from 'crypto';

/**
 * GET /api/quickbooks/connect
 * Initiates QuickBooks Online OAuth flow. Requires admin+ role.
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRole('admin');

    if (!process.env.QBO_CLIENT_ID || !process.env.QBO_CLIENT_SECRET) {
      const url = new URL('/integrations', request.url);
      url.searchParams.set('error', 'qbo_not_configured');
      url.searchParams.set(
        'message',
        'QuickBooks API credentials are not set up yet. Add QBO_CLIENT_ID and QBO_CLIENT_SECRET to your environment variables.'
      );
      return NextResponse.redirect(url);
    }

    const state = Buffer.from(
      JSON.stringify({
        orgId: profile.org_id,
        nonce: randomBytes(16).toString('hex'),
      })
    ).toString('base64url');

    const consentUrl = buildQboConsentUrl(state);
    return NextResponse.redirect(consentUrl);
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      const url = new URL('/integrations', request.url);
      url.searchParams.set('error', 'insufficient_role');
      url.searchParams.set('message', 'You need admin permissions to connect QuickBooks.');
      return NextResponse.redirect(url);
    }
    console.error('[QBO CONNECT] Error:', err);
    const url = new URL('/integrations', request.url);
    url.searchParams.set('error', 'unexpected');
    url.searchParams.set('message', 'Something went wrong. Please try again.');
    return NextResponse.redirect(url);
  }
}
