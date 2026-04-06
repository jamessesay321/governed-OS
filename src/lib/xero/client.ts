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
      'offline_access',
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
    ].join(' '),
    state,
  });

  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}
