import { createServiceClient } from '@/lib/supabase/server';
import { getValidQboTokens } from './tokens';
import { getQboApiBase } from './client';
import { logAudit } from '@/lib/audit/log';

/**
 * QuickBooks Online uses a SQL-like query language for data retrieval.
 * Pagination: startPosition (1-based) + maxResults (max 1000).
 * All monetary values are in the company's home currency.
 */

interface QboAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  Classification?: string;
  Active: boolean;
  CurrentBalance?: number;
  AcctNum?: string;
}

interface QboInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  CustomerRef?: { name: string; value: string };
  TotalAmt: number;
  Balance: number;
  CurrencyRef?: { value: string };
  Line: QboLineItem[];
  [key: string]: unknown;
}

interface QboBill {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  VendorRef?: { name: string; value: string };
  TotalAmt: number;
  Balance: number;
  CurrencyRef?: { value: string };
  Line: QboLineItem[];
  [key: string]: unknown;
}

interface QboPurchase {
  Id: string;
  TxnDate: string;
  PaymentType?: string;
  EntityRef?: { name: string; value: string };
  TotalAmt: number;
  CurrencyRef?: { value: string };
  Line: QboLineItem[];
  [key: string]: unknown;
}

interface QboLineItem {
  Id?: string;
  Description?: string;
  Amount?: number;
  DetailType?: string;
  AccountBasedExpenseLineDetail?: {
    AccountRef?: { name: string; value: string };
  };
  SalesItemLineDetail?: {
    ItemRef?: { name: string; value: string };
  };
  [key: string]: unknown;
}

/**
 * Make a QBO API request using the SQL-like query endpoint.
 */
async function qboQuery<T>(
  realmId: string,
  accessToken: string,
  query: string
): Promise<T[]> {
  const base = getQboApiBase();
  const url = `${base}/${realmId}/query?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`QBO API error: ${response.status} ${response.statusText}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const queryResponse = data.QueryResponse || {};

  // QBO returns the entity name as the key (e.g., Account, Invoice, Bill, Purchase)
  const entities = Object.values(queryResponse).find(
    (v) => Array.isArray(v)
  ) as T[] | undefined;

  return entities || [];
}

/**
 * Paginated QBO query. Fetches all pages automatically.
 */
async function qboQueryAll<T>(
  realmId: string,
  accessToken: string,
  entity: string,
  where?: string,
  pageSize = 500
): Promise<T[]> {
  const allResults: T[] = [];
  let startPosition = 1;

  while (true) {
    const whereClause = where ? ` WHERE ${where}` : '';
    const query = `SELECT * FROM ${entity}${whereClause} STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`;

    const page = await qboQuery<T>(realmId, accessToken, query);
    console.log(`[QBO SYNC] ${entity} page (start=${startPosition}): ${page.length} records`);

    if (page.length === 0) break;

    allResults.push(...page);

    if (page.length < pageSize) break;
    startPosition += pageSize;
  }

  return allResults;
}

/**
 * Map QBO AccountType + Classification to a simplified class.
 */
function mapQboClass(accountType: string, classification?: string): string {
  if (classification) return classification;
  // QBO types: Bank, AccountsReceivable, OtherCurrentAsset, FixedAsset,
  // AccountsPayable, CreditCard, OtherCurrentLiability, LongTermLiability,
  // Equity, Income, CostOfGoodsSold, Expense, OtherIncome, OtherExpense
  const map: Record<string, string> = {
    Bank: 'ASSET',
    AccountsReceivable: 'ASSET',
    OtherCurrentAsset: 'ASSET',
    FixedAsset: 'ASSET',
    AccountsPayable: 'LIABILITY',
    CreditCard: 'LIABILITY',
    OtherCurrentLiability: 'LIABILITY',
    LongTermLiability: 'LIABILITY',
    Equity: 'EQUITY',
    Income: 'REVENUE',
    CostOfGoodsSold: 'EXPENSE',
    Expense: 'EXPENSE',
    OtherIncome: 'REVENUE',
    OtherExpense: 'EXPENSE',
  };
  return map[accountType] || 'UNKNOWN';
}

