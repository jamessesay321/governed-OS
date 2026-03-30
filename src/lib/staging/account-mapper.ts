import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccountInput {
  code: string;
  name: string;
}

export interface AccountMapping {
  id: string;
  org_id: string;
  source_account_code: string;
  source_account_name: string;
  target_category: string;
  target_subcategory: string | null;
  mapping_source: 'auto' | 'manual' | 'blueprint';
  confidence: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

interface LLMMappingSuggestion {
  code: string;
  category: string;
  subcategory: string | null;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Management account categories
// ---------------------------------------------------------------------------

export const CATEGORIES = {
  'Revenue': [
    'Product Sales',
    'Service Revenue',
    'Subscription Revenue',
    'Licensing Revenue',
    'Other Revenue',
  ],
  'Direct Costs': [
    'Materials',
    'Direct Staff',
    'Subcontractors',
    'Production Costs',
    'Cost of Goods Sold',
  ],
  'Overheads': [
    'Establishment',
    'Admin',
    'Marketing',
    'Legal',
    'Finance',
    'IT & Technology',
    'Insurance',
    'Travel & Entertainment',
  ],
  'Other': [
    'Depreciation',
    'Amortisation',
    'Exceptional Items',
    'Interest',
    'Tax',
  ],
} as const;

export type Category = keyof typeof CATEGORIES;

// ---------------------------------------------------------------------------
// Auto-map accounts using LLM
// ---------------------------------------------------------------------------

export async function autoMapAccounts(
  orgId: string,
  accounts: AccountInput[]
): Promise<number> {
  if (accounts.length === 0) return 0;

  const supabase = await createUntypedServiceClient();

  // Build the category reference for the prompt
  const categoryList = Object.entries(CATEGORIES)
    .map(([cat, subs]) => `${cat}: ${subs.join(', ')}`)
    .join('\n');

  const accountList = accounts
    .map((a) => `${a.code}: ${a.name}`)
    .join('\n');

  const systemPrompt = `You are a financial data mapping assistant. Your job is to map chart of accounts entries to management accounting categories.

Available categories and subcategories:
${categoryList}

Respond ONLY with valid JSON. No markdown, no explanation. Return an array of objects with these fields:
- code (string): the account code
- category (string): one of Revenue, Direct Costs, Overheads, Other
- subcategory (string or null): one of the subcategories listed above, or null if unsure
- confidence (number): 0 to 1, how confident you are in the mapping`;

  const userMessage = `Map these accounts to management categories:\n\n${accountList}`;

  let suggestions: LLMMappingSuggestion[];

  try {
    const response = await callLLM({ systemPrompt, userMessage, temperature: 0.1 });

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    suggestions = JSON.parse(jsonStr) as LLMMappingSuggestion[];
  } catch (err) {
    console.error('[ACCOUNT-MAPPER] LLM mapping failed:', err);
    throw new Error('Failed to generate account mappings via AI');
  }

  // Build a lookup from original accounts for the name
  const accountByCode = new Map<string, string>();
  for (const a of accounts) {
    accountByCode.set(a.code, a.name);
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

  // Upsert the mappings using account_id (matching DB schema)
  let mapped = 0;
  for (const suggestion of suggestions) {
    const accountName = accountByCode.get(suggestion.code);
    if (!accountName) continue;

    const accountId = accountIdByCode.get(suggestion.code);
    if (!accountId) {
      console.warn(`[ACCOUNT-MAPPER] No chart_of_accounts entry for code ${suggestion.code}`);
      continue;
    }

    // Validate category
    if (!(suggestion.category in CATEGORIES)) {
      console.warn(`[ACCOUNT-MAPPER] Invalid category "${suggestion.category}" for ${suggestion.code}`);
      continue;
    }

    const { error } = await supabase.from('account_mappings').upsert(
      {
        org_id: orgId,
        account_id: accountId,
        standard_category: suggestion.category,
        ai_confidence: suggestion.confidence,
        ai_suggested: true,
        user_confirmed: false,
        user_overridden: false,
      },
      { onConflict: 'org_id,account_id' }
    );

    if (error) {
      console.warn(`[ACCOUNT-MAPPER] Failed to upsert mapping for ${suggestion.code}: ${error.message}`);
      continue;
    }

    mapped++;
  }

  console.log(`[ACCOUNT-MAPPER] Mapped ${mapped} accounts via AI`);
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

  // Fetch the blueprint definition
  // Blueprints are stored as JSON objects with code -> category mappings
  const blueprints: Record<string, Record<string, { category: string; subcategory: string | null }>> = {
    'saas': {
      '200': { category: 'Revenue', subcategory: 'Subscription Revenue' },
      '210': { category: 'Revenue', subcategory: 'Service Revenue' },
      '400': { category: 'Direct Costs', subcategory: 'Direct Staff' },
      '410': { category: 'Direct Costs', subcategory: 'Production Costs' },
      '500': { category: 'Overheads', subcategory: 'Marketing' },
      '600': { category: 'Overheads', subcategory: 'Admin' },
      '610': { category: 'Overheads', subcategory: 'IT & Technology' },
      '700': { category: 'Other', subcategory: 'Depreciation' },
    },
    'ecommerce': {
      '200': { category: 'Revenue', subcategory: 'Product Sales' },
      '300': { category: 'Direct Costs', subcategory: 'Cost of Goods Sold' },
      '310': { category: 'Direct Costs', subcategory: 'Materials' },
      '400': { category: 'Overheads', subcategory: 'Establishment' },
      '500': { category: 'Overheads', subcategory: 'Marketing' },
      '600': { category: 'Overheads', subcategory: 'Admin' },
    },
    'professional-services': {
      '200': { category: 'Revenue', subcategory: 'Service Revenue' },
      '210': { category: 'Revenue', subcategory: 'Licensing Revenue' },
      '400': { category: 'Direct Costs', subcategory: 'Direct Staff' },
      '410': { category: 'Direct Costs', subcategory: 'Subcontractors' },
      '500': { category: 'Overheads', subcategory: 'Establishment' },
      '510': { category: 'Overheads', subcategory: 'Legal' },
      '600': { category: 'Overheads', subcategory: 'Admin' },
    },
  };

  const blueprint = blueprints[blueprintId];
  if (!blueprint) {
    throw new Error(`Unknown blueprint: ${blueprintId}`);
  }

  // Fetch existing accounts to get IDs and names
  const { data: existingAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('org_id', orgId);

  const accountByCode = new Map<string, { id: string; name: string }>();
  for (const acc of existingAccounts ?? []) {
    accountByCode.set(acc.code, { id: acc.id, name: acc.name });
  }

  let applied = 0;
  for (const [code, mapping] of Object.entries(blueprint)) {
    const account = accountByCode.get(code);
    if (!account) continue;

    const { error } = await supabase.from('account_mappings').upsert(
      {
        org_id: orgId,
        account_id: account.id,
        standard_category: mapping.category,
        ai_confidence: 0.85,
        ai_suggested: false,
        user_confirmed: false,
        user_overridden: false,
      },
      { onConflict: 'org_id,account_id' }
    );

    if (error) {
      console.warn(`[ACCOUNT-MAPPER] Blueprint mapping failed for ${code}: ${error.message}`);
      continue;
    }

    applied++;
  }

  console.log(`[ACCOUNT-MAPPER] Applied ${applied} blueprint mappings from "${blueprintId}"`);
  return applied;
}
