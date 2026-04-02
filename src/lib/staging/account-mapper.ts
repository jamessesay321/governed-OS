import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMWithUsage } from '@/lib/ai/llm';
import { governedOutput } from '@/lib/governance/checkpoint';
import {
  STANDARD_CATEGORIES,
  CATEGORY_META,
  classToDefaultCategory,
  getTaxonomyPromptContext,
  type StandardCategory,
} from '@/lib/financial/taxonomy';
import type { AccountMapping } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccountInput {
  code: string;
  name: string;
  type?: string;
  class?: string;
}

interface LLMMappingSuggestion {
  code: string;
  category: string;
  confidence: number;
  reasoning?: string;
}

export type MappingChangeSource = 'auto' | 'manual' | 'blueprint' | 'bulk_confirm';

// Re-export taxonomy for backward compatibility
export { STANDARD_CATEGORIES, CATEGORY_META };

// ---------------------------------------------------------------------------
// Mapping history (immutable audit trail)
// ---------------------------------------------------------------------------

async function logMappingChange(
  orgId: string,
  accountId: string,
  previousCategory: string | null,
  newCategory: string,
  changeSource: MappingChangeSource,
  confidence: number | null,
  reasoning: string | null,
  changedBy: string | null = null
): Promise<void> {
  const supabase = await createUntypedServiceClient();
  const { error } = await supabase.from('account_mapping_history').insert({
    org_id: orgId,
    account_id: accountId,
    previous_category: previousCategory,
    new_category: newCategory,
    changed_by: changedBy,
    change_source: changeSource,
    confidence,
    reasoning,
  });
  if (error) {
    console.warn(`[ACCOUNT-MAPPER] Failed to log mapping history: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Auto-map accounts using LLM
// ---------------------------------------------------------------------------

export async function autoMapAccounts(
  orgId: string,
  accounts: AccountInput[]
): Promise<number> {
  if (accounts.length === 0) return 0;

  const supabase = await createUntypedServiceClient();

  // Build taxonomy context for the prompt
  const taxonomyContext = getTaxonomyPromptContext();

  const accountList = accounts
    .map((a) => {
      const parts = [`${a.code}: ${a.name}`];
      if (a.type) parts.push(`(type: ${a.type})`);
      if (a.class) parts.push(`(class: ${a.class})`);
      return parts.join(' ');
    })
    .join('\n');

  const systemPrompt = `You are the Grove account mapping engine. Map Xero chart of accounts entries to standard financial categories.

${taxonomyContext}

Rules:
- Map each account to exactly ONE standard category key (e.g. "revenue", "employee_costs")
- Use the account code, name, type, and class to determine the best match
- UK accounting conventions apply
- Assign confidence 0-1 (1 = certain)
- Provide brief reasoning for each mapping

Respond ONLY with valid JSON array. No markdown, no explanation.
Schema: [{ "code": "string", "category": "string", "confidence": number, "reasoning": "string" }]`;

  const userMessage = `Map these Xero accounts:\n\n${accountList}`;

  let suggestions: LLMMappingSuggestion[];

  try {
    const llmResult = await callLLMWithUsage({ systemPrompt, userMessage, temperature: 0.1, model: 'haiku' });

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = llmResult.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in LLM response');
    const parsed = JSON.parse(jsonMatch[0]) as LLMMappingSuggestion[];

    // Validate categories against the unified taxonomy
    suggestions = parsed.map((s) => ({
      ...s,
      category: (STANDARD_CATEGORIES as readonly string[]).includes(s.category)
        ? s.category
        : classToDefaultCategory(
            accounts.find((a) => a.code === s.code)?.class ?? 'EXPENSE'
          ),
    }));

    // Governance checkpoint — audit trail for account mapping
    await governedOutput({
      orgId,
      outputType: 'account_mapping',
      content: JSON.stringify(suggestions),
      modelTier: 'haiku',
      modelId: 'claude-haiku-4-20250414',
      dataSources: [
        { type: 'chart_of_accounts', reference: `${accounts.length} accounts` },
      ],
      tokensUsed: llmResult.inputTokens + llmResult.outputTokens,
      cached: false,
    });
  } catch (err) {
    console.error('[ACCOUNT-MAPPER] LLM mapping failed, using heuristic fallback:', err);
    // Fallback: map by Xero class heuristic
    suggestions = accounts.map((a) => ({
      code: a.code,
      category: classToDefaultCategory(a.class ?? 'EXPENSE'),
      confidence: 0.3,
      reasoning: 'AI mapping failed, using class-based heuristic',
    }));
  }

  // Look up account IDs from chart_of_accounts by code
  const { data: chartAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code')
    .eq('org_id', orgId);

  const accountIdByCode = new Map<string, string>();
  for (const acc of chartAccounts ?? []) {
    accountIdByCode.set(acc.code, acc.id);
  }

  // Fetch existing mappings so we can log previous_category in history
  const { data: existingMappings } = await supabase
    .from('account_mappings')
    .select('account_id, standard_category')
    .eq('org_id', orgId);

  const previousCategoryByAccountId = new Map<string, string>();
  for (const m of existingMappings ?? []) {
    previousCategoryByAccountId.set(m.account_id, m.standard_category);
  }

  // Upsert the mappings
  let mapped = 0;
  for (const suggestion of suggestions) {
    const accountId = accountIdByCode.get(suggestion.code);
    if (!accountId) {
      console.warn(`[ACCOUNT-MAPPER] No chart_of_accounts entry for code ${suggestion.code}`);
      continue;
    }

    const previousCategory = previousCategoryByAccountId.get(accountId) ?? null;

    const { error } = await supabase.from('account_mappings').upsert(
      {
        org_id: orgId,
        account_id: accountId,
        standard_category: suggestion.category,
        ai_confidence: suggestion.confidence,
        ai_suggested: true,
        ai_reasoning: suggestion.reasoning ?? null,
        user_confirmed: false,
        user_overridden: false,
      },
      { onConflict: 'org_id,account_id' }
    );

    if (error) {
      console.warn(`[ACCOUNT-MAPPER] Failed to upsert mapping for ${suggestion.code}: ${error.message}`);
      continue;
    }

    // Log to immutable history
    await logMappingChange(
      orgId,
      accountId,
      previousCategory,
      suggestion.category,
      'auto',
      suggestion.confidence,
      suggestion.reasoning ?? null
    );

    mapped++;
  }

  console.log(`[ACCOUNT-MAPPER] Mapped ${mapped}/${accounts.length} accounts via AI`);
  return mapped;
}

// ---------------------------------------------------------------------------
// Get current account mappings
// ---------------------------------------------------------------------------

export async function getAccountMappings(orgId: string): Promise<AccountMapping[]> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('account_mappings')
    .select('*')
    .eq('org_id', orgId)
    .order('source_account_code', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch account mappings: ${error.message}`);
  }

  return (data ?? []) as AccountMapping[];
}

