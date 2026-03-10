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
 * Steps:
 * 1. Fetch all raw transactions for the org
 * 2. Group by (period, account)
 * 3. Aggregate amounts and counts
 * 4. Upsert into normalised_financials
 */
export async function normaliseTransactions(orgId: string): Promise<number> {
  const supabase = await createServiceClient();

  // Fetch raw transactions
  const { data: transactions, error: txError } = await supabase
    .from('raw_transactions')
    .select('*')
    .eq('org_id', orgId);

  if (txError || !transactions) {
    throw new Error(`Failed to fetch transactions: ${txError?.message}`);
  }

  console.log(`[NORMALISE] ${transactions.length} raw transactions to process`);

  // Fetch chart of accounts for mapping
  const { data: accounts, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('id, code, xero_account_id')
    .eq('org_id', orgId);

  if (accError || !accounts) {
    throw new Error(`Failed to fetch accounts: ${accError?.message}`);
  }

  console.log(`[NORMALISE] ${accounts.length} chart of accounts entries`);

  // Build code → account ID lookup (skip seed accounts and empty codes)
  const accountByCode = new Map<string, string>();
  for (const acc of accounts) {
    if (acc.code && !acc.xero_account_id?.startsWith('SEED-')) {
      accountByCode.set(acc.code, acc.id);
    }
  }

  console.log(`[NORMALISE] ${accountByCode.size} account codes mapped (excluding seed)`);

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
    const period = toMonthStart(tx.date);

    // Validate period is sensible (not NaN from bad date parsing)
    if (period.includes('NaN')) {
      console.warn(`[NORMALISE] Bad date on tx ${tx.xero_id}: "${tx.date}" → "${period}"`);
      continue;
    }

    const lineItems = (tx.line_items || []) as LineItem[];

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
