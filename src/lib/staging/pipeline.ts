import { createUntypedServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawTransaction {
  source_id: string;
  date: string;
  amount: number;
  reference?: string;
  contact_name?: string;
  description?: string;
  line_items?: unknown[];
  [key: string]: unknown;
}

export interface StagedTransaction {
  id: string;
  org_id: string;
  source: string;
  source_id: string;
  raw_data: Record<string, unknown>;
  status: 'pending' | 'matched' | 'conflict' | 'approved' | 'rejected';
  confidence_score: number;
  matched_with: { source: string; source_id: string }[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MatchCandidate {
  id: string;
  source: string;
  source_id: string;
  raw_data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Stage incoming transactions into the waiting room
// ---------------------------------------------------------------------------

export async function stageTransactions(
  orgId: string,
  source: string,
  transactions: RawTransaction[]
): Promise<number> {
  const supabase = await createUntypedServiceClient();

  const rows = transactions.map((tx) => ({
    org_id: orgId,
    source,
    source_id: tx.source_id,
    raw_data: tx,
    status: 'pending',
    confidence_score: 0,
    matched_with: [],
  }));

  // Upsert to handle re-syncs gracefully
  const { data, error } = await supabase
    .from('staged_transactions')
    .upsert(rows, { onConflict: 'org_id,source,source_id' })
    .select('id');

  if (error) {
    throw new Error(`Failed to stage transactions: ${error.message}`);
  }

  console.log(`[STAGING] Staged ${data?.length ?? 0} transactions from ${source}`);
  return data?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Attempt to match pending transactions across sources
// ---------------------------------------------------------------------------

export async function matchStagedTransactions(orgId: string): Promise<number> {
  const supabase = await createUntypedServiceClient();

  // Fetch all pending transactions
  const { data: pending, error: fetchErr } = await supabase
    .from('staged_transactions')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending');

  if (fetchErr || !pending) {
    throw new Error(`Failed to fetch pending transactions: ${fetchErr?.message}`);
  }

  if (pending.length === 0) return 0;

  // Group by source for cross-matching
  const bySource = new Map<string, MatchCandidate[]>();
  for (const tx of pending) {
    const list = bySource.get(tx.source) ?? [];
    list.push({
      id: tx.id,
      source: tx.source,
      source_id: tx.source_id,
      raw_data: tx.raw_data as Record<string, unknown>,
    });
    bySource.set(tx.source, list);
  }

  const sources = Array.from(bySource.keys());
  if (sources.length < 2) {
    // Need at least two sources to cross-match
    return 0;
  }

  let matchCount = 0;

  // Compare each pair of sources
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const listA = bySource.get(sources[i]) ?? [];
      const listB = bySource.get(sources[j]) ?? [];

      for (const txA of listA) {
        for (const txB of listB) {
          const confidence = calculateMatchConfidence(txA.raw_data, txB.raw_data);

          if (confidence >= 0.5) {
            // Update both transactions with match info
            const matchedWithA = [{ source: txB.source, source_id: txB.source_id }];
            const matchedWithB = [{ source: txA.source, source_id: txA.source_id }];
            const status = confidence >= 0.9 ? 'matched' : 'conflict';

            await supabase
              .from('staged_transactions')
              .update({
                status,
                confidence_score: confidence,
                matched_with: matchedWithA,
              })
              .eq('id', txA.id);

            await supabase
              .from('staged_transactions')
              .update({
                status,
                confidence_score: confidence,
                matched_with: matchedWithB,
              })
              .eq('id', txB.id);

            matchCount++;
          }
        }
      }
    }
  }

  console.log(`[STAGING] Matched ${matchCount} transaction pairs`);
  return matchCount;
}

// ---------------------------------------------------------------------------
// Approve a staged transaction
// ---------------------------------------------------------------------------

export async function approveTransaction(
  orgId: string,
  transactionId: string,
  userId: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('staged_transactions')
    .update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(`Failed to approve transaction: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Reject a staged transaction
// ---------------------------------------------------------------------------

export async function rejectTransaction(
  orgId: string,
  transactionId: string,
  userId: string,
  reason: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('staged_transactions')
    .update({
      status: 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      notes: reason,
    })
    .eq('id', transactionId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(`Failed to reject transaction: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Promote all approved transactions to normalised_financials
// ---------------------------------------------------------------------------

export async function promoteStagedToLive(orgId: string): Promise<number> {
  const supabase = await createUntypedServiceClient();

  // Fetch all approved staged transactions
  const { data: approved, error: fetchErr } = await supabase
    .from('staged_transactions')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'approved');

  if (fetchErr || !approved) {
    throw new Error(`Failed to fetch approved transactions: ${fetchErr?.message}`);
  }

  if (approved.length === 0) return 0;

  let promoted = 0;

  for (const tx of approved) {
    const rawData = tx.raw_data as Record<string, unknown>;
    const date = rawData.date as string;
    const amount = rawData.amount as number;

    if (!date || amount === undefined) {
      console.warn(`[STAGING] Skipping tx ${tx.id}: missing date or amount`);
      continue;
    }

    // Convert date to month-start for normalised_financials period
    const d = new Date(date);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

    // Insert into normalised_financials
    const { error: insertErr } = await supabase.from('normalised_financials').upsert(
      {
        org_id: orgId,
        period,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        transaction_count: 1,
        source: tx.source,
      },
      { onConflict: 'org_id,period,account_id' }
    );

    if (insertErr) {
      console.warn(`[STAGING] Failed to promote tx ${tx.id}: ${insertErr.message}`);
      continue;
    }

    promoted++;
  }

  // Mark promoted transactions so they are not re-promoted
  if (promoted > 0) {
    const promotedIds = approved.slice(0, promoted).map((t) => t.id);
    await supabase
      .from('staged_transactions')
      .update({ notes: 'promoted_to_live' })
      .in('id', promotedIds);
  }

  console.log(`[STAGING] Promoted ${promoted} transactions to live`);
  return promoted;
}

// ---------------------------------------------------------------------------
// Match confidence calculation (pure function)
// ---------------------------------------------------------------------------

function calculateMatchConfidence(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  let score = 0;
  let factors = 0;

  // Date match (exact date or within 1 day)
  if (a.date && b.date) {
    factors++;
    const dateA = new Date(a.date as string).getTime();
    const dateB = new Date(b.date as string).getTime();
    const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);

    if (dayDiff === 0) score += 1;
    else if (dayDiff <= 1) score += 0.8;
    else if (dayDiff <= 3) score += 0.4;
  }

  // Amount match (exact or within 1%)
  if (a.amount !== undefined && b.amount !== undefined) {
    factors++;
    const amtA = Number(a.amount);
    const amtB = Number(b.amount);

    if (amtA === amtB) {
      score += 1;
    } else if (amtA !== 0) {
      const pctDiff = Math.abs(amtA - amtB) / Math.abs(amtA);
      if (pctDiff <= 0.01) score += 0.9;
      else if (pctDiff <= 0.05) score += 0.5;
    }
  }

  // Reference match (partial string match)
  if (a.reference && b.reference) {
    factors++;
    const refA = String(a.reference).toLowerCase().trim();
    const refB = String(b.reference).toLowerCase().trim();

    if (refA === refB) score += 1;
    else if (refA.includes(refB) || refB.includes(refA)) score += 0.7;
  }

  // Contact name match
  if (a.contact_name && b.contact_name) {
    factors++;
    const nameA = String(a.contact_name).toLowerCase().trim();
    const nameB = String(b.contact_name).toLowerCase().trim();

    if (nameA === nameB) score += 1;
    else if (nameA.includes(nameB) || nameB.includes(nameA)) score += 0.6;
  }

  if (factors === 0) return 0;
  return Math.round((score / factors) * 100) / 100;
}
