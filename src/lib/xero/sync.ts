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

/**
 * Pause execution for a given number of milliseconds.
 * Used to stay within Xero's rate limit (60 calls/minute).
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Track API calls and automatically pace to stay under Xero's 60-per-minute limit.
 */
let xeroCallTimestamps: number[] = [];

async function xeroGet(
  endpoint: string,
  accessToken: string,
  tenantId: string
) {
  // Rate-limit: if we've made 55+ calls in the last 60 seconds, wait
  const now = Date.now();
  xeroCallTimestamps = xeroCallTimestamps.filter((t) => now - t < 60_000);
  if (xeroCallTimestamps.length >= 55) {
    const oldest = xeroCallTimestamps[0];
    const waitMs = 60_000 - (now - oldest) + 500; // Wait until the oldest call expires + buffer
    console.log(`[XERO SYNC] Rate limit approaching (${xeroCallTimestamps.length} calls in 60s), pausing ${Math.round(waitMs / 1000)}s...`);
    await delay(waitMs);
  }

  xeroCallTimestamps.push(Date.now());

  const response = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    // On 429, wait and retry once
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '30', 10);
      console.log(`[XERO SYNC] 429 rate limited, waiting ${retryAfter}s before retry...`);
      await delay(retryAfter * 1000);

      const retryResponse = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          Accept: 'application/json',
        },
      });

      if (retryResponse.ok) return retryResponse.json();

      const body = await retryResponse.text().catch(() => '');
      throw new Error(`Xero API error: ${retryResponse.status} ${retryResponse.statusText}: ${body.slice(0, 200)}`);
    }

    const body = await response.text().catch(() => '');
    throw new Error(`Xero API error: ${response.status} ${response.statusText}: ${body.slice(0, 200)}`);
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

  if (accounts.length === 0) return 0;

  // Batch upsert all accounts in one query instead of N+1
  const rows = accounts.map((account) => ({
    org_id: orgId,
    xero_account_id: account.AccountID,
    code: account.Code || '',
    name: account.Name,
    type: account.Type,
    class: account.Class || '',
    status: account.Status,
  }));

  const { error, count } = await supabase
    .from('chart_of_accounts')
    .upsert(rows, { onConflict: 'org_id,xero_account_id', count: 'exact' });

  if (error) {
    console.warn(`[XERO SYNC] Batch upsert accounts failed: ${error.message}`);
    return 0;
  }

  return count ?? rows.length;
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

    // Batch upsert all invoices for this page
    const now = new Date().toISOString();
    const rows = invoices.map((invoice) => ({
      org_id: orgId,
      xero_id: invoice.InvoiceID,
      date: extractDate(invoice),
      type: (invoice.Type === 'ACCREC' ? 'invoice' : 'bill') as 'invoice' | 'bill',
      contact_name: invoice.Contact?.Name || null,
      line_items: invoice.LineItems || [],
      total: invoice.Total,
      currency: invoice.CurrencyCode || 'AUD',
      raw_payload: invoice as unknown as Record<string, unknown>,
      synced_at: now,
    }));

    const { error, count } = await supabase
      .from('raw_transactions')
      .upsert(rows, { onConflict: 'org_id,xero_id', count: 'exact' });

    if (error) {
      console.warn(`[XERO SYNC] Batch upsert invoices page ${page} failed: ${error.message}`);
    } else {
      synced += count ?? rows.length;
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

    // Batch upsert all bank transactions for this page
    const now = new Date().toISOString();
    const rows = transactions.map((tx) => ({
      org_id: orgId,
      xero_id: tx.BankTransactionID,
      date: extractDate(tx),
      type: 'bank_transaction' as const,
      contact_name: tx.Contact?.Name || null,
      line_items: tx.LineItems || [],
      total: tx.Total,
      currency: tx.CurrencyCode || 'AUD',
      raw_payload: tx as unknown as Record<string, unknown>,
      synced_at: now,
    }));

    const { error, count } = await supabase
      .from('raw_transactions')
      .upsert(rows, { onConflict: 'org_id,xero_id', count: 'exact' });

    if (error) {
      console.warn(`[XERO SYNC] Batch upsert bank tx page ${page} failed: ${error.message}`);
    } else {
      synced += count ?? rows.length;
    }

    if (transactions.length < 100) break;
    page++;
  }

  return synced;
}

