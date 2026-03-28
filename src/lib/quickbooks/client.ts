/**
 * QuickBooks Online OAuth 2.0 client.
 *
 * Auth endpoint: https://appcenter.intuit.com/connect/oauth2
 * Token endpoint: https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
 * API base: https://quickbooks.api.intuit.com/v3/company/{realmId}
 *
 * Scopes: com.intuit.quickbooks.accounting (read-only)
 * Access tokens expire after 1 hour. Refresh tokens last 100 days.
 */

const QBO_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

// Sandbox vs production
const QBO_API_BASE = process.env.QBO_SANDBOX === 'true'
  ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
  : 'https://quickbooks.api.intuit.com/v3/company';

export function getQboApiBase(): string {
  return QBO_API_BASE;
}

export function getQboTokenUrl(): string {
  return QBO_TOKEN_URL;
}

/**
 * Build the QuickBooks OAuth consent URL.
 * User is redirected here to authorise Grove.
 */
export function buildQboConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    redirect_uri: process.env.QBO_REDIRECT_URI!,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  });

  return `${QBO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorisation code for tokens.
 */
export async function exchangeQboCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}> {
  const response = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(
        `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.QBO_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`QBO token exchange failed: ${response.status} ${body.slice(0, 200)}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token.
 */
export async function refreshQboToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}> {
  const response = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(
        `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`QBO token refresh failed: ${response.status} ${body.slice(0, 200)}`);
  }

  return response.json();
}
