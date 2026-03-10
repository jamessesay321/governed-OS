import { XeroClient } from 'xero-node';

let xeroClient: XeroClient | null = null;

export function getXeroClient(): XeroClient {
  if (!xeroClient) {
    xeroClient = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
      redirectUris: [process.env.XERO_REDIRECT_URI!],
      scopes: [
        'openid',
        'profile',
        'email',
        'accounting.transactions.read',
        'accounting.reports.read',
        'accounting.settings.read',
        'accounting.contacts.read',
        'offline_access',
      ],
    });
  }
  return xeroClient;
}

export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: process.env.XERO_REDIRECT_URI!,
    scope: [
      'openid',
      'profile',
      'email',
      'accounting.transactions.read',
      'accounting.reports.read',
      'accounting.settings.read',
      'accounting.contacts.read',
      'offline_access',
    ].join(' '),
    state,
  });

  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}
