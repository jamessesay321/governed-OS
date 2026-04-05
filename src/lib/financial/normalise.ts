import { createServiceClient } from '@/lib/supabase/server';

interface LineItem {
  AccountCode?: string;
  AccountID?: string;
  LineAmount?: number;
  [key: string]: unknown;
}

/**
 * Normalise raw transactions into monthly aggregates by account.
 * This is a DETERMINISTIC process — pure data transformation.
 *
 * IMPORTANT: Only invoices (ACCREC) and bills (ACCPAY) are used for P&L
 * normalisation. Bank transactions are EXCLUDED because they duplicate
 * revenue/expense recognition already captured by invoices and bills.
 * In Xero's double-entry system:
 *   - Invoice line items: Debit Receivable / Credit Revenue (revenue recognition)
 *   - Bank receipt line items: Debit Bank / Credit Revenue (cash receipt)
 * Including both would double-count every revenue and expense line.
 *
 * Steps:
 * 1. Fetch invoices and bills for the org (exclude bank_transaction type)
 * 2. Group by (period, account)
 * 3. Aggregate amounts and counts
 * 4. Upsert into normalised_financials
 */
export async function normaliseTransactions(orgId: string): Promise<number> {
  const supabase = await createServiceClient();

  // Fetch only invoices and bills — NOT bank transactions
  // Bank transactions duplicate P&L entries from invoices/bills
  // IMPORTANT: Paginate to fetch ALL rows (Supabase default limit is 1000)
  const transactions: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: page, error: txError } = await supabase
      .from('raw_transactions')
      .select('*')
      .eq('org_id', orgId)
      .in('type', ['invoice', 'bill'])
      .range(offset, offset + PAGE_SIZE - 1);

    if (txError) {
      throw new Error(`Failed to fetch transactions at offset ${offset}: ${txError.message}`);
    }

    if (!page || page.length === 0) {
      hasMore = false;
    } else {
      transactions.push(...page);
      offset += PAGE_SIZE;
      if (page.length < PAGE_SIZE) hasMore = false;
    }
  }

  if (transactions.length === 0) {
    console.log('[NORMALISE] No transactions found');
    return 0;
  }

  console.log(`[NORMALISE] ${transactions.length} raw transactions to process (fetched in ${Math.ceil(transactions.length / PAGE_SIZE)} pages)`);

  // Fetch chart of accounts for mapping
  const { data: accounts, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('id, code, xero_account_id')
    .eq('org_id', orgId);

  if (accError || !accounts) {
    throw new Error(`Failed to fetch accounts: ${accError?.message}`);
  }

  console.log(`[NORMALISE] ${accounts.length} chart of accounts entries`);

  // Build code → account ID lookup
  // Skip seed/demo accounts and empty codes.
  // When duplicate codes exist (e.g. code "210" has both a seed and real account),
  // prefer the real Xero account (has a UUID xero_account_id) over seed/demo ones.
  const accountByCode = new Map<string, string>();
  const accountPriority = new Map<string, boolean>(); // true = real Xero account

  for (const acc of accounts) {
    if (!acc.code) continue;

    const xeroId = acc.xero_account_id ?? '';
    const isSeedOrDemo =
      xeroId.startsWith('SEED-') ||
      xeroId.startsWith('demo-') ||
      xeroId.startsWith('DEMO-') ||
      xeroId === '';

    // Skip pure seed accounts if a real account already has this code
    if (isSeedOrDemo && accountPriority.get(acc.code) === true) {
      continue;
    }

    // If this is a real Xero account, always overwrite any seed mapping
    if (!isSeedOrDemo) {
      accountByCode.set(acc.code, acc.id);
      accountPriority.set(acc.code, true);
    } else if (!accountByCode.has(acc.code)) {
      // Only use seed account as fallback if no mapping exists yet
      accountByCode.set(acc.code, acc.id);
      accountPriority.set(acc.code, false);
    }
  }

  const realCount = [...accountPriority.values()].filter(Boolean).length;
  console.log(`[NORMALISE] ${accountByCode.size} account codes mapped (${realCount} real Xero, ${accountByCode.size - realCount} seed/demo fallback)`);

  // Clear existing normalised data for this org before rebuilding.
  // This ensures stale records (e.g. from previously-included bank transactions)
  // are removed. The upsert below will recreate all valid aggregates.
  const { error: clearError } = await supabase
    .from('normalised_financials')
    .delete()
    .eq('org_id', orgId)
    .eq('source', 'xero');

  if (clearError) {
    console.warn(`[NORMALISE] Failed to clear existing data: ${clearError.message}`);
  } else {
    console.log(`[NORMALISE] Cleared existing normalised data for rebuild`);
  }

  // Aggregate: key = `${period}:${accountId}` → { amount, count }
  const aggregates = new Map<
    string,
    { period: string; accountId: string; amount: number; count: number }
  >();

  let totalLineItems = 0;
  let unmappedNoCode = 0;
  let unmappedNoMatch = 0;
  const unmatchedCodes = new Set<string>();

  for (const tx of transactions) {
    const period = toMonthStart(tx.date as string);

    // Validate period is sensible (not NaN from bad date parsing)
    if (period.includes('NaN')) {
      console.warn(`[NORMALISE] Bad date on tx ${tx.xero_id}: "${tx.date}" → "${period}"`);
      continue;
    }

    const lineItems = ((tx.line_items as unknown[]) || []) as LineItem[];

    for (const line of lineItems) {
      totalLineItems++;
      const accountCode = line.AccountCode;

      if (!accountCode) {
        unmappedNoCode++;
        continue;
      }

      const accountId = accountByCode.get(accountCode);
      if (!accountId) {
        unmappedNoMatch++;
        unmatchedCodes.add(accountCode);
        continue;
      }

      const key = `${period}:${accountId}`;
      const existing = aggregates.get(key);

      if (existing) {
        existing.amount += line.LineAmount || 0;
        existing.count += 1;
      } else {
        aggregates.set(key, {
          period,
          accountId,
          amount: line.LineAmount || 0,
          count: 1,
        });
      }
    }
  }

  console.log(`[NORMALISE] Line items: ${totalLineItems} total, ${unmappedNoCode} without AccountCode, ${unmappedNoMatch} unmatched codes`);
  if (unmatchedCodes.size > 0) {
    console.log(`[NORMALISE] Unmatched account codes: ${Array.from(unmatchedCodes).join(', ')}`);
  }
  console.log(`[NORMALISE] ${aggregates.size} period-account aggregates to upsert`);

  // Upsert normalised records
  let upserted = 0;
  for (const agg of aggregates.values()) {
    const { error } = await supabase.from('normalised_financials').upsert(
      {
        org_id: orgId,
        period: agg.period,
        account_id: agg.accountId,
        amount: roundCurrency(agg.amount),
        transaction_count: agg.count,
        source: 'xero',
      },
      { onConflict: 'org_id,period,account_id' }
    );

    if (error) {
      console.warn(`[NORMALISE] Failed to upsert ${agg.period}: ${error.message}`);
    } else {
      upserted++;
    }
  }

  return upserted;
}

/**
 * Convert a date string to the first of its month (YYYY-MM-01).
 */
export function toMonthStart(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Round to 2 decimal places using banker's rounding.
 */
export function roundCurrency(value: number): number {
  const result = Math.round((value + Number.EPSILON) * 100) / 100;
  return result === 0 ? 0 : result; // Normalize -0 to 0
}