/**
 * Sync balance sheet data from Xero Reports API.
 * Fetches the Trial Balance report for each month that has transaction data,
 * extracts ASSET, LIABILITY, EQUITY account balances and writes them to
 * normalised_financials.
 *
 * The Trial Balance gives end-of-period balances for every account —
 * this is the authoritative source for balance sheet positions.
 */
async function syncBalanceSheetData(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<number> {
  const supabase = await createServiceClient();

  // Get all periods that have transaction data
  const { data: periodsData } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const periods = [...new Set((periodsData ?? []).map((p) => p.period))].sort().reverse();
  console.log(`[XERO SYNC] Fetching balance sheet data for ${periods.length} periods`);

  if (periods.length === 0) return 0;

  // Get chart of accounts lookup (code → id, and check class)
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, class')
    .eq('org_id', orgId);

  const accountByCode = new Map<string, { id: string; cls: string }>();
  for (const acc of (accounts ?? [])) {
    if (acc.code) {
      accountByCode.set(acc.code, { id: acc.id, cls: (acc.class || '').toUpperCase() });
    }
  }

  let totalUpserted = 0;

  // Fetch Trial Balance for each period (latest periods first, cap at 6 to stay within rate limits)
  const periodsToFetch = periods.slice(0, 6);

  for (const period of periodsToFetch) {
    try {
      // period is YYYY-MM-01 — we need the last day of the month for the report date
      const [year, month] = period.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const reportDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const data = await xeroGet(
        `Reports/TrialBalance?date=${reportDate}`,
        accessToken,
        tenantId
      );

      const report = data?.Reports?.[0];
      if (!report?.Rows) {
        console.log(`[XERO SYNC] No Trial Balance data for ${period}`);
        continue;
      }

      // Parse the Trial Balance report
      // Xero TB structure: Rows[] → each Row has Cells[], RowType = 'Section'|'Row'|'SummaryRow'
      const rows: Array<{ period: string; accountId: string; amount: number }> = [];

      for (const section of report.Rows) {
        if (section.RowType === 'Section' && section.Rows) {
          for (const row of section.Rows) {
            if (row.RowType !== 'Row' || !row.Cells) continue;

            // Cells: [Account, Debit, Credit, YTD Debit, YTD Credit]
            // Account cell has Attributes with Value = AccountID and Id = 'account'
            const accountCell = row.Cells[0];
            const accountCode = accountCell?.Attributes?.find(
              (a: { Id: string; Value: string }) => a.Id === 'account'
            )?.Value;

            if (!accountCode) continue;

            const accInfo = accountByCode.get(accountCode);
            if (!accInfo) continue;

            // Only process balance sheet accounts
            const bsClasses = ['ASSET', 'LIABILITY', 'EQUITY'];
            if (!bsClasses.includes(accInfo.cls)) continue;

            // Get the net balance: Debit - Credit (for standard Trial Balance)
            const debit = parseFloat(row.Cells[1]?.Value || '0') || 0;
            const credit = parseFloat(row.Cells[2]?.Value || '0') || 0;
            const netBalance = debit - credit;

            if (netBalance === 0) continue;

            rows.push({
              period,
              accountId: accInfo.id,
              amount: netBalance,
            });
          }
        }
      }

      console.log(`[XERO SYNC] Trial Balance ${period}: ${rows.length} BS account balances`);

      // Upsert balance sheet data into normalised_financials
      for (const row of rows) {
        const { error } = await supabase.from('normalised_financials').upsert(
          {
            org_id: orgId,
            period: row.period,
            account_id: row.accountId,
            amount: Math.round((row.amount + Number.EPSILON) * 100) / 100,
            transaction_count: 0, // Report-derived, not transaction count
            source: 'xero',
          },
          { onConflict: 'org_id,period,account_id' }
        );

        if (error) {
          console.warn(`[XERO SYNC] BS upsert failed for ${row.period}/${row.accountId}: ${error.message}`);
        } else {
          totalUpserted++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Log but don't fail the whole sync if one period's report fails
      console.warn(`[XERO SYNC] Trial Balance fetch failed for ${period}: ${msg}`);

      // If it's a 429 (rate limit), stop trying more periods
      if (msg.includes('429')) {
        console.warn(`[XERO SYNC] Rate limited — stopping balance sheet fetch`);
        break;
      }
    }
  }

  return totalUpserted;
}

/**
 * Full sync pipeline: accounts → invoices → bank transactions → normalise → balance sheet.
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

    // Reset rate limit tracker for this sync run
    xeroCallTimestamps = [];

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

    // Sync balance sheet data from Xero Trial Balance reports (non-blocking)
    let bsSynced = 0;
    try {
      console.log('[XERO SYNC] Syncing balance sheet data from Trial Balance...');
      bsSynced = await syncBalanceSheetData(
        orgId,
        tokens.accessToken,
        tokens.tenantId
      );
      totalSynced += bsSynced;
      console.log(`[XERO SYNC] Balance sheet: ${bsSynced} account-period records synced`);
    } catch (bsErr) {
      // Balance sheet sync is non-blocking — P&L data should still be available
      const bsMsg = bsErr instanceof Error ? bsErr.message : String(bsErr);
      console.warn(`[XERO SYNC] Balance sheet sync failed (non-blocking): ${bsMsg}`);
    }

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
      metadata: { accountsSynced, invoicesSynced, bankTxSynced, normalised, bsSynced, totalSynced },
    });

    // Auto-map accounts after sync
    try {
      const { autoMapAccounts } = await import('@/lib/staging/account-mapper');
      // Fetch synced accounts for mapping
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
      console.error('[xero/sync] Account mapping failed (non-blocking):', mapError);
    }

    // Create post-sync checkpoint
    try {
      const { createCheckpoint } = await import('@/lib/staging/checkpoints');
      await createCheckpoint(orgId, 'post_sync', {
        syncedAt: new Date().toISOString(),
        accountsCount: accountsSynced,
        transactionsCount: invoicesSynced + bankTxSynced,
        normalisedCount: normalised,
      });
    } catch (cpError) {
      console.error('[xero/sync] Checkpoint creation failed (non-blocking):', cpError);
    }

    console.log(`[XERO SYNC] === Complete: ${totalSynced} total records, ${normalised} normalised ===`);
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

/**
 * Lightweight balance sheet data fetch — called directly from server
 * components when BS data is missing. Only makes 6-8 API calls (well
 * within Xero's 60/min rate limit), unlike the full sync pipeline.
 *
 * Returns number of records upserted, or 0 if no data / not connected.
 */
export async function ensureBalanceSheetData(orgId: string): Promise<number> {
  const supabase = await createServiceClient();

  // Check if BS data already exists
  const { data: existing } = await supabase
    .from('normalised_financials')
    .select('id, chart_of_accounts!inner(class)')
    .eq('org_id', orgId)
    .in('chart_of_accounts.class', ['ASSET', 'LIABILITY', 'EQUITY'])
    .limit(1);

  if (existing && existing.length > 0) {
    // BS data already present — nothing to do
    return 0;
  }

  // Get Xero tokens
  let tokens: { accessToken: string; tenantId: string };
  try {
    tokens = await getValidTokens(orgId);
  } catch {
    // Not connected or tokens expired
    return 0;
  }

  // Reset rate limit tracker for this lightweight call
  xeroCallTimestamps = [];

  console.log('[XERO SYNC] Auto-fetching balance sheet data (lightweight)...');
  try {
    const count = await syncBalanceSheetData(orgId, tokens.accessToken, tokens.tenantId);
    console.log(`[XERO SYNC] Auto-fetch complete: ${count} BS records`);
    return count;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[XERO SYNC] Auto-fetch balance sheet failed: ${msg}`);
    return 0;
  }
}
