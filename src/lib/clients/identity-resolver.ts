/**
 * Client Identity Resolver
 *
 * Resolves raw_transactions.contact_name into unique client entities.
 * Handles name normalisation, deduplication, and cross-year tracking.
 *
 * For fashion/bridal businesses like Alonuko, a bride might:
 * - Order a dress in 2024 (initial payment)
 * - Make balance payments through 2025 (deferred revenue)
 * - Each payment is a separate invoice under the same contact_name
 *
 * This resolver creates a single client record per unique contact,
 * tracks their financial relationship across years, and identifies
 * cross-year revenue patterns.
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface ClientRecord {
  displayName: string;
  normalisedName: string;
  clientType: 'customer' | 'supplier' | 'both';
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  firstTransactionDate: string;
  lastTransactionDate: string;
  transactionCount: number;
  firstYear: number;
  latestYear: number;
  spansMultipleYears: boolean;
  transactionIds: string[];
}

/**
 * Normalise a contact name for deduplication.
 * Handles common variations in name entry.
 */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes/prefixes
    .replace(/\s*(ltd|limited|plc|llp|inc|corp|mr|mrs|ms|miss|dr)\s*/gi, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Remove leading/trailing punctuation
    .replace(/^[:\-\s]+|[:\-\s]+$/g, '')
    .trim();
}

/**
 * Resolve all contacts in raw_transactions into unique client records.
 * This is a batch operation - runs for an entire org.
 */
