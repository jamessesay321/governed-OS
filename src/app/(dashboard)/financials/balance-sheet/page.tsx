import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { ensureBalanceSheetData } from '@/lib/xero/sync';
import { BalanceSheetClient } from './balance-sheet-client';

export default async function BalanceSheetPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle();

  const connected = !!xeroConn;

  // Fetch last sync timestamp for DataFreshness
  const syncResult = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastSyncAt = syncResult.data?.completed_at ?? null;

  // Auto-fetch balance sheet data if connected but none exists yet.
  // This is a lightweight call (6 API requests max) that runs once —
  // subsequent page loads find the data already in the DB.
  if (connected) {
    await ensureBalanceSheetData(orgId);
  }

  // Fetch normalised financials with account info
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(id, code, name, type, class)')
    .eq('org_id', orgId)
    .order('period', { ascending: false });

  // Get all unique periods sorted
  const availablePeriods = [...new Set((financials ?? []).map((f) => f.period))].sort();

  // Group by ASSET, LIABILITY, EQUITY for a given period
  type BSSection = { class: string; accounts: { name: string; amount: number; accountId: string; code: string }[]; total: number };

  function buildBalanceSheet(data: typeof financials, period: string): BSSection[] {
    if (!data) return [];
    const periodData = data.filter((f) => f.period === period);
    const groups = new Map<string, Map<string, { amount: number; accountId: string; code: string }>>();

    for (const fin of periodData) {
      const account = fin.chart_of_accounts as { id: string; code: string; name: string; type: string; class: string };
      const cls = account.class.toUpperCase();
      if (!['ASSET', 'LIABILITY', 'EQUITY'].includes(cls)) continue;

      if (!groups.has(cls)) groups.set(cls, new Map());
      const accMap = groups.get(cls)!;
      const existing = accMap.get(account.name);
      if (existing) {
        existing.amount += Number(fin.amount);
      } else {
        accMap.set(account.name, { amount: Number(fin.amount), accountId: account.id, code: account.code });
      }
    }

    const result: BSSection[] = [];
    for (const cls of ['ASSET', 'LIABILITY', 'EQUITY']) {
      const accMap = groups.get(cls);
      if (!accMap) {
        result.push({ class: cls, accounts: [], total: 0 });
        continue;
      }
      const accounts = Array.from(accMap.entries())
        .map(([name, entry]) => ({ name, amount: entry.amount, accountId: entry.accountId, code: entry.code }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const total = accounts.reduce((s, a) => s + a.amount, 0);
      result.push({ class: cls, accounts, total });
    }
    return result;
  }

  // Build balance sheet data for every period
  const allPeriodsData: Record<string, BSSection[]> = {};
  for (const period of availablePeriods) {
    allPeriodsData[period] = buildBalanceSheet(financials, period);
  }

  return (
    <BalanceSheetClient
      connected={connected}
      availablePeriods={availablePeriods}
      allPeriodsData={allPeriodsData}
      orgId={orgId}
      lastSyncAt={lastSyncAt}
    />
  );
}
