import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { STANDARD_CATEGORIES, CATEGORY_META } from '@/lib/financial/taxonomy';
import { MappingsClient } from './mappings-client';

export const metadata = { title: 'Account Mappings | Settings' };

export default async function AccountMappingsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();
  const untypedDb = await createUntypedServiceClient();

  // Fetch chart of accounts and mappings in parallel
  const [accountsRes, mappingsRes] = await Promise.all([
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, type, class, status')
      .eq('org_id', orgId)
      .order('code', { ascending: true }),
    untypedDb
      .from('account_mappings')
      .select('*')
      .eq('org_id', orgId),
  ]);

  const accounts = (accountsRes.data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    class: string;
    status: string;
  }>;

  // Normalise mappings — handle both possible column schemas
  const rawMappings = (mappingsRes.data ?? []) as Record<string, unknown>[];
  const mappings = rawMappings.map((m) => ({
    id: (m.id as string) ?? '',
    orgId: (m.org_id as string) ?? '',
    // Support both schemas: source_account_code or account_id
    accountCode: (m.source_account_code as string) ?? '',
    accountName: (m.source_account_name as string) ?? '',
    accountId: (m.account_id as string) ?? '',
    // Support both: target_category or standard_category
    category: (m.target_category as string) ?? (m.standard_category as string) ?? '',
    subcategory: (m.target_subcategory as string) ?? null,
    confidence: (m.confidence as number) ?? (m.ai_confidence as number) ?? 0,
    verified: (m.verified as boolean) ?? (m.user_confirmed as boolean) ?? false,
    locked: (m.locked as boolean) ?? false,
    mappingSource: (m.mapping_source as string) ?? (m.ai_suggested ? 'auto' : 'manual'),
    aiReasoning: (m.ai_reasoning as string) ?? '',
  }));

  // Build a lookup: account code → mapping
  const mappingByCode = new Map(mappings.filter((m) => m.accountCode).map((m) => [m.accountCode, m]));
  const mappingById = new Map(mappings.filter((m) => m.accountId).map((m) => [m.accountId, m]));

  // Merge accounts with their mappings
  const rows = accounts.map((acc) => {
    const mapping = mappingByCode.get(acc.code) ?? mappingById.get(acc.id);
    return {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      xeroType: acc.type,
      xeroClass: acc.class,
      status: acc.status,
      mappingId: mapping?.id ?? null,
      category: mapping?.category ?? '',
      subcategory: mapping?.subcategory ?? null,
      confidence: mapping?.confidence ?? 0,
      verified: mapping?.verified ?? false,
      locked: mapping?.locked ?? false,
      mappingSource: mapping?.mappingSource ?? '',
      aiReasoning: mapping?.aiReasoning ?? '',
    };
  });

  // Category options for the dropdown
  const categoryOptions = STANDARD_CATEGORIES.map((key) => ({
    key,
    label: CATEGORY_META[key].label,
    section: CATEGORY_META[key].pnlSection,
  }));

  return (
    <MappingsClient
      rows={rows}
      categoryOptions={categoryOptions}
      orgId={orgId}
      totalAccounts={accounts.length}
      verifiedCount={rows.filter((r) => r.verified).length}
      unmappedCount={rows.filter((r) => !r.category).length}
    />
  );
}
