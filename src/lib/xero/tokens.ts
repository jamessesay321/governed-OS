import { createServiceClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from './crypto';

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tenantId: string;
}

/**
 * Store Xero OAuth tokens (encrypted) for an organisation.
 */
export async function storeTokens(
  orgId: string,
  userId: string,
  tokens: TokenSet
): Promise<void> {
  const supabase = await createServiceClient();

  const encryptedAccess = encrypt(tokens.accessToken);
  const encryptedRefresh = encrypt(tokens.refreshToken);

  // Upsert — one connection per org
  const { error } = await supabase
    .from('xero_connections')
    .upsert(
      {
        org_id: orgId,
        xero_tenant_id: tokens.tenantId,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expires_at: tokens.expiresAt.toISOString(),
        connected_by: userId,
        status: 'active',
      },
      { onConflict: 'org_id' }
    );

  if (error) {
    throw new Error(`Failed to store Xero tokens: ${error.message}`);
  }
}

/**
 * Retrieve and decrypt Xero tokens for an organisation.
 * Returns null if no active connection exists.
 */
export async function getTokens(orgId: string): Promise<TokenSet | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;

  return {
    accessToken: decrypt(data.access_token),
    refreshToken: decrypt(data.refresh_token),
    expiresAt: new Date(data.token_expires_at),
    tenantId: data.xero_tenant_id,
  };
}

/**
 * Refresh Xero tokens if expired.
 * Returns fresh tokens or throws.
 */
export async function getValidTokens(orgId: string): Promise<TokenSet> {
  const tokens = await getTokens(orgId);
  if (!tokens) throw new Error('No Xero connection found');

  // If token expires in less than 5 minutes, refresh
  const fiveMinutes = 5 * 60 * 1000;
  if (tokens.expiresAt.getTime() - Date.now() > fiveMinutes) {
    return tokens;
  }

  // Refresh the token
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Xero token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();

  const newTokens: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    tenantId: tokens.tenantId,
  };

  // Store the refreshed tokens
  const supabase = await createServiceClient();
  await supabase
    .from('xero_connections')
    .update({
      access_token: encrypt(newTokens.accessToken),
      refresh_token: encrypt(newTokens.refreshToken),
      token_expires_at: newTokens.expiresAt.toISOString(),
    })
    .eq('org_id', orgId);

  return newTokens;
}
