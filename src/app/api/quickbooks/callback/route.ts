import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { exchangeQboCode } from '@/lib/quickbooks/client';
import { storeQboTokens } from '@/lib/quickbooks/tokens';
import { runQboFullSync } from '@/lib/quickbooks/sync';
import { logAudit } from '@/lib/audit/log';
import { getAuthenticatedUser } from '@/lib/supabase/roles';

/**
 * GET /api/quickbooks/callback
 * Handles QuickBooks OAuth callback.
 * Exchanges code for tokens, stores them, and triggers a full sync.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');
  const error = url.searchParams.get('error');

  // Handle user denial
  if (error) {
    return NextResponse.redirect(
      new URL('/integrations?error=qbo_denied&message=QuickBooks connection was cancelled.', request.url)
    );
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL('/integrations?error=missing_params&message=Missing parameters from QuickBooks.', request.url)
    );
  }

  try {
    // Validate state
    const stateData = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf8')
    );
    const orgId = stateData.orgId;

    if (!orgId) {
      return NextResponse.redirect(
        new URL('/integrations?error=invalid_state&message=Invalid security token. Please try again.', request.url)
      );
    }

    // Verify the user belongs to this org
    const { user } = await getAuthenticatedUser();
    const userId = user.id;

    // Exchange code for tokens
    const tokenData = await exchangeQboCode(code);

    // Get company name from QBO Company Info endpoint
    let companyName: string | null = null;
    try {
      const base = process.env.QBO_SANDBOX === 'true'
        ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
        : 'https://quickbooks.api.intuit.com/v3/company';
      const companyRes = await fetch(`${base}/${realmId}/companyinfo/${realmId}`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      });
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        companyName = companyData.CompanyInfo?.CompanyName || null;
      }
    } catch {
      // Non-critical: we can proceed without the company name
    }

    // Store encrypted tokens
    await storeQboTokens(orgId, userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      realmId,
      companyName,
    });

    // Audit log
    await logAudit({
      orgId,
      userId,
      action: 'quickbooks.connected',
      entityType: 'quickbooks_connections',
      entityId: realmId,
      metadata: { companyName },
    });

    // Auto-trigger full sync (same 1-click experience as Xero)
    let syncResult = { recordsSynced: 0 };
    let syncWarning: string | null = null;
    try {
      syncResult = await runQboFullSync(orgId, userId);
    } catch (syncErr) {
      syncWarning = syncErr instanceof Error ? syncErr.message : 'Sync failed';
      console.error('[QBO CALLBACK] Auto-sync failed:', syncErr);
    }

    // Check if in onboarding flow
    const supabase = await createServiceClient();
    let isOnboarding = false;
    try {
      const { data: org } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', orgId)
        .single();
      const orgRecord = org as unknown as Record<string, unknown> | null;
      isOnboarding = !orgRecord?.has_completed_onboarding;
    } catch {
      // Column may not exist
    }

    if (isOnboarding) {
      return NextResponse.redirect(
        new URL(`/welcome/connect?success=true&tenant=${encodeURIComponent(companyName || 'QuickBooks')}&records=${syncResult.recordsSynced}`, request.url)
      );
    }

    // Redirect to integrations with success
    const successUrl = new URL('/integrations', request.url);
    successUrl.searchParams.set('success', 'qbo');
    successUrl.searchParams.set('message', `Connected to ${companyName || 'QuickBooks'}. ${syncResult.recordsSynced} records synced.`);
    if (syncWarning) successUrl.searchParams.set('warning', syncWarning);
    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error('[QBO CALLBACK] Error:', err);
    return NextResponse.redirect(
      new URL('/integrations?error=qbo_failed&message=Failed to connect QuickBooks. Please try again.', request.url)
    );
  }
}
