import { createServiceClient } from '@/lib/supabase/server';
import { getValidTokens } from './tokens';
import { logAudit } from '@/lib/audit/log';
import { xeroGet, resetRateLimitTracker } from './api';
import { pullOrgAccountingConfig } from './org-config';
import { runDataHealthForRecentPeriods } from './data-health';
import { createNotification } from '@/lib/notifications/notify';
import { checkBudgetVariances } from '@/lib/alerts/budget-variance';

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

// xeroGet and resetRateLimitTracker now imported from ./api

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
 * Get the Xero DateTime filter for API where clauses.
 * Returns "DateTime(YYYY,M,1)" for 25 months ago (2 full financial years + buffer).
 * This prevents fetching the entire transaction history for large accounts
 * and keeps the sync within Vercel's 5-min function limit.
 */
function getSyncDateTimeFilter(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 13); // 1 financial year + current month
  d.setDate(1); // Start of month
  return `DateTime(${d.getFullYear()},${d.getMonth() + 1},1)`;
}

/**
 * Sync invoices (both sales and bills) from Xero.
 * Paginates through all pages (100 per page).
 * Filters to AUTHORISED + PAID only (DRAFT/VOIDED/DELETED excluded).
 * Only fetches last 25 months to stay within Vercel's 5-min function limit.
 */
