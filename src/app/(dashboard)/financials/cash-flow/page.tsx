import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL } from '@/lib/financial/aggregate';
import { ensureBalanceSheetData } from '@/lib/xero/sync';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { CashFlowClient } from './cash-flow-client';

export default async function CashFlowPage() {
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
  if (connected) {
    await ensureBalanceSheetData(orgId);
  }

  // Fetch normalised financials with account info
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(id, code, name, type, class)')
    .eq('org_id', orgId)
    .order('period', { ascending: false });

  // Fetch chart of accounts separately for buildPnL
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const finData = (financials ?? []) as (NormalisedFinancial & {
    chart_of_accounts: { id: string; code: string; name: string; type: string; class: string };
  })[];
  const accData = (accounts ?? []) as ChartOfAccount[];

  // Get all unique periods sorted
  const availablePeriods = [...new Set(finData.map((f) => f.period))].sort();

  // Build P&L for net profit figures — for ALL periods
  type BSSection = { class: string; accounts: { name: string; amount: number; accountId: string; code: string }[]; total: number };

  const allPnL: Record<string, { netProfit: number }> = {};
  for (const period of availablePeriods) {
    const pnl = buildPnL(finData as NormalisedFinancial[], accData, period);
    allPnL[period] = { netProfit: pnl?.netProfit ?? 0 };
  }

  // Build balance sheet data for ALL periods
  function buildBS(data: typeof finData, period: string): BSSection[] {
    const periodData = data.filter((f) => f.period === period);
    const groups = new Map<string, Map<string, { amount: number; accountId: string; code: string }>>();

    for (const fin of periodData) {
      const account = fin.chart_of_accounts;
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
      const accs = Array.from(accMap.entries())
        .map(([name, entry]) => ({ name, amount: entry.amount, accountId: entry.accountId, code: entry.code }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const total = accs.reduce((s, a) => s + a.amount, 0);
      result.push({ class: cls, accounts: accs, total });
    }
    return result;
  }

  const allBS: Record<string, BSSection[]> = {};
  for (const period of availablePeriods) {
    allBS[period] = buildBS(finData, period);
  }

  return (
    <CashFlowClient
      connected={connected}
      availablePeriods={availablePeriods}
      allPnL={allPnL}
      allBS={allBS}
      orgId={orgId}
      lastSyncAt={lastSyncAt}
    />
  );
}
