import { createServiceClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/xero/crypto';
import { refreshQboToken } from './client';

interface QboTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  realmId: string;
  companyName: string | null;
}

/**
 * Store QuickBooks OAuth tokens (encrypted) for an organisation.
 * Reuses the same AES-256-GCM encryption as Xero tokens.
 */
export async function storeQboTokens(
  orgId: string,
  userId: string,
  tokens: QboTokenSet
): Promise<void> {
  const supabase = await createServiceClient();

  const encryptedAccess = encrypt(tokens.accessToken);
  const encryptedRefresh = encrypt(tokens.refreshToken);

  // Upsert: one QBO connection per org
  const { error } = await supabase
    .from('quickbooks_connections' as any)
    .upsert(
      {
        org_id: orgId,
        realm_id: tokens.realmId,
        company_name: tokens.companyName,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expires_at: tokens.expiresAt.toISOString(),
        connected_by: userId,
        status: 'active',
      },
      { onConflict: 'org_id' }
    );

  if (error) {
    throw new Error(`Failed to store QBO tokens: ${error.message}`);
  }
}

/**
 * Retrieve and decrypt QuickBooks tokens for an organisation.
 */
export async function getQboTokens(orgId: string): Promise<QboTokenSet | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('quickbooks_connections' as any)
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    accessToken: decrypt(row.access_token as string),
    refreshToken: decrypt(row.refresh_token as string),
    expiresAt: new Date(row.token_expires_at as string),
    realmId: row.realm_id as string,
    companyName: (row.company_name as string) || null,
  };
}

/**
 * Get valid (non-expired) QBO tokens. Auto-refreshes if needed.
 * QBO access tokens expire after 1 hour.
 */
export async function getValidQboTokens(orgId: string): Promise<QboTokenSet> {
  const tokens = await getQboTokens(orgId);
  if (!tokens) throw new Error('No QuickBooks connection found');

  // If token expires in less than 5 minutes, refresh
  const fiveMinutes = 5 * 60 * 1000;
  if (tokens.expiresAt.getTime() - Date.now() > fiveMinutes) {
    return tokens;
  }

  // Refresh the token
  const data = await refreshQboToken(tokens.refreshToken);

  const newTokens: QboTokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    realmId: tokens.realmId,
    companyName: tokens.companyName,
  };

  // Store the refreshed tokens
  const supabase = await createServiceClient();
  await supabase
    .from('quickbooks_connections' as any)
    .update({
      access_token: encrypt(newTokens.accessToken),
      refresh_token: encrypt(newTokens.refreshToken),
      token_expires_at: newTokens.expiresAt.toISOString(),
    })
    .eq('org_id', orgId);

  return newTokens;
}
