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
    if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL('/xero?error=not_configured', request.url)
      );
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
      return NextResponse.redirect(
        new URL('/xero?error=insufficient_role', request.url)
      );
    }
    console.error('[XERO CONNECT] Error:', err);
    return NextResponse.redirect(
      new URL('/xero?error=unexpected', request.url)
    );
  }
}