async function syncInvoices(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<number> {
  const supabase = await createServiceClient();
  let synced = 0;
  let page = 1;
  const dateFilter = getSyncDateTimeFilter();
  const whereClause = encodeURIComponent(`Date>=${dateFilter}`);
  console.log(`[XERO SYNC] Filtering invoices to Date >= ${dateFilter}`);

  while (true) {
    const data = await xeroGet(
      `Invoices?Statuses=AUTHORISED,PAID&where=${whereClause}&page=${page}`,
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
  const dateFilter = getSyncDateTimeFilter();
  const whereClause = encodeURIComponent(`Status=="AUTHORISED"&&Date>=${dateFilter}`);
  console.log(`[XERO SYNC] Filtering bank transactions to Date >= ${dateFilter}`);

  while (true) {
    const data = await xeroGet(
      `BankTransactions?where=${whereClause}&page=${page}`,
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

  // Get chart of accounts lookup — by xero_account_id (UUID) AND by code
  // The Xero Trial Balance API returns the xero account UUID in Attributes, not the code
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, class, xero_account_id')
    .eq('org_id', orgId);

  const accountByXeroId = new Map<string, { id: string; cls: string }>();
  const accountByCode = new Map<string, { id: string; cls: string }>();
  for (const acc of (accounts ?? [])) {
    const entry = { id: acc.id, cls: (acc.class || '').toUpperCase() };
    if (acc.xero_account_id) {
      accountByXeroId.set(acc.xero_account_id, entry);
    }
    if (acc.code) {
      accountByCode.set(acc.code, entry);
    }
  }

  let totalUpserted = 0;

  // Fetch Trial Balance for each period (latest periods first, cap at 6 to stay within rate limits)
  // Fetch only 3 most recent periods to stay within Vercel's 60s function limit
  const periodsToFetch = periods.slice(0, 3);

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

      // Debug: log the raw report structure for first period
      if (period === periodsToFetch[0]) {
        const sectionTypes = report.Rows.map((r: Record<string, unknown>) => r.RowType);
        console.log(`[XERO SYNC] TB report structure — RowTypes:`, sectionTypes);
        const firstSection = report.Rows.find((r: Record<string, unknown>) => r.RowType === 'Section');
        if (firstSection?.Rows?.[0]) {
          console.log(`[XERO SYNC] TB first data row sample:`, JSON.stringify(firstSection.Rows[0]).slice(0, 500));
        }
      }

      for (const section of report.Rows) {
        if (section.RowType === 'Section' && section.Rows) {
          for (const row of section.Rows) {
            if (row.RowType !== 'Row' || !row.Cells) continue;

            // Cells: [Account, Debit, Credit, YTD Debit, YTD Credit]
            // Account cell Attributes: Value = Xero account UUID, Id = 'account'
            const accountCell = row.Cells[0];
            const xeroAccountUuid = accountCell?.Attributes?.find(
              (a: { Id: string; Value: string }) => a.Id === 'account'
            )?.Value;

            if (!xeroAccountUuid) continue;

            // Look up by Xero UUID first (primary), then fall back to code
            const accInfo = accountByXeroId.get(xeroAccountUuid)
              || accountByCode.get(xeroAccountUuid);
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
            source: 'xero_trial_balance',
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
 * P&L section → platform class mapping.
 * Xero P&L report sections use human-readable titles.
 * We normalise them to the class keys used by buildPnL.
 */
type PnLSectionClass = 'REVENUE' | 'DIRECTCOSTS' | 'EXPENSE';

function classifyPnLSection(sectionTitle: string): PnLSectionClass | null {
  const t = sectionTitle.toLowerCase();
  if (t.includes('income') || t.includes('revenue')) return 'REVENUE';
  if (t.includes('cost of sales') || t.includes('direct cost') || t.includes('purchases')) return 'DIRECTCOSTS';
  if (t.includes('expense') || t.includes('operating')) return 'EXPENSE';
  return null; // Summary rows, headers, etc.
}

/**
 * Sync P&L data from Xero Reports/ProfitAndLoss endpoint.
 *
 * The Xero P&L report is the AUTHORITATIVE source for profit & loss figures.
 * It returns net-of-VAT amounts grouped into sections (Income, Cost of Sales,
 * Operating Expenses) that match what the accountant sees.
 *
 * This replaces raw-transaction normalisation (which double-counts, includes
 * VAT, and doesn't reflect Xero's own P&L section groupings).
 *
 * The report also tells us which section each account belongs to, which we use
 * to fix chart_of_accounts.type for COGS accounts that Xero marks as EXPENSE.
 *
 * Called AFTER normaliseTransactions so it overwrites the raw-tx data with
 * Xero-authoritative figures.
 */
async function syncProfitAndLossData(
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
  if (periods.length === 0) return 0;

  // Build account lookup by Xero UUID and by code
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, class, type, xero_account_id')
    .eq('org_id', orgId);

  const accountByXeroId = new Map<string, { id: string; code: string; type: string }>();
  const accountByName = new Map<string, { id: string; code: string; type: string }>();
  for (const acc of (accounts ?? [])) {
    const entry = { id: acc.id, code: acc.code || '', type: acc.type || '' };
    if (acc.xero_account_id && !acc.xero_account_id.startsWith('SEED-') && !acc.xero_account_id.startsWith('demo-')) {
      accountByXeroId.set(acc.xero_account_id, entry);
    }
    // Also index by "Name (Code)" for fallback matching against P&L report cell values
    if (acc.name) {
      accountByName.set(acc.name.toLowerCase(), entry);
      if (acc.code) {
        accountByName.set(`${acc.name.toLowerCase()} (${acc.code.toLowerCase()})`, entry);
      }
    }
  }

  let totalUpserted = 0;
  // Track accounts that need their type updated to DIRECTCOSTS
  const cogsAccountIds = new Set<string>();

  // Fetch P&L for the 13 most recent periods (matching the invoice sync date window).
  // 13 API calls is well within Xero's 60/min rate limit.
  const periodsToFetch = periods.slice(0, 13);
  console.log(`[XERO SYNC] Fetching P&L report for ${periodsToFetch.length} periods`);

  for (const period of periodsToFetch) {
    try {
      const [year, month] = period.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const toDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const data = await xeroGet(
        `Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`,
        accessToken,
        tenantId
      );

      const report = data?.Reports?.[0];
      if (!report?.Rows) {
        console.log(`[XERO SYNC] No P&L data for ${period}`);
        continue;
      }

      const rows: Array<{
        period: string;
        accountId: string;
        amount: number;
        sectionClass: PnLSectionClass;
      }> = [];

      for (const section of report.Rows) {
        if (section.RowType !== 'Section' || !section.Rows) continue;

        const sectionClass = classifyPnLSection(section.Title || '');
        if (!sectionClass) continue;

        for (const row of section.Rows) {
          if (row.RowType !== 'Row' || !row.Cells) continue;

          const accountCell = row.Cells[0];
          const amount = parseFloat(row.Cells[1]?.Value || '0') || 0;
          if (amount === 0) continue;

          // Try to resolve account via Attributes UUID
          const xeroUuid = accountCell?.Attributes?.find(
            (a: { Id: string; Value: string }) => a.Id === 'account'
          )?.Value;

          let accInfo: { id: string; code: string; type: string } | undefined;

          if (xeroUuid) {
            accInfo = accountByXeroId.get(xeroUuid);
          }

          // Fallback: match by name
          if (!accInfo && accountCell?.Value) {
            accInfo = accountByName.get(accountCell.Value.toLowerCase());
          }

          if (!accInfo) {
            // Skip unmatched accounts (rare — usually system accounts)
            continue;
          }

          // Track COGS accounts for type update
          if (sectionClass === 'DIRECTCOSTS') {
            cogsAccountIds.add(accInfo.id);
          }

          // Xero P&L report convention: positive = income or cost, negative = credit/reduction.
          // Platform convention (for buildPnL):
          //   Revenue amounts: positive (income), negative (refund) — keep sign as-is
          //   COGS/Expense amounts: flip sign — so costs become negative (Math.abs in buildPnL)
          //   This ensures: grossProfit = revenue(+) - Math.abs(COGS total(-))
          //
          // Example: Fabric +11,805 → store as -11,805 (cost)
          //          Closing WIP -75,997 → store as +75,997 (credit reduces COGS)
          const normalisedAmount = sectionClass === 'REVENUE' ? amount : -amount;

          rows.push({
            period,
            accountId: accInfo.id,
            amount: normalisedAmount,
            sectionClass,
          });
        }
      }

      console.log(`[XERO SYNC] P&L report ${period}: ${rows.length} account entries`);

      // CLEAN: delete stale non-report P&L rows for this period.
      // Raw-transaction normalisation (source='xero') and demo data (source='demo')
      // contain incorrect amounts. The P&L report is authoritative, so we remove
      // all P&L-source data before upserting. BS data (source='xero_trial_balance')
      // is preserved.
      for (const staleSource of ['xero', 'demo']) {
        const { error: cleanError } = await supabase
          .from('normalised_financials')
          .delete()
          .eq('org_id', orgId)
          .eq('period', period)
          .eq('source', staleSource);

        if (cleanError) {
          console.warn(`[XERO SYNC] Failed to clean ${staleSource} data for ${period}: ${cleanError.message}`);
        }
      }

      // Upsert P&L data — now the only P&L rows for this period
      for (const row of rows) {
        const { error } = await supabase.from('normalised_financials').upsert(
          {
            org_id: orgId,
            period: row.period,
            account_id: row.accountId,
            amount: Math.round((row.amount + Number.EPSILON) * 100) / 100,
            transaction_count: 0,
            source: 'xero_pnl_report',
          },
          { onConflict: 'org_id,period,account_id' }
        );

        if (error) {
          console.warn(`[XERO SYNC] P&L upsert failed for ${row.period}/${row.accountId}: ${error.message}`);
        } else {
          totalUpserted++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[XERO SYNC] P&L report fetch failed for ${period}: ${msg}`);
      if (msg.includes('429')) {
        console.warn(`[XERO SYNC] Rate limited — stopping P&L report fetch`);
        break;
      }
    }
  }

  // Update chart_of_accounts.type for COGS accounts
  // This ensures buildPnL (class-based) correctly categorises them as Cost of Sales
  if (cogsAccountIds.size > 0) {
    const cogsIds = [...cogsAccountIds];
    const { error } = await supabase
      .from('chart_of_accounts')
      .update({ type: 'DIRECTCOSTS' })
      .eq('org_id', orgId)
      .in('id', cogsIds);

    if (error) {
      console.warn(`[XERO SYNC] Failed to update COGS account types: ${error.message}`);
    } else {
      console.log(`[XERO SYNC] Updated ${cogsIds.length} accounts to type=DIRECTCOSTS`);
    }
  }

  return totalUpserted;
}

/**
 * Full sync pipeline: accounts → invoices → bank transactions → normalise → balance sheet → P&L report.
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
    resetRateLimitTracker();

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

    // Sync invoices then bank transactions SEQUENTIALLY
    // Running in parallel burns through Xero's 60-call/min rate limit 2x faster,
    // causing 43s pauses that push the total past Vercel's 5-min limit.
    console.log('[XERO SYNC] Syncing invoices...');
    const invoicesSynced = await syncInvoices(orgId, tokens.accessToken, tokens.tenantId);
    totalSynced += invoicesSynced;
    console.log(`[XERO SYNC] Invoices: ${invoicesSynced} synced`);

    console.log('[XERO SYNC] Syncing bank transactions...');
    const bankTxSynced = await syncBankTransactions(orgId, tokens.accessToken, tokens.tenantId);
    totalSynced += bankTxSynced;
    console.log(`[XERO SYNC] Bank tx: ${bankTxSynced} synced`);

    // Run normalisation
    console.log('[XERO SYNC] Running normalisation...');
    const { normaliseTransactions } = await import('@/lib/financial/normalise');
    const normalised = await normaliseTransactions(orgId);
    console.log(`[XERO SYNC] Normalised: ${normalised} period-account records`);

    // Sync balance sheet data from Xero Trial Balance API.
    // This makes only 2-4 API calls (3 most recent periods) — well within rate limits.
    console.log('[XERO SYNC] Syncing balance sheet (Trial Balance)...');
    const bsSynced = await syncBalanceSheetData(orgId, tokens.accessToken, tokens.tenantId);
    console.log(`[XERO SYNC] Balance sheet: ${bsSynced} records synced`);

    // Sync P&L from Xero Reports API — OVERWRITES raw-transaction normalisation
    // with Xero-authoritative figures (net of VAT, correct section groupings).
    // Makes 6 API calls (6 most recent periods).
    console.log('[XERO SYNC] Syncing P&L (Xero Reports)...');
    const pnlSynced = await syncProfitAndLossData(orgId, tokens.accessToken, tokens.tenantId);
    console.log(`[XERO SYNC] P&L report: ${pnlSynced} records synced`);

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
      metadata: { accountsSynced, invoicesSynced, bankTxSynced, normalised, bsSynced, pnlSynced, totalSynced },
    });

    // Run all non-blocking post-sync steps IN PARALLEL to stay within Vercel 60s limit
    console.log('[XERO SYNC] Running post-sync steps in parallel...');
    await Promise.allSettled([
      // Org config refresh
      pullOrgAccountingConfig(orgId, tokens.accessToken, tokens.tenantId)
        .then(() => console.log('[XERO SYNC] Org config refreshed'))
        .catch((e) => console.warn('[XERO SYNC] Org config failed:', e instanceof Error ? e.message : String(e))),

      // Data health checks (reduced to 1 period for speed)
      runDataHealthForRecentPeriods(orgId, 1)
        .then((r) => console.log(`[XERO SYNC] Data health: ${r.map((h) => `${h.period}=${h.overall_score}`).join(', ')}`))
        .catch((e) => console.warn('[XERO SYNC] Data health failed:', e instanceof Error ? e.message : String(e))),

      // Tracking categories
      import('./tracking-categories')
        .then(({ pullTrackingCategories }) => pullTrackingCategories(orgId, tokens.accessToken, tokens.tenantId))
        .then((tc) => console.log(`[XERO SYNC] Tracking categories: ${tc} mapped`))
        .catch((e) => console.warn('[XERO SYNC] Tracking categories failed:', e instanceof Error ? e.message : String(e))),

      // Account mapping
      (async () => {
        const { autoMapAccounts } = await import('@/lib/staging/account-mapper');
        const { data: syncedAccounts } = await supabase
          .from('chart_of_accounts')
          .select('code, name, type, class')
          .eq('org_id', orgId);
        const accountInputs = (syncedAccounts ?? []).map((a) => ({
          code: a.code as string,
          name: a.name as string,
          type: (a.type as string) ?? undefined,
          class: (a.class as string) ?? undefined,
        }));
        if (accountInputs.length > 0) await autoMapAccounts(orgId, accountInputs);
        console.log('[XERO SYNC] Account mapping done');
      })().catch((e) => console.warn('[XERO SYNC] Account mapping failed:', e)),

      // Checkpoint
      import('@/lib/staging/checkpoints')
        .then(({ createCheckpoint }) => createCheckpoint(orgId, 'post_sync', {
          syncedAt: new Date().toISOString(),
          accountsCount: accountsSynced,
          transactionsCount: invoicesSynced + bankTxSynced,
          normalisedCount: normalised,
        }))
        .catch((e) => console.warn('[XERO SYNC] Checkpoint failed:', e)),

      // Reconciliation (most important post-sync step)
      (async () => {
        const { runPostSyncReconciliation } = await import('@/lib/financial/post-sync-reconciliation');
        const reconReports = await runPostSyncReconciliation(orgId, tokens.accessToken, tokens.tenantId);
        const criticalCount = reconReports.filter((r) => r.hasCritical).length;
        console.log(`[XERO SYNC] Reconciliation: ${reconReports.length} periods, ${criticalCount} critical`);
        if (criticalCount > 0) {
          await createNotification({
            userId,
            orgId,
            type: 'system',
            title: 'Data discrepancies found',
            body: `Post-sync reconciliation found critical discrepancies in ${criticalCount} period(s). Platform figures may not match your accounting records. Review immediately.`,
            actionUrl: '/integrations/health',
          }).catch(() => {});
        }
      })().catch((e) => console.warn('[XERO SYNC] Reconciliation failed:', e instanceof Error ? e.message : String(e))),

      // Business intelligence derivation (seasonal, revenue model, cost structure, DSCR)
      import('@/lib/skills/derive-business-intelligence')
        .then(({ deriveBusinessIntelligence }) => deriveBusinessIntelligence(orgId))
        .then((bi) => console.log(`[XERO SYNC] Business intelligence derived: ${bi.revenueModel.modelType} model, seasonal=${bi.seasonalProfile.isSeasonal}, DSCR=${bi.debtMetrics?.dscr ?? 'N/A'}`))
        .catch((e) => console.warn('[XERO SYNC] Business intelligence derivation failed:', e instanceof Error ? e.message : String(e))),
    ]);

    console.log(`[XERO SYNC] === Complete: ${totalSynced} total records, ${normalised} normalised ===`);

    // Push notification to user
    await createNotification({
      userId,
      orgId,
      type: 'system',
      title: 'Xero sync complete',
      body: `Synced ${totalSynced.toLocaleString()} records and normalised ${normalised} period-account entries.`,
      actionUrl: '/dashboard',
    }).catch(() => {}); // Fire-and-forget

    // Check budget variances after sync (fire-and-forget)
    checkBudgetVariances(orgId, userId).catch(() => {});

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
    }, { critical: false });

    // Notify user of sync failure
    await createNotification({
      userId,
      orgId,
      type: 'system',
      title: 'Xero sync failed',
      body: `Sync encountered an error: ${errorMessage.slice(0, 200)}. Please try again or check your Xero connection.`,
      actionUrl: '/xero',
    }).catch(() => {}); // Fire-and-forget

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

  // Check if BS data already exists by looking for rows with the
  // 'xero_trial_balance' source tag. This avoids false positives from
  // incidental BS-class rows created during invoice normalisation
  // (e.g. Prepayments, Computer Equipment).
  const { data: existing } = await supabase
    .from('normalised_financials')
    .select('id')
    .eq('org_id', orgId)
    .eq('source', 'xero_trial_balance')
    .limit(1);

  if (existing && existing.length > 0) {
    // Trial Balance data already present — nothing to do
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
  resetRateLimitTracker();

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
