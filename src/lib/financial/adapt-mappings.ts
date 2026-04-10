import type { ChartOfAccount, AccountMapping } from '@/types';

/**
 * Adapt raw DB rows to the AccountMapping interface expected by buildSemanticPnL.
 *
 * Handles TWO possible schemas:
 *
 * 1. Migration 014 (data_staging.sql): columns `source_account_code`, `target_category`
 *    - Stores mappings by account code; requires code→UUID resolution
 *
 * 2. Migration 006 (uk_tax_engine.sql) + auto-mapper PUT: columns `account_id`, `standard_category`
 *    - Stores mappings by account UUID directly
 *
 * The adapter auto-detects which schema each row uses and handles both,
 * so the system works regardless of whether mappings were created by the
 * auto-mapper (new schema) or data staging (old schema).
 *
 * DETERMINISTIC - pure function, no side effects.
 */
export function adaptMappingsFromDB(
  rawMappings: Array<Record<string, unknown>>,
  accounts: ChartOfAccount[],
  orgId: string
): AccountMapping[] {
  // Build account lookups
  const accountByCode = new Map<string, ChartOfAccount[]>();
  const accountById = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountById.set(acc.id, acc);
    if (acc.code) {
      const existing = accountByCode.get(acc.code) ?? [];
      existing.push(acc);
      accountByCode.set(acc.code, existing);
    }
  }

  // Track which account IDs already have mappings (to avoid duplicates)
  const seen = new Set<string>();
  const mappings: AccountMapping[] = [];

  for (const rm of rawMappings) {
    // ── Detect schema: new schema has account_id + standard_category ──
    const hasNewSchema = rm.account_id && rm.standard_category;
    const hasOldSchema = rm.source_account_code && rm.target_category;

    if (hasNewSchema) {
      // New schema (migration 006 / auto-mapper): direct UUID mapping
      const accountId = String(rm.account_id);
      const category = String(rm.standard_category);
      if (!accountId || !category || seen.has(accountId)) continue;
      seen.add(accountId);

      mappings.push({
        id: String(rm.id ?? accountId),
        org_id: orgId,
        account_id: accountId,
        standard_category: category,
        ai_confidence: typeof rm.ai_confidence === 'number' ? rm.ai_confidence : 0.8,
        ai_suggested: rm.ai_suggested === true || rm.ai_suggested === 'true',
        user_confirmed: rm.user_confirmed === true,
        user_overridden: rm.user_overridden === true,
        created_at: String(rm.created_at ?? ''),
        updated_at: String(rm.updated_at ?? ''),
      });
    } else if (hasOldSchema) {
      // Old schema (migration 014): code-based mapping, resolve to UUID(s)
      const code = String(rm.source_account_code);
      const category = String(rm.target_category);
      if (!code || !category) continue;

      // Try to match by code first, then by UUID in the code field
      const matchedAccounts = accountByCode.get(code) ?? [];
      const directMatch = accountById.get(code);

      const targets = matchedAccounts.length > 0
        ? matchedAccounts
        : directMatch
          ? [directMatch]
          : [];

      for (const acc of targets) {
        if (seen.has(acc.id)) continue;
        seen.add(acc.id);
        mappings.push({
          id: acc.id,
          org_id: orgId,
          account_id: acc.id,
          standard_category: category,
          ai_confidence: typeof rm.confidence === 'number' ? rm.confidence : 0.8,
          ai_suggested: true,
          user_confirmed: rm.verified === true,
          user_overridden: false,
          created_at: String(rm.created_at ?? ''),
          updated_at: String(rm.updated_at ?? ''),
        });
      }
    }
  }

  return mappings;
}
