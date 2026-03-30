import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
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

  // Fetch normalised financials with account info
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(code, name, type, class)')
    .eq('org_id', orgId)
    .order('period', { ascending: false });

  // Fetch chart of accounts separately for buildPnL
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const connected = !!xeroConn;
  const finData = (financials ?? []) as (NormalisedFinancial & {
    chart_of_accounts: { code: string; name: string; type: string; class: string };
  })[];
  const accData = (accounts ?? []) as ChartOfAccount[];

  // Get periods
  const rawPeriods = [...new Set(finData.map((f) => f.period))].sort().reverse();
  const latestPeriod = rawPeriods[0] ?? null;
  const priorPeriod = rawPeriods[1] ?? null;

  // Build P&L for net profit figures
  const periods = getAvailablePeriods(finData as NormalisedFinancial[]);
  const currentPnL = latestPeriod ? buildPnL(finData as NormalisedFinancial[], accData, latestPeriod) : null;
  const priorPnL = priorPeriod ? buildPnL(finData as NormalisedFinancial[], accData, priorPeriod) : null;

  // Build balance sheet data (same logic as balance-sheet page)
  function buildBS(data: typeof finData, period: string | null) {
    if (!data || !period) return [];
    const periodData = data.filter((f) => f.period === period);
    const groups = new Map<string, Map<string, number>>();

    for (const fin of periodData) {
      const account = fin.chart_of_accounts;
      const cls = account.class.toUpperCase();
      if (!['ASSET', 'LIABILITY', 'EQUITY'].includes(cls)) continue;

      if (!groups.has(cls)) groups.set(cls, new Map());
      const accMap = groups.get(cls)!;
      const existing = accMap.get(account.name) ?? 0;
      accMap.set(account.name, existing + Number(fin.amount));
    }

    const result: { class: string; accounts: { name: string; amount: number }[]; total: number }[] = [];
    for (const cls of ['ASSET', 'LIABILITY', 'EQUITY']) {
      const accMap = groups.get(cls);
      if (!accMap) {
        result.push({ class: cls, accounts: [], total: 0 });
        continue;
      }
      const accs = Array.from(accMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const total = accs.reduce((s, a) => s + a.amount, 0);
      result.push({ class: cls, accounts: accs, total });
    }
    return result;
  }

  const currentBS = buildBS(finData, latestPeriod);
  const priorBS = buildBS(finData, priorPeriod);

  return (
    <CashFlowClient
      connected={connected}
      currentPeriod={latestPeriod}
      priorPeriod={priorPeriod}
      netProfit={currentPnL?.netProfit ?? 0}
      priorNetProfit={priorPnL?.netProfit ?? 0}
      currentBS={currentBS}
      priorBS={priorBS}
    />
  );
}
