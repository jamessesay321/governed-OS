import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { storeTokens } from '@/lib/xero/tokens';
import { logAudit } from '@/lib/audit/log';
import { xeroCallbackQuerySchema } from '@/lib/schemas';
import { pullOrgAccountingConfig } from '@/lib/xero/org-config';
import { createServiceClient } from '@/lib/supabase/server';
import { getRedirectUri } from '@/lib/xero/client';

/**
 * GET /api/xero/callback
 * Handles Xero OAuth callback, exchanges code for tokens,
 * stores connection, and redirects. Sync is NOT triggered here —
 * the user clicks "Sync Now" on the Xero page to avoid callback timeout.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const { searchParams } = new URL(request.url);

    const parsed = xeroCallbackQuerySchema.safeParse({
      code: searchParams.get('code'),
      state: searchParams.get('state'),
    });

    if (!parsed.success) {
      return NextResponse.redirect(
        new URL('/xero?error=missing_params', request.url)
      );
    }

    const { code, state } = parsed.data;

    // Verify state
    let stateData: { orgId: string };
    try {
      stateData = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8')
      );
    } catch {
      return NextResponse.redirect(
        new URL('/xero?error=invalid_state', request.url)
      );
    }

    if (stateData.orgId !== profile.org_id) {
      return NextResponse.redirect(
        new URL('/xero?error=org_mismatch', request.url)
      );
    }

    // Exchange code for tokens — use the same redirect URI derivation
    // that was used for the consent URL (must match exactly or Xero rejects)
    const redirectUri = getRedirectUri(request.url);

    const tokenResponse = await fetch(
      'https://identity.xero.com/connect/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      console.error(
        '[XERO CALLBACK] Token exchange failed:',
        await tokenResponse.text()
      );
      return NextResponse.redirect(
        new URL('/xero?error=token_exchange', request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    // Get tenant connections
    const connectionsResponse = await fetch(
      'https://api.xero.com/connections',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!connectionsResponse.ok) {
      return NextResponse.redirect(
        new URL('/xero?error=connections_failed', request.url)
      );
    }

    const connections = await connectionsResponse.json();
    if (!connections.length) {
      return NextResponse.redirect(
        new URL('/xero?error=no_tenants', request.url)
      );
    }

    // Use the first tenant
    const tenantId = connections[0].tenantId;
    const tenantName = connections[0].tenantName || 'Xero Organisation';

    // Store encrypted tokens
    await storeTokens(profile.org_id, user.id, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      tenantId,
    });

    // Audit log
    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'xero.connected',
      entityType: 'xero_connection',
      metadata: { tenantId, tenantName },
    });

    // Pull org accounting config from Xero Organisation API (year-end, currency, VAT)
    try {
      const orgConfig = await pullOrgAccountingConfig(
        profile.org_id,
        tokenData.access_token,
        tenantId
      );
      console.log(
        `[XERO CALLBACK] Org config saved: FY ends ${orgConfig.financial_year_end_day}/${orgConfig.financial_year_end_month}, currency ${orgConfig.base_currency}`
      );
    } catch (configErr) {
      // Non-blocking: org config is important but shouldn't prevent sync
      console.warn(
        '[XERO CALLBACK] Failed to pull org config (non-blocking):',
        configErr instanceof Error ? configErr.message : String(configErr)
      );
    }

    // Check if user is still in onboarding — redirect accordingly
    let isOnboarding = false;
    try {
      const service = await createServiceClient();
      const { data: org } = await service
        .from('organisations')
        .select('has_completed_onboarding')
        .eq('id', profile.org_id)
        .single();
      if (org && !(org as any).has_completed_onboarding) {
        isOnboarding = true;
      }
    } catch {
      // Column may not exist — default to normal flow
    }

    if (isOnboarding) {
      return NextResponse.redirect(
        new URL(`/welcome/connect?success=true&tenant=${encodeURIComponent(tenantName)}`, request.url)
      );
    }

    // Redirect to Xero page — user clicks "Sync Now" to trigger sync
    // (Sync is NOT run inline here to avoid callback timeout on large accounts)
    const params = new URLSearchParams({
      success: 'true',
      tenant: tenantName,
      sync_pending: 'true',
    });

    return NextResponse.redirect(new URL(`/xero?${params.toString()}`, request.url));
  } catch (err) {
    console.error('[XERO CALLBACK] Error:', err);
    return NextResponse.redirect(
      new URL('/xero?error=unexpected', request.url)
    );
  }
}
