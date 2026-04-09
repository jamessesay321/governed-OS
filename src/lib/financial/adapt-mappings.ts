import type { ChartOfAccount, AccountMapping } from '@/types';

/**
 * Adapt raw DB rows from migration-014 schema (source_account_code, target_category)
 * to the AccountMapping interface expected by buildSemanticPnL (account_id, standard_category).
 *
 * Migration 014 stores mappings by account code, but buildSemanticPnL looks up by UUID.
 * This adapter resolves codes → UUIDs using chart_of_accounts, supporting:
 *   - Normal accounts (code → UUID)
 *   - Codeless accounts (UUID stored as source_account_code)
 *   - Duplicate codes (same category applied to all accounts with that code)
 *
 * DETERMINISTIC - pure function, no side effects.
 */
export function adaptMappingsFromDB(
  rawMappings: Array<Record<string, unknown>>,
  accounts: ChartOfAccount[],
  orgId: string
): AccountMapping[] {
  // Build code→category and uuid→category lookups
  const codeToCategory = new Map<string, string>();
  for (const rm of rawMappings) {
    const code = String(rm.source_account_code ?? '');
    const category = String(rm.target_category ?? '');
    if (code && category) {
      codeToCategory.set(code, category);
    }
  }

  // Resolve each account to an AccountMapping-compatible object
  const mappings: AccountMapping[] = [];
  for (const acc of accounts) {
    const category = codeToCategory.get(acc.code) ?? codeToCategory.get(acc.id);
    if (category) {
      mappings.push({
        id: acc.id,
        org_id: orgId,
        account_id: acc.id,
        standard_category: category,
        ai_confidence: 0.8,
        ai_suggested: true,
        user_confirmed: false,
        user_overridden: false,
        created_at: '',
        updated_at: '',
      });
    }
  }

  return mappings;
}
