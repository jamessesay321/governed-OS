import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import FinancialHealthClient from './financial-health-client';

export default async function FinancialHealthPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  /* ─── 1. Check Xero connection ─── */
  const { data: connections } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .limit(1);

  const connected = (connections?.length ?? 0) > 0;

  /* ─── 2. Fetch normalised financials with chart_of_accounts join ─── */
  const { data: rawFinancials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(id, code, name, type, class, status)')
    .eq('org_id', orgId);

  const financials: NormalisedFinancial[] = (rawFinancials ?? []).map((r) => ({
    id: r.id,
    org_id: r.org_id,
    period: r.period,
    account_id: r.account_id,
    amount: Number(r.amount),
    transaction_count: r.transaction_count,
    source: r.source,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  /* ─── 3. Fetch chart of accounts ─── */
  const { data: rawAccounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const accounts: ChartOfAccount[] = (rawAccounts ?? []) as ChartOfAccount[];

  const periods = getAvailablePeriods(financials);
  const hasData = periods.length > 0;

  if (!hasData) {
    return (
      <FinancialHealthClient
        connected={connected}
        hasData={false}
        currentRatio={0}
        totalAssets={0}
        totalLiabilities={0}
        cashPosition={0}
        burnRates={[]}
        cashByPeriod={[]}
        runwayMonths={0}
      />
    );
  }

  /* ─── 4. Build P&L for each period (burn rate = total expenses per month) ─── */
  const burnRates: Array<{ period: string; burn: number }> = [];
  for (const period of periods) {
    const pnl = buildPnL(financials, accounts, period);
    burnRates.push({ period, burn: Math.abs(pnl.expenses) });
  }
  // Chronological order (periods come descending from getAvailablePeriods)
  burnRates.reverse();

  /* ─── 5. Balance sheet data for latest period ─── */
  const latestPeriod = periods[0];

  // Build account lookup by class
  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  const latestFinancials = financials.filter((f) => f.period === latestPeriod);

  let totalAssets = 0;
  let totalLiabilities = 0;
  let cashPosition = 0;

  for (const fin of latestFinancials) {
    const account = accountMap.get(fin.account_id);
    if (!account) continue;
    const cls = account.class.toUpperCase();

    if (cls === 'ASSET') {
      totalAssets += Number(fin.amount);
      // Cash/bank accounts typically have type containing 'BANK' or 'CASH'
      const accType = account.type.toUpperCase();
      if (accType.includes('BANK') || accType.includes('CASH')) {
        cashPosition += Number(fin.amount);
      }
    } else if (cls === 'LIABILITY') {
      totalLiabilities += Math.abs(Number(fin.amount));
    }
  }

  /* ─── 6. Current ratio ─── */
  const currentRatio =
    totalLiabilities > 0
      ? Math.round((totalAssets / totalLiabilities) * 100) / 100
      : 0;

  /* ─── 7. Cash position by period ─── */
  const cashByPeriod: Array<{ period: string; cash: number }> = [];
  for (const period of [...periods].reverse()) {
    const periodFins = financials.filter((f) => f.period === period);
    let periodCash = 0;
    for (const fin of periodFins) {
      const account = accountMap.get(fin.account_id);
      if (!account) continue;
      const cls = account.class.toUpperCase();
      const accType = account.type.toUpperCase();
      if (cls === 'ASSET' && (accType.includes('BANK') || accType.includes('CASH'))) {
        periodCash += Number(fin.amount);
      }
    }
    cashByPeriod.push({ period, cash: periodCash });
  }

  /* ─── 8. Runway months ─── */
  const avgBurn =
    burnRates.length > 0
      ? burnRates.reduce((sum, b) => sum + b.burn, 0) / burnRates.length
      : 0;
  const runwayMonths =
    avgBurn > 0 ? Math.round((cashPosition / avgBurn) * 10) / 10 : 0;

  return (
    <FinancialHealthClient
      connected={connected}
      hasData={hasData}
      currentRatio={currentRatio}
      totalAssets={totalAssets}
      totalLiabilities={totalLiabilities}
      cashPosition={cashPosition}
      burnRates={burnRates}
      cashByPeriod={cashByPeriod}
      runwayMonths={runwayMonths}
    />
  );
}