/**
 * Sync chart of accounts from QuickBooks Online.
 */
async function syncQboAccounts(
  orgId: string,
  realmId: string,
  accessToken: string
): Promise<number> {
  const accounts = await qboQueryAll<QboAccount>(realmId, accessToken, 'Account');
  console.log(`[QBO SYNC] Received ${accounts.length} accounts`);

  if (accounts.length === 0) return 0;

  const supabase = await createServiceClient();

  const rows = accounts.map((account) => ({
    org_id: orgId,
    xero_account_id: `qbo_${account.Id}`, // Prefix to avoid collisions with Xero IDs
    code: account.AcctNum || account.Id,
    name: account.Name,
    type: account.AccountType,
    class: mapQboClass(account.AccountType, account.Classification),
    status: account.Active ? 'ACTIVE' : 'ARCHIVED',
    source: 'quickbooks',
  }));

  const { error, count } = await supabase
    .from('chart_of_accounts')
    .upsert(rows, { onConflict: 'org_id,xero_account_id', count: 'exact' });

  if (error) {
    console.warn(`[QBO SYNC] Batch upsert accounts failed: ${error.message}`);
    return 0;
  }

  return count ?? rows.length;
}

/**
 * Sync invoices (sales) from QuickBooks Online.
 */
async function syncQboInvoices(
  orgId: string,
  realmId: string,
  accessToken: string
): Promise<number> {
  const invoices = await qboQueryAll<QboInvoice>(realmId, accessToken, 'Invoice');
  console.log(`[QBO SYNC] Received ${invoices.length} invoices`);

  if (invoices.length === 0) return 0;

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const rows = invoices.map((inv) => ({
    org_id: orgId,
    xero_id: `qbo_inv_${inv.Id}`,
    date: inv.TxnDate,
    type: 'invoice' as const,
    contact_name: inv.CustomerRef?.name || null,
    line_items: inv.Line || [],
    total: inv.TotalAmt,
    currency: inv.CurrencyRef?.value || 'GBP',
    raw_payload: inv as unknown as Record<string, unknown>,
    synced_at: now,
    source: 'quickbooks',
  }));

  const { error, count } = await supabase
    .from('raw_transactions')
    .upsert(rows, { onConflict: 'org_id,xero_id', count: 'exact' });

  if (error) {
    console.warn(`[QBO SYNC] Batch upsert invoices failed: ${error.message}`);
    return 0;
  }

  return count ?? rows.length;
}

/**
 * Sync bills (purchases from vendors) from QuickBooks Online.
 */
async function syncQboBills(
  orgId: string,
  realmId: string,
  accessToken: string
): Promise<number> {
  const bills = await qboQueryAll<QboBill>(realmId, accessToken, 'Bill');
  console.log(`[QBO SYNC] Received ${bills.length} bills`);

  if (bills.length === 0) return 0;

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const rows = bills.map((bill) => ({
    org_id: orgId,
    xero_id: `qbo_bill_${bill.Id}`,
    date: bill.TxnDate,
    type: 'bill' as const,
    contact_name: bill.VendorRef?.name || null,
    line_items: bill.Line || [],
    total: bill.TotalAmt,
    currency: bill.CurrencyRef?.value || 'GBP',
    raw_payload: bill as unknown as Record<string, unknown>,
    synced_at: now,
    source: 'quickbooks',
  }));

  const { error, count } = await supabase
    .from('raw_transactions')
    .upsert(rows, { onConflict: 'org_id,xero_id', count: 'exact' });

  if (error) {
    console.warn(`[QBO SYNC] Batch upsert bills failed: ${error.message}`);
    return 0;
  }

  return count ?? rows.length;
}

/**
 * Sync purchases (bank transactions, credit card charges) from QBO.
 */