// ---------------------------------------------------------------------------
// Mark a mapping as manually verified
// ---------------------------------------------------------------------------

export async function verifyMapping(
  orgId: string,
  mappingId: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('account_mappings')
    .update({ verified: true })
    .eq('id', mappingId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(`Failed to verify mapping: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Apply industry blueprint mappings
// ---------------------------------------------------------------------------

export async function applyBlueprintMappings(
  orgId: string,
  blueprintId: string
): Promise<number> {
  const supabase = await createUntypedServiceClient();

  // Industry blueprints using unified StandardCategory taxonomy
  const blueprints: Record<string, Record<string, StandardCategory>> = {
    'saas': {
      '200': 'revenue',
      '210': 'revenue',
      '400': 'cost_of_sales',
      '410': 'cost_of_sales',
      '500': 'marketing_and_advertising',
      '600': 'office_and_admin',
      '610': 'technology_and_software',
      '700': 'depreciation_and_amortisation',
      '710': 'employee_costs',
      '720': 'rent_and_occupancy',
      '730': 'professional_fees',
    },
    'ecommerce': {
      '200': 'revenue',
      '300': 'cost_of_sales',
      '310': 'cost_of_sales',
      '400': 'rent_and_occupancy',
      '500': 'marketing_and_advertising',
      '600': 'office_and_admin',
      '610': 'technology_and_software',
      '700': 'employee_costs',
    },
    'professional-services': {
      '200': 'revenue',
      '210': 'revenue',
      '400': 'employee_costs',
      '410': 'cost_of_sales',
      '500': 'rent_and_occupancy',
      '510': 'professional_fees',
      '600': 'office_and_admin',
      '610': 'technology_and_software',
    },
  };

  const blueprint = blueprints[blueprintId];
  if (!blueprint) {
    throw new Error(`Unknown blueprint: ${blueprintId}`);
  }

  // Fetch existing accounts to get IDs
  const { data: existingAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('org_id', orgId);

  const accountByCode = new Map<string, { id: string; name: string }>();
  for (const acc of existingAccounts ?? []) {
    accountByCode.set(acc.code, { id: acc.id, name: acc.name });
  }

  // Fetch existing mappings for history tracking
  const { data: existingMappings } = await supabase
    .from('account_mappings')
    .select('account_id, standard_category')
    .eq('org_id', orgId);

  const previousCategoryByAccountId = new Map<string, string>();
  for (const m of existingMappings ?? []) {
    previousCategoryByAccountId.set(m.account_id, m.standard_category);
  }

  let applied = 0;
  for (const [code, category] of Object.entries(blueprint)) {
    const account = accountByCode.get(code);
    if (!account) continue;

    const previousCategory = previousCategoryByAccountId.get(account.id) ?? null;

    const { error } = await supabase.from('account_mappings').upsert(
      {
        org_id: orgId,
        account_id: account.id,
        standard_category: category,
        ai_confidence: 0.85,
        ai_suggested: false,
        ai_reasoning: `Blueprint mapping (${blueprintId})`,
        user_confirmed: false,
        user_overridden: false,
      },
      { onConflict: 'org_id,account_id' }
    );

    if (error) {
      console.warn(`[ACCOUNT-MAPPER] Blueprint mapping failed for ${code}: ${error.message}`);
      continue;
    }

    // Log to immutable history
    await logMappingChange(
      orgId,
      account.id,
      previousCategory,
      category,
      'blueprint',
      0.85,
      `Blueprint mapping (${blueprintId})`
    );

    applied++;
  }

  console.log(`[ACCOUNT-MAPPER] Applied ${applied} blueprint mappings from "${blueprintId}"`);
  return applied;
}
