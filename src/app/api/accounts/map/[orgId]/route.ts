import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { logAudit } from '@/lib/audit/log';
import type { ChartOfAccount } from '@/types';
import { z } from 'zod';

/**
 * Standard categories for account mapping.
 * These align with the KPI engine's expectations and P&L structure.
 */
const STANDARD_CATEGORIES = [
  'revenue',
  'cost_of_sales',
  'employee_costs',
  'rent_and_occupancy',
  'marketing_and_advertising',
  'technology_and_software',
  'professional_fees',
  'travel_and_entertainment',
  'depreciation_and_amortisation',
  'interest_and_finance',
  'insurance',
  'utilities',
  'office_and_admin',
  'other_income',
  'other_expense',
  'tax',
  'bank_and_cash',
  'accounts_receivable',
  'accounts_payable',
  'fixed_assets',
  'equity',
  'other_current_asset',
  'other_current_liability',
  'other_non_current_asset',
  'other_non_current_liability',
] as const;

const confirmSchema = z.object({
  mappings: z.array(
    z.object({
      account_id: z.string().uuid(),
      standard_category: z.enum(STANDARD_CATEGORIES as unknown as [string, ...string[]]),
    })
  ),
});

/**
 * GET /api/accounts/map/[orgId]
 * Get current account mappings, or generate AI suggestions if none exist.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();
    // TODO: Remove untyped client after regenerating Supabase types with account_mappings table
    const untypedDb = await createUntypedServiceClient();

    // Fetch existing mappings (table not yet in generated types)
    const { data: mappings } = await untypedDb
      .from('account_mappings')
      .select('*')
      .eq('org_id', orgId);

    // Fetch chart of accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('org_id', orgId);

    const accs = (accounts ?? []) as ChartOfAccount[];
    const existingMappings = (mappings ?? []) as Record<string, unknown>[];

    // If we have mappings for all accounts, return them
    const mappedAccountIds = new Set(existingMappings.map((m) => m.account_id));
    const unmappedAccounts = accs.filter((a) => !mappedAccountIds.has(a.id));

    if (unmappedAccounts.length === 0) {
      return NextResponse.json({
        mappings: existingMappings,
        unmappedCount: 0,
        categories: STANDARD_CATEGORIES,
      });
    }

    // Rate limit + budget checks
    const rateCheck = checkRateLimit(orgId, 'accounts-map');
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      );
    }

    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted. Upgrade your plan for more.' },
        { status: 402 }
      );
    }

    // Generate AI suggestions for unmapped accounts
    const suggestions = await generateMappingSuggestions(unmappedAccounts, orgId);

    return NextResponse.json({
      mappings: existingMappings,
      suggestions,
      unmappedCount: unmappedAccounts.length,
      categories: STANDARD_CATEGORIES,
    });
  } catch (err) {
    console.error('[ACCOUNT_MAP] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch account mappings' }, { status: 500 });
  }
}

/**
 * POST /api/accounts/map/[orgId]
 * Confirm AI-suggested mappings or submit manual overrides.
 * Requires admin role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const untypedDb = await createUntypedServiceClient();

    // Upsert each mapping (table not yet in generated types)
    const results = [];
    for (const mapping of parsed.data.mappings) {
      const { data, error } = await untypedDb
        .from('account_mappings')
        .upsert(
          {
            org_id: orgId,
            account_id: mapping.account_id,
            standard_category: mapping.standard_category,
            user_confirmed: true,
            user_overridden: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'org_id,account_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('[ACCOUNT_MAP] Upsert error:', error);
      } else {
        results.push(data);
      }
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'account_mappings.confirmed',
      entityType: 'account_mappings',
      entityId: orgId,
      metadata: { count: results.length },
    });

    return NextResponse.json({ mappings: results, confirmed: results.length });
  } catch (err) {
    console.error('[ACCOUNT_MAP] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to save account mappings' }, { status: 500 });
  }
}

/**
 * PUT /api/accounts/map/[orgId]
 * Auto-map all unmapped accounts using Claude AI.
 * Requires admin role. Saves suggestions to DB (unconfirmed).
 */
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();
    const untypedDb = await createUntypedServiceClient();

    // Fetch chart of accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('org_id', orgId);

    const accs = (accounts ?? []) as ChartOfAccount[];

    if (accs.length === 0) {
      return NextResponse.json({ error: 'No accounts to map. Sync Xero first.' }, { status: 400 });
    }

    // Fetch existing mappings to find unmapped (table not yet in generated types)
    const { data: existingMappings } = await untypedDb
      .from('account_mappings')
      .select('account_id')
      .eq('org_id', orgId);

    const mappedIds = new Set(
      ((existingMappings ?? []) as { account_id: string }[]).map((m) => m.account_id)
    );
    const unmapped = accs.filter((a) => !mappedIds.has(a.id));

    if (unmapped.length === 0) {
      return NextResponse.json({ message: 'All accounts already mapped', mapped: 0 });
    }

    // Rate limit + budget checks
    const rateCheck = checkRateLimit(orgId, 'accounts-map');
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      );
    }

    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted. Upgrade your plan for more.' },
        { status: 402 }
      );
    }

    // Generate AI suggestions
    const suggestions = await generateMappingSuggestions(unmapped, orgId);

    // Save suggestions to DB (unconfirmed)
    let savedCount = 0;
    for (const suggestion of suggestions) {
      const account = unmapped.find(
        (a) => a.code === suggestion.code || a.name === suggestion.name
      );
      if (!account) continue;

      const { error } = await untypedDb
        .from('account_mappings')
        .upsert(
          {
            org_id: orgId,
            account_id: account.id,
            standard_category: suggestion.category,
            ai_confidence: suggestion.confidence,
            ai_suggested: suggestion.category,
            user_confirmed: false,
            user_overridden: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'org_id,account_id' }
        );

      if (!error) savedCount++;
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'account_mappings.auto_mapped',
      entityType: 'account_mappings',
      entityId: orgId,
      metadata: { totalAccounts: accs.length, mapped: savedCount },
    });

    return NextResponse.json({
      mapped: savedCount,
      total: accs.length,
      suggestions,
    });
  } catch (err) {
    console.error('[ACCOUNT_MAP] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to auto-map accounts' }, { status: 500 });
  }
}

