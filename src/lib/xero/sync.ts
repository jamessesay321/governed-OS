import { createServiceClient } from '@/lib/supabase/server';
import { getValidTokens } from './tokens';
import { logAudit } from '@/lib/audit/log';

interface XeroAccount {
  AccountID: string;
  Code: string;
  Name: string;
  Type: string;
  Class: string;
  Status: string;
}

interface XeroLineItem {
  LineItemID?: string;
  AccountCode?: string;
  AccountID?: string;
  Description?: string;
  LineAmount?: number;
  Quantity?: number;
  UnitAmount?: number;
  TaxAmount?: number;
  [key: string]: unknown;
}

interface XeroInvoice {
  InvoiceID: string;
  Type: string;
  Status: string;
  Contact: { Name: string };
  Date: string;
  DateString?: string;
  LineItems: XeroLineItem[];
  Total: number;
  CurrencyCode: string;
  [key: string]: unknown;
}

interface XeroBankTransaction {
  BankTransactionID: string;
  Type: string;
  Status: string;
  Contact?: { Name: string };
  Date: string;
  DateString?: string;
  LineItems: XeroLineItem[];
  Total: number;
  CurrencyCode: string;
  [key: string]: unknown;
}

/**
 * Parse Xero date strings. Xero returns dates in two formats:
 * - Microsoft JSON: "/Date(1326530063760+0000)/"
 * - ISO string: "2024-01-15T00:00:00"
 * Returns YYYY-MM-DD string.
 */