async function syncQboPurchases(
  orgId: string,
  realmId: string,
  accessToken: string
): Promise<number> {
  const purchases = await qboQueryAll<QboPurchase>(realmId, accessToken, 'Purchase');
  console.log(`[QBO SYNC] Received ${purchases.length} purchases`);

  if (purchases.length === 0) return 0;

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const rows = purchases.map((p) => ({
    org_id: orgId,
    xero_id: `qbo_purch_${p.Id}`,
    date: p.TxnDate,
    type: 'bank_transaction' as const,
    contact_name: p.EntityRef?.name || null,
    line_items: p.Line || [],
    total: p.TotalAmt,
    currency: p.CurrencyRef?.value || 'GBP',
    raw_payload: p as unknown as Record<string, unknown>,
    synced_at: now,
    source: 'quickbooks',
  }));

  const { error, count } = await supabase
    .from('raw_transactions')
    .upsert(rows, { onConflict: 'org_id,xero_id', count: 'exact' });

  if (error) {
    console.warn(`[QBO SYNC] Batch upsert purchases failed: ${error.message}`);
    return 0;
  }

  return count ?? rows.length;
}

/**
 * Full QBO sync pipeline: accounts, invoices, bills, purchases, then normalise.
 */
export async function runQboFullSync(
  orgId: string,
  userId: string
): Promise<{ success: boolean; recordsSynced: number; error?: string }> {
  const supabase = await createServiceClient();

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('sync_log')
    .insert({
      org_id: orgId,
      sync_type: 'full_qbo',
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
    const tokens = await getValidQboTokens(orgId);
    let totalSynced = 0;

    console.log('[QBO SYNC] === Starting full sync ===');

    console.log('[QBO SYNC] Syncing chart of accounts...');
    const accountsSynced = await syncQboAccounts(orgId, tokens.realmId, tokens.accessToken);
    totalSynced += accountsSynced;

    console.log('[QBO SYNC] Syncing invoices...');
    const invoicesSynced = await syncQboInvoices(orgId, tokens.realmId, tokens.accessToken);
    totalSynced += invoicesSynced;

    console.log('[QBO SYNC] Syncing bills...');
    const billsSynced = await syncQboBills(orgId, tokens.realmId, tokens.accessToken);
    totalSynced += billsSynced;

    console.log('[QBO SYNC] Syncing purchases (bank transactions)...');
    const purchasesSynced = await syncQboPurchases(orgId, tokens.realmId, tokens.accessToken);
    totalSynced += purchasesSynced;

    // Run normalisation (same pipeline as Xero)
    console.log('[QBO SYNC] Running normalisation...');
    const { normaliseTransactions } = await import('@/lib/financial/normalise');
    const normalised = await normaliseTransactions(orgId);

    // Update sync log
    await supabase
      .from('sync_log')
      .update({
        status: 'completed',
        records_synced: totalSynced,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLog.id);

    await logAudit({
      orgId,
      userId,
      action: 'quickbooks.sync_completed',
      entityType: 'sync_log',
      entityId: syncLog.id,
      metadata: { accountsSynced, invoicesSynced, billsSynced, purchasesSynced, normalised, totalSynced },
    });

    // Auto-map accounts
    try {
      const { autoMapAccounts } = await import('@/lib/staging/account-mapper');
      const { data: syncedAccounts } = await supabase
        .from('chart_of_accounts')
        .select('code, name')
        .eq('org_id', orgId);
      const accountInputs = (syncedAccounts ?? []).map((a) => ({
        code: a.code as string,
        name: a.name as string,
      }));
      if (accountInputs.length > 0) {
        await autoMapAccounts(orgId, accountInputs);
      }
    } catch (mapError) {
      console.error('[QBO SYNC] Account mapping failed (non-blocking):', mapError);
    }

    console.log(`[QBO SYNC] === Complete: ${totalSynced} total records, ${normalised} normalised ===`);
    return { success: true, recordsSynced: totalSynced };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown sync error';
    console.error(`[QBO SYNC] === FAILED: ${errorMessage} ===`);

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
      action: 'quickbooks.sync_failed',
      entityType: 'sync_log',
      entityId: syncLog.id,
      metadata: { error: errorMessage },
    }, { critical: false });

    return { success: false, recordsSynced: 0, error: errorMessage };
  }
}