/**
 * Use Claude AI to suggest standard category mappings for Xero accounts.
 * Returns suggestions with confidence scores.
 */
async function generateMappingSuggestions(
  accounts: ChartOfAccount[],
  orgId: string
): Promise<
  Array<{
    code: string;
    name: string;
    category: string;
    confidence: number;
    reasoning: string;
  }>
> {
  const systemPrompt = `You are the Grove account mapping engine. Your job is to map Xero chart of accounts to standard financial categories.

Standard categories:
${STANDARD_CATEGORIES.join(', ')}

Rules:
- Map each account to exactly ONE standard category
- Use the account code, name, type, and class to determine the best match
- Assign a confidence score between 0 and 1 (1 = certain, 0.5 = uncertain)
- If confidence < 0.5, still pick the best match but note why in reasoning
- UK accounting conventions apply
- Revenue accounts (class REVENUE) → revenue or other_income
- Direct cost accounts (class DIRECTCOSTS) → cost_of_sales
- Expense accounts: map to the most specific category available
- Balance sheet accounts: map to the appropriate asset/liability/equity category

Respond with ONLY valid JSON array. No markdown, no explanation outside JSON.`;

  const accountList = accounts
    .map(
      (a) =>
        `{ "code": "${a.code}", "name": "${a.name}", "type": "${a.type}", "class": "${a.class}" }`
    )
    .join('\n');

  const userMessage = `Map these Xero accounts to standard categories. Return JSON array with: code, name, category, confidence (0-1), reasoning (brief).

Accounts:
${accountList}

Output JSON schema:
[{ "code": "string", "name": "string", "category": "string", "confidence": number, "reasoning": "string" }]`;

  const llmResult = await callLLMCached({
    systemPrompt,
    userMessage,
    orgId,
    temperature: 0.1,
  });
  const responseText = llmResult.response;
  await trackTokenUsage(orgId, llmResult.tokensUsed, 'accounts-map');

  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      code: string;
      name: string;
      category: string;
      confidence: number;
      reasoning: string;
    }>;

    // Validate categories and clamp confidence
    return parsed.map((item) => ({
      code: item.code,
      name: item.name,
      category: STANDARD_CATEGORIES.includes(
        item.category as (typeof STANDARD_CATEGORIES)[number]
      )
        ? item.category
        : 'other_expense',
      confidence: Math.max(0, Math.min(1, item.confidence || 0.5)),
      reasoning: item.reasoning || 'No reasoning provided',
    }));
  } catch {
    // Fallback: map by class heuristic
    return accounts.map((a) => ({
      code: a.code,
      name: a.name,
      category: classToCategory(a.class),
      confidence: 0.3,
      reasoning: 'AI mapping failed, using class-based heuristic',
    }));
  }
}

/** Fallback heuristic mapping from Xero account class to standard category */
function classToCategory(accountClass: string): string {
  switch (accountClass.toUpperCase()) {
    case 'REVENUE':
      return 'revenue';
    case 'DIRECTCOSTS':
      return 'cost_of_sales';
    case 'EXPENSE':
    case 'OVERHEADS':
      return 'other_expense';
    case 'ASSET':
      return 'other_current_asset';
    case 'LIABILITY':
      return 'other_current_liability';
    case 'EQUITY':
      return 'equity';
    default:
      return 'other_expense';
  }
}