function parseXeroDate(dateStr: string): string {
  // Handle Microsoft JSON date format: /Date(1326530063760+0000)/
  const msMatch = dateStr.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
  if (msMatch) {
    const timestamp = parseInt(msMatch[1], 10);
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // Handle ISO format: "2024-01-15T00:00:00"
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  // Fallback: assume YYYY-MM-DD
  return dateStr;
}

/**
 * Extract a YYYY-MM-DD date from a Xero record.
 * Prefers DateString (ISO format) over Date (Microsoft JSON format).
 */
function extractDate(record: { Date: string; DateString?: string }): string {
  if (record.DateString) {
    return record.DateString.split('T')[0];
  }
  return parseXeroDate(record.Date);
}

async function xeroGet(
  endpoint: string,
  accessToken: string,
  tenantId: string
) {
  const response = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Xero API error: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`);
  }

  return response.json();
}

/**
 * Sync chart of accounts from Xero.
 * The Accounts endpoint is NOT paginated — returns all in one call.
 */
async function syncChartOfAccounts(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<number> {
  const data = await xeroGet('Accounts', accessToken, tenantId);
  const accounts: XeroAccount[] = data.Accounts || [];

  console.log(`[XERO SYNC] Received ${accounts.length} accounts from Xero`);

  const supabase = await createServiceClient();
  let synced = 0;

  for (const account of accounts) {
    const { error } = await supabase.from('chart_of_accounts').upsert(
      {
        org_id: orgId,
        xero_account_id: account.AccountID,
        code: account.Code || '',
        name: account.Name,
        type: account.Type,
        class: account.Class || '',
        status: account.Status,
      },
      { onConflict: 'org_id,xero_account_id' }
    );

    if (error) {
      console.warn(`[XERO SYNC] Failed to upsert account ${account.Code}: ${error.message}`);
    } else {
      synced++;
    }
  }

  return synced;
}

/**
 * Sync invoices (both sales and bills) from Xero.
 * Paginates through all pages (100 per page).
 * Filters to AUTHORISED + PAID only (DRAFT/VOIDED/DELETED excluded).
 */
async function syncInvoices(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<number> {
  const supabase = await createServiceClient();
  let synced = 0;
  let page = 1;

  while (true) {
    const data = await xeroGet(
      `Invoices?Statuses=AUTHORISED,PAID&page=${page}`,
      accessToken,
      tenantId
    );
    const invoices: XeroInvoice[] = data.Invoices || [];

    console.log(`[XERO SYNC] Invoices page ${page}: ${invoices.length} records`);

    if (invoices.length === 0) break;

    for (const invoice of invoices) {
      const type = invoice.Type === 'ACCREC' ? 'invoice' : 'bill';

      const { error } = await supabase.from('raw_transactions').upsert(
        {
          org_id: orgId,
          xero_id: invoice.InvoiceID,
          date: extractDate(invoice),
          type: type as 'invoice' | 'bill',
          contact_name: invoice.Contact?.Name || null,
          line_items: invoice.LineItems || [],
          total: invoice.Total,
          currency: invoice.CurrencyCode || 'AUD',
          raw_payload: invoice as unknown as Record<string, unknown>,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,xero_id' }
      );

      if (error) {
        console.warn(`[XERO SYNC] Failed to upsert invoice ${invoice.InvoiceID}: ${error.message}`);
      } else {
        synced++;
      }
    }

    // Xero returns up to 100 per page — if fewer, we've reached the end
    if (invoices.length < 100) break;
    page++;
  }

  return synced;
}

/**
 * Sync bank transactions from Xero.
 * Paginates through all pages (100 per page).
 * Filters to AUTHORISED only (DELETED excluded).
 */
async function syncBankTransactions(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<number> {
  const supabase = await createServiceClient();
  let synced = 0;
  let page = 1;

  while (true) {
    const data = await xeroGet(
      `BankTransactions?where=Status=="AUTHORISED"&page=${page}`,
      accessToken,
      tenantId
    );
    const transactions: XeroBankTransaction[] = data.BankTransactions || [];

    console.log(`[XERO SYNC] Bank transactions page ${page}: ${transactions.length} records`);

    if (transactions.length === 0) break;

    for (const tx of transactions) {
      const { error } = await supabase.from('raw_transactions').upsert(
        {
          org_id: orgId,
          xero_id: tx.BankTransactionID,
          date: extractDate(tx),
          type: 'bank_transaction',
          contact_name: tx.Contact?.Name || null,
          line_items: tx.LineItems || [],
          total: tx.Total,
          currency: tx.CurrencyCode || 'AUD',
          raw_payload: tx as unknown as Record<string, unknown>,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,xero_id' }
      );

      if (error) {
        console.warn(`[XERO SYNC] Failed to upsert bank tx ${tx.BankTransactionID}: ${error.message}`);
      } else {
        synced++;
      }
    }

    if (transactions.length < 100) break;
    page++;
  }

  return synced;
}

/**
 * Full sync pipeline: accounts → invoices → bank transactions → normalise.
 */
export async function runFullSync(
  orgId: string,
  userId: string
): Promise<{ success: boolean; recordsSynced: number; error?: string }> {
  const supabase = await createServiceClient();

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('sync_log')
    .insert({
      org_id: orgId,
      sync_type: 'full',
      status: 'running',
      records_synced: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (logError || !syncLog) {
    return { success: false, recordsSynced: 0, error: 'Failed to create sync log' };
  }

  try {
    const tokens = await getValidTokens(orgId);
    let totalSynced = 0;

    // Sync in order: accounts first (needed for normalisation), then transactions
    console.log('[XERO SYNC] === Starting full sync ===');
    console.log('[XERO SYNC] Syncing chart of accounts...');
    const accountsSynced = await syncChartOfAccounts(
      orgId,
      tokens.accessToken,
      tokens.tenantId
    );
    totalSynced += accountsSynced;
    console.log(`[XERO SYNC] Chart of accounts: ${accountsSynced} synced`);

    console.log('[XERO SYNC] Syncing invoices (AUTHORISED + PAID only)...');
    const invoicesSynced = await syncInvoices(
      orgId,
      tokens.accessToken,
      tokens.tenantId
    );
    totalSynced += invoicesSynced;
    console.log(`[XERO SYNC] Invoices: ${invoicesSynced} synced`);

    console.log('[XERO SYNC] Syncing bank transactions (AUTHORISED only)...');
    const bankTxSynced = await syncBankTransactions(
      orgId,
      tokens.accessToken,
      tokens.tenantId
    );
    totalSynced += bankTxSynced;
    console.log(`[XERO SYNC] Bank transactions: ${bankTxSynced} synced`);

    // Run normalisation
    console.log('[XERO SYNC] Running normalisation...');
    const { normaliseTransactions } = await import('@/lib/financial/normalise');
    const normalised = await normaliseTransactions(orgId);
    console.log(`[XERO SYNC] Normalised: ${normalised} period-account records`);

    // Update sync log
    await supabase
      .from('sync_log')
      .update({
        status: 'completed',
        records_synced: totalSynced,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLog.id);

    // Audit log
    await logAudit({
      orgId,
      userId,
      action: 'xero.sync_completed',
      entityType: 'sync_log',
      entityId: syncLog.id,
      metadata: { accountsSynced, invoicesSynced, bankTxSynced, normalised, totalSynced },
    });

    console.log(`[XERO SYNC] === Complete — ${totalSynced} total records, ${normalised} normalised ===`);
    return { success: true, recordsSynced: totalSynced };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown sync error';

    console.error(`[XERO SYNC] === FAILED: ${errorMessage} ===`);

    // Update sync log with failure
    await supabase
      .from('sync_log')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLog.id);

    await logAudit({
      orgId,
      userId,
      action: 'xero.sync_failed',
      entityType: 'sync_log',
      entityId: syncLog.id,
      metadata: { error: errorMessage },
    });

    return { success: false, recordsSynced: 0, error: errorMessage };
  }
}