export async function resolveClients(orgId: string): Promise<{
  created: number;
  updated: number;
  transactionsLinked: number;
  crossYearClients: number;
}> {
  const supabase = await createServiceClient();

  console.log(`[client-resolver] Starting resolution for org ${orgId}`);

  // Fetch all invoices and bills with contact info
  const { data: transactions, error: txError } = await supabase
    .from('raw_transactions')
    .select('id, contact_name, date, type, total')
    .eq('org_id', orgId)
    .in('type', ['invoice', 'bill'])
    .not('contact_name', 'is', null);

  if (txError || !transactions) {
    throw new Error(`Failed to fetch transactions: ${txError?.message}`);
  }

  console.log(`[client-resolver] Processing ${transactions.length} transactions`);

  // Group transactions by normalised contact name
  const clientMap = new Map<string, ClientRecord>();

  for (const tx of transactions) {
    const contactName = (tx as Record<string, unknown>).contact_name as string;
    if (!contactName || contactName.trim() === '') continue;

    const normalised = normaliseName(contactName);
    const txDate = (tx as Record<string, unknown>).date as string;
    const txType = (tx as Record<string, unknown>).type as string;
    const txTotal = parseFloat(String((tx as Record<string, unknown>).total ?? 0));
    const txYear = new Date(txDate).getFullYear();
    const txId = (tx as Record<string, unknown>).id as string;

    const existing = clientMap.get(normalised);

    if (existing) {
      existing.transactionCount += 1;
      existing.transactionIds.push(txId);

      if (txType === 'invoice') {
        existing.totalInvoiced += txTotal;
      }

      if (txDate < existing.firstTransactionDate) {
        existing.firstTransactionDate = txDate;
      }
      if (txDate > existing.lastTransactionDate) {
        existing.lastTransactionDate = txDate;
      }

      if (txYear < existing.firstYear) existing.firstYear = txYear;
      if (txYear > existing.latestYear) existing.latestYear = txYear;
      existing.spansMultipleYears = existing.firstYear !== existing.latestYear;

      // Determine if also a supplier
      if (txType === 'bill' && existing.clientType === 'customer') {
        existing.clientType = 'both';
      } else if (txType === 'invoice' && existing.clientType === 'supplier') {
        existing.clientType = 'both';
      }
    } else {
      clientMap.set(normalised, {
        displayName: contactName, // Keep original casing from first occurrence
        normalisedName: normalised,
        clientType: txType === 'invoice' ? 'customer' : 'supplier',
        totalInvoiced: txType === 'invoice' ? txTotal : 0,
        totalPaid: 0,
        outstandingBalance: 0,
        firstTransactionDate: txDate,
        lastTransactionDate: txDate,
        transactionCount: 1,
        firstYear: txYear,
        latestYear: txYear,
        spansMultipleYears: false,
        transactionIds: [txId],
      });
    }
  }

  console.log(`[client-resolver] Found ${clientMap.size} unique clients`);

  // Upsert clients and link transactions
  let created = 0;
  let updated = 0;
  let transactionsLinked = 0;
  let crossYearClients = 0;

  for (const client of clientMap.values()) {
    // Upsert client record
    const { data: upserted, error: upsertError } = await supabase
      .from('clients')
      .upsert(
        {
          org_id: orgId,
          display_name: client.displayName,
          normalised_name: client.normalisedName,
          client_type: client.clientType,
          total_invoiced: Math.round(client.totalInvoiced * 100) / 100,
          outstanding_balance: Math.round(client.outstandingBalance * 100) / 100,
          first_transaction_date: client.firstTransactionDate,
          last_transaction_date: client.lastTransactionDate,
          transaction_count: client.transactionCount,
          first_year: client.firstYear,
          latest_year: client.latestYear,
          spans_multiple_years: client.spansMultipleYears,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,normalised_name' }
      )
      .select('id')
      .single();

    if (upsertError) {
      console.warn(`[client-resolver] Failed to upsert client "${client.displayName}": ${upsertError.message}`);
      continue;
    }

    if (upserted) {
      created++; // Could be create or update - Supabase doesn't distinguish
      if (client.spansMultipleYears) crossYearClients++;

      // Link transactions to client
      const clientId = (upserted as Record<string, unknown>).id as string;
      for (const txId of client.transactionIds) {
        const tx = transactions.find((t) => (t as Record<string, unknown>).id === txId);
        if (!tx) continue;

        const { error: linkError } = await supabase
          .from('client_transactions')
          .upsert(
            {
              client_id: clientId,
              transaction_id: txId,
              org_id: orgId,
              transaction_date: (tx as Record<string, unknown>).date as string,
              transaction_type: (tx as Record<string, unknown>).type as string,
              amount: parseFloat(String((tx as Record<string, unknown>).total ?? 0)),
            },
            { onConflict: 'client_id,transaction_id' }
          );

        if (!linkError) transactionsLinked++;
      }
    }
  }

  console.log(`[client-resolver] Complete: ${created} clients, ${transactionsLinked} links, ${crossYearClients} cross-year`);

  return { created, updated, transactionsLinked, crossYearClients };
}

/**
 * Get client analytics summary for an org.
 */
export async function getClientAnalytics(orgId: string): Promise<{
  totalClients: number;
  activeCustomers: number;
  activeSuppliers: number;
  crossYearClients: number;
  topCustomers: Array<{
    displayName: string;
    totalInvoiced: number;
    transactionCount: number;
    spansYears: boolean;
    firstYear: number;
    latestYear: number;
  }>;
  revenueByClientType: {
    newClients: number; // First seen this year
    returningClients: number; // Seen in previous years too
  };
}> {
  const supabase = await createServiceClient();
  const currentYear = new Date().getFullYear();

  // Total clients
  const { count: totalClients } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Active customers
  const { count: activeCustomers } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('client_type', ['customer', 'both'])
    .eq('is_active', true);

  // Active suppliers
  const { count: activeSuppliers } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('client_type', ['supplier', 'both'])
    .eq('is_active', true);

  // Cross-year clients
  const { count: crossYearClients } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('spans_multiple_years', true);

  // Top 20 customers by invoiced amount
  const { data: topCustomersData } = await supabase
    .from('clients')
    .select('display_name, total_invoiced, transaction_count, spans_multiple_years, first_year, latest_year')
    .eq('org_id', orgId)
    .in('client_type', ['customer', 'both'])
    .order('total_invoiced', { ascending: false })
    .limit(20);

  const topCustomers = (topCustomersData ?? []).map((c: Record<string, unknown>) => ({
    displayName: c.display_name as string,
    totalInvoiced: c.total_invoiced as number,
    transactionCount: c.transaction_count as number,
    spansYears: c.spans_multiple_years as boolean,
    firstYear: c.first_year as number,
    latestYear: c.latest_year as number,
  }));

  // Revenue split: new vs returning clients
  const { data: newClientsData } = await supabase
    .from('clients')
    .select('total_invoiced')
    .eq('org_id', orgId)
    .in('client_type', ['customer', 'both'])
    .eq('first_year', currentYear);

  const { data: returningClientsData } = await supabase
    .from('clients')
    .select('total_invoiced')
    .eq('org_id', orgId)
    .in('client_type', ['customer', 'both'])
    .lt('first_year', currentYear)
    .eq('latest_year', currentYear);

  const newRevenue = (newClientsData ?? []).reduce(
    (sum: number, c: Record<string, unknown>) => sum + (c.total_invoiced as number || 0), 0
  );
  const returningRevenue = (returningClientsData ?? []).reduce(
    (sum: number, c: Record<string, unknown>) => sum + (c.total_invoiced as number || 0), 0
  );

  return {
    totalClients: totalClients ?? 0,
    activeCustomers: activeCustomers ?? 0,
    activeSuppliers: activeSuppliers ?? 0,
    crossYearClients: crossYearClients ?? 0,
    topCustomers,
    revenueByClientType: {
      newClients: newRevenue,
      returningClients: returningRevenue,
    },
  };
}
