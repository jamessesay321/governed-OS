import { XeroClient } from 'xero-node';
import { headers } from 'next/headers';

const XERO_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  // Granular scopes (required for apps created after March 2, 2026)
  'accounting.invoices.read',
  'accounting.payments.read',
  'accounting.banktransactions.read',
  'accounting.manualjournals.read',
  'accounting.reports.balancesheet.read',
  'accounting.reports.profitandloss.read',
  'accounting.reports.trialbalance.read',
  'accounting.reports.aged.read',
  'accounting.reports.banksummary.read',
  'accounting.reports.executivesummary.read',
  'accounting.reports.budgetsummary.read',
  'accounting.settings.read',
  'accounting.contacts.read',
  // 'accounting.journals.read', // Not available for new apps
];

/**
 * Resolve the Xero OAuth redirect URI.
 *
 * Priority:
 *  1. XERO_REDIRECT_URI env var (if set — for explicit override)
 *  2. NEXT_PUBLIC_APP_URL + /api/xero/callback (production)
 *  3. Auto-detect from request headers (works for both dev & prod)
 *
 * This eliminates the http/https mismatch that breaks OAuth in dev.
 */
export function getRedirectUri(requestUrl?: string): string {
  // 1. Explicit env var override (if someone set it, respect it)
  if (process.env.XERO_REDIRECT_URI) {
    return process.env.XERO_REDIRECT_URI;
  }

  // 2. NEXT_PUBLIC_APP_URL (Vercel sets this, or user can set for production)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/xero/callback`;
  }

  // 3. Auto-detect from incoming request URL
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      return `${url.protocol}//${url.host}/api/xero/callback`;
    } catch {
      // Fall through
    }
  }

  // 4. Try reading from Next.js headers (works in server components/route handlers)
  try {
    const headerStore = headers();
    const host = (headerStore as any).get?.('host') || 'localhost:3000';
    const proto = (headerStore as any).get?.('x-forwarded-proto') || 'http';
    return `${proto}://${host}/api/xero/callback`;
  } catch {
    // headers() not available outside request context
  }

  // 5. Absolute fallback
  return 'http://localhost:3000/api/xero/callback';
}

let xeroClient: XeroClient | null = null;

export function getXeroClient(requestUrl?: string): XeroClient {
  // Always create fresh to use correct redirect URI for this request
  const redirectUri = getRedirectUri(requestUrl);

  xeroClient = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [redirectUri],
    scopes: XERO_SCOPES,
  });

  return xeroClient;
}

export function buildConsentUrl(state: string, requestUrl?: string): string {
  const redirectUri = getRedirectUri(requestUrl);
  console.log('[XERO] buildConsentUrl → redirect_uri:', redirectUri);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: XERO_SCOPES.join(' '),
    state,
  });

  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}
