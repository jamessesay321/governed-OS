import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { StagingClient } from './staging-client';

export default async function StagingPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();
  const untypedDb = await createUntypedServiceClient();

  // Fetch chart of accounts and existing mappings in parallel
  const [accountsResult, mappingsResult] = await Promise.all([
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, type, class')
      .eq('org_id', orgId)
      .order('code', { ascending: true }),
    untypedDb
      .from('account_mappings')
      .select('*')
      .eq('org_id', orgId),
  ]);

  const accounts = (accountsResult.data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    class: string;
  }>;

  const mappings = (mappingsResult.data ?? []) as Array<{
    id: string;
    org_id: string;
    account_id: string;
    standard_category: string;
    ai_confidence: number | null;
    ai_suggested: boolean;
    ai_reasoning: string | null;
    user_confirmed: boolean;
    user_overridden: boolean;
    version?: number;
    locked?: boolean;
    created_at: string;
    updated_at: string;
  }>;

  // Determine unmapped accounts
  const mappedAccountIds = new Set(mappings.map((m) => m.account_id));
  const unmappedCount = accounts.filter((a) => !mappedAccountIds.has(a.id)).length;

  return (
    <StagingClient
      orgId={orgId}
      initialMappings={mappings}
      initialAccounts={accounts}
      initialSuggestions={[]}
      unmappedCount={unmappedCount}
    />
  );
}
