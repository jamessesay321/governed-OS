/**
 * Cross-Source Reconciliation
 *
 * Connects data from different integration sources, matches transactions,
 * identifies gaps, and generates reconciliation reports.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { getConnectedIntegrations } from './framework';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReconciliationResult {
  period: string;
  sources: { name: string; total: number; recordCount: number }[];
  matches: {
    description: string;
    source1Amount: number;
    source2Amount: number;
    difference: number;
    status: 'matched' | 'minor_gap' | 'significant_gap';
  }[];
  unmatched: {
    source: string;
    description: string;
    amount: number;
    possibleMatch?: string;
  }[];
  coverage: number;
  summary: string;
}

interface TransactionRecord {
  id: string;
  source: string;
  sourceId: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
  contactName: string;
}

// ---------------------------------------------------------------------------
// Core reconciliation
// ---------------------------------------------------------------------------

/**
 * For a given period, pull totals from each connected source,
 * compare them, and identify gaps.
 */
export async function reconcilePeriod(
  orgId: string,
  period: string
): Promise<ReconciliationResult> {
  const supabase = await createUntypedServiceClient();

  // Get all staged transactions for this period
  const periodStart = `${period}-01`;
  const periodYear = parseInt(period.split('-')[0]);
  const periodMonth = parseInt(period.split('-')[1]);
  const nextMonth = periodMonth === 12 ? 1 : periodMonth + 1;
  const nextYear = periodMonth === 12 ? periodYear + 1 : periodYear;
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const { data: stagedData } = await supabase
    .from('staged_transactions')
    .select('id, source, source_id, raw_data, created_at')
    .eq('org_id', orgId)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd);

  // Also get normalised financials for the period
  const { data: normData } = await supabase
    .from('normalised_financials')
    .select('amount, source')
    .eq('org_id', orgId)
    .eq('period', periodStart);

  // Build transaction records from staged data
  const transactions: TransactionRecord[] = (stagedData ?? []).map((row) => {
    const raw = row.raw_data as Record<string, unknown>;
    return {
      id: row.id as string,
      source: row.source as string,
      sourceId: row.source_id as string,
      date: (raw.date as string) ?? '',
      amount: Number(raw.amount) || 0,
      description: (raw.description as string) ?? '',
      reference: (raw.reference as string) ?? '',
      contactName: (raw.contact_name as string) ?? '',
    };
  });

  // Group by source
  const bySource = new Map<string, TransactionRecord[]>();
  for (const tx of transactions) {
    const list = bySource.get(tx.source) ?? [];
    list.push(tx);
    bySource.set(tx.source, list);
  }

  // Also include normalised financial totals by source
  const normBySource = new Map<string, number>();
  for (const row of normData ?? []) {
    const src = row.source as string;
    normBySource.set(src, (normBySource.get(src) ?? 0) + Number(row.amount));
  }

  // Build source summaries
  const sources: ReconciliationResult['sources'] = [];
  const allSourceNames = new Set([...bySource.keys(), ...normBySource.keys()]);
  for (const name of allSourceNames) {
    const stagedTxs = bySource.get(name) ?? [];
    const stagedTotal = stagedTxs.reduce((s, t) => s + t.amount, 0);
    const normTotal = normBySource.get(name) ?? 0;
    const total = normTotal || stagedTotal;

    sources.push({
      name,
      total: Math.round(total * 100) / 100,
      recordCount: stagedTxs.length || (normTotal ? 1 : 0),
    });
  }

  // Cross-match transactions between sources
  const sourceNames = Array.from(bySource.keys());
  const matches: ReconciliationResult['matches'] = [];
  const matchedIds = new Set<string>();
  const unmatched: ReconciliationResult['unmatched'] = [];

  for (let i = 0; i < sourceNames.length; i++) {
    for (let j = i + 1; j < sourceNames.length; j++) {
      const listA = bySource.get(sourceNames[i]) ?? [];
      const listB = bySource.get(sourceNames[j]) ?? [];

      const matchResult = findMatches(listA, listB);

      for (const m of matchResult.matched) {
        matchedIds.add(m.txA.id);
        matchedIds.add(m.txB.id);

        const diff = Math.abs(m.txA.amount - m.txB.amount);
        const pctDiff =
          m.txA.amount !== 0
            ? (diff / Math.abs(m.txA.amount)) * 100
            : 0;

        matches.push({
          description: m.txA.description || m.txA.reference || `${m.txA.source} / ${m.txB.source}`,
          source1Amount: Math.round(m.txA.amount * 100) / 100,
          source2Amount: Math.round(m.txB.amount * 100) / 100,
          difference: Math.round(diff * 100) / 100,
          status: pctDiff < 1 ? 'matched' : pctDiff < 5 ? 'minor_gap' : 'significant_gap',
        });
      }

      for (const u of matchResult.unmatchedA) {
        if (!matchedIds.has(u.id)) {
          unmatched.push({
            source: u.source,
            description: u.description || u.reference,
            amount: Math.round(u.amount * 100) / 100,
            possibleMatch: undefined,
          });
        }
      }

      for (const u of matchResult.unmatchedB) {
        if (!matchedIds.has(u.id)) {
          unmatched.push({
            source: u.source,
            description: u.description || u.reference,
            amount: Math.round(u.amount * 100) / 100,
            possibleMatch: undefined,
          });
        }
      }
    }
  }

  // Calculate coverage
  const totalRecords = transactions.length;
  const matchedCount = matchedIds.size;
  const coverage = totalRecords > 0 ? Math.round((matchedCount / totalRecords) * 100) : 0;

  // Generate summary
  const summary = buildReconciliationSummary(period, sources, matches, unmatched, coverage);

  return {
    period,
    sources,
    matches,
    unmatched,
    coverage,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Matching engine
// ---------------------------------------------------------------------------

interface MatchResult {
  matched: { txA: TransactionRecord; txB: TransactionRecord; confidence: number }[];
  unmatchedA: TransactionRecord[];
  unmatchedB: TransactionRecord[];
}

/**
 * Fuzzy matching by date + amount + description between two transaction lists.
 */
export function findMatches(
  listA: TransactionRecord[],
  listB: TransactionRecord[]
): MatchResult {
  const matched: MatchResult['matched'] = [];
  const usedB = new Set<number>();

  for (const txA of listA) {
    let bestMatch: { idx: number; confidence: number } | null = null;

    for (let j = 0; j < listB.length; j++) {
      if (usedB.has(j)) continue;

      const txB = listB[j];
      const confidence = calculateMatchScore(txA, txB);

      if (confidence >= 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { idx: j, confidence };
      }
    }

    if (bestMatch) {
      usedB.add(bestMatch.idx);
      matched.push({
        txA,
        txB: listB[bestMatch.idx],
        confidence: bestMatch.confidence,
      });
    }
  }

  const unmatchedA = listA.filter(
    (tx) => !matched.some((m) => m.txA.id === tx.id)
  );
  const unmatchedB = listB.filter((_, idx) => !usedB.has(idx));

  return { matched, unmatchedA, unmatchedB };
}

/**
 * Calculate a match confidence score between two transactions.
 */
function calculateMatchScore(a: TransactionRecord, b: TransactionRecord): number {
  let score = 0;
  let factors = 0;

  // Date match
  if (a.date && b.date) {
    factors++;
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);

    if (dayDiff === 0) score += 1;
    else if (dayDiff <= 1) score += 0.8;
    else if (dayDiff <= 3) score += 0.4;
  }

  // Amount match
  if (a.amount !== 0 || b.amount !== 0) {
    factors++;
    if (a.amount === b.amount) {
      score += 1;
    } else if (a.amount !== 0) {
      const pctDiff = Math.abs(a.amount - b.amount) / Math.abs(a.amount);
      if (pctDiff <= 0.01) score += 0.9;
      else if (pctDiff <= 0.05) score += 0.5;
    }
  }

  // Reference match
  if (a.reference && b.reference) {
    factors++;
    const refA = a.reference.toLowerCase().trim();
    const refB = b.reference.toLowerCase().trim();

    if (refA === refB) score += 1;
    else if (refA.includes(refB) || refB.includes(refA)) score += 0.7;
  }

  // Contact name match
  if (a.contactName && b.contactName) {
    factors++;
    const nameA = a.contactName.toLowerCase().trim();
    const nameB = b.contactName.toLowerCase().trim();

    if (nameA === nameB) score += 1;
    else if (nameA.includes(nameB) || nameB.includes(nameA)) score += 0.6;
  }

  if (factors === 0) return 0;
  return Math.round((score / factors) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Summary generation
// ---------------------------------------------------------------------------

function buildReconciliationSummary(
  period: string,
  sources: ReconciliationResult['sources'],
  matches: ReconciliationResult['matches'],
  unmatched: ReconciliationResult['unmatched'],
  coverage: number
): string {
  const parts: string[] = [];

  parts.push(`Reconciliation for ${period}:`);

  if (sources.length === 0) {
    return 'No data sources found for this period.';
  }

  parts.push(
    `${sources.length} source(s): ${sources.map((s) => `${s.name} (${s.recordCount} records, total ${s.total.toFixed(2)})`).join(', ')}.`
  );

  const matchedCount = matches.filter((m) => m.status === 'matched').length;
  const gapCount = matches.filter((m) => m.status !== 'matched').length;

  parts.push(`${matches.length} cross-source matches found (${matchedCount} exact, ${gapCount} with gaps).`);

  if (unmatched.length > 0) {
    parts.push(`${unmatched.length} unmatched transaction(s) across sources.`);
  }

  parts.push(`Coverage: ${coverage}%.`);

  if (coverage >= 90) {
    parts.push('Excellent data coverage across sources.');
  } else if (coverage >= 70) {
    parts.push('Good coverage. Some transactions remain unmatched — review recommended.');
  } else {
    parts.push('Low coverage — significant unmatched transactions. Manual review required.');
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Full reconciliation report with AI explanation
// ---------------------------------------------------------------------------

/**
 * Generate a full reconciliation report for a period with AI-powered explanation.
 */
export async function generateReconciliationReport(
  orgId: string,
  period: string
): Promise<ReconciliationResult> {
  const result = await reconcilePeriod(orgId, period);

  // Enhance summary with AI if there are meaningful results
  if (result.sources.length >= 2 && (result.matches.length > 0 || result.unmatched.length > 0)) {
    try {
      const { response } = await callLLMCached({
        orgId,
        systemPrompt: `You are a financial reconciliation analyst. Given reconciliation data between multiple data sources, provide a concise 2-3 sentence explanation of the results. Focus on:
1. Whether the data sources agree
2. Any significant gaps and their likely causes
3. What action (if any) is recommended

Be specific about numbers and percentages. Keep it professional and concise.`,
        userMessage: JSON.stringify({
          period: result.period,
          sources: result.sources,
          matchCount: result.matches.length,
          unmatchedCount: result.unmatched.length,
          coverage: result.coverage,
          significantGaps: result.matches.filter((m) => m.status === 'significant_gap'),
        }),
        cacheTTLMinutes: 60,
      });

      result.summary = response;
    } catch (err) {
      console.warn('[RECONCILER] AI summary generation failed, using default:', err);
    }
  }

  return result;
}
