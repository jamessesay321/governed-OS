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

  // Sub-classification helper: infers Current vs Non-Current from account name and Xero type
  type AccountEntry = { name: string; amount: number; accountId: string; code: string };
  type SubGroup = { label: string; accounts: AccountEntry[]; total: number };
  type BSSection = { class: string; subGroups: SubGroup[]; total: number };

  const CURRENT_ASSET_PATTERNS = [
    'bank', 'cash', 'petty cash', 'receivable', 'debtor', 'prepayment', 'prepaid',
    'inventory', 'stock', 'trade receivable', 'accounts receivable', 'vat', 'tax refund', 'deposit',
  ];
  const NON_CURRENT_ASSET_PATTERNS = [
    'equipment', 'property', 'plant', 'vehicle', 'furniture', 'computer', 'machinery',
    'intangible', 'goodwill', 'investment', 'fixed asset', 'depreciation', 'accumulated',
  ];
  const CURRENT_LIABILITY_PATTERNS = [
    'payable', 'creditor', 'trade payable', 'accounts payable', 'accrual', 'vat',
    'tax payable', 'paye', 'nic', 'pension', 'overdraft', 'credit card',
    'deferred income', 'deposit received', 'short-term',
  ];
  const NON_CURRENT_LIABILITY_PATTERNS = [
    'loan', 'mortgage', 'long-term', 'hire purchase', 'lease liability',
    'director loan', 'borrowing',
  ];

  function classifyAccount(name: string, type: string, cls: string): 'current' | 'non-current' {
    const lower = `${name} ${type}`.toLowerCase();

    if (cls === 'ASSET') {
      // Check non-current first (more specific patterns like "fixed deposit")
      if (NON_CURRENT_ASSET_PATTERNS.some((p) => lower.includes(p))) {
        // Exception: "deposit" alone is current, but "fixed deposit" is non-current
        // If it matched because of 'deposit' in non-current list — not applicable, deposit isn't there
        return 'non-current';
      }
      if (CURRENT_ASSET_PATTERNS.some((p) => {
        if (p === 'deposit') return lower.includes('deposit') && !lower.includes('fixed deposit');
        return lower.includes(p);
      })) {
        return 'current';
      }
      return 'current'; // default for assets
    }

    if (cls === 'LIABILITY') {
      if (NON_CURRENT_LIABILITY_PATTERNS.some((p) => lower.includes(p))) {
        return 'non-current';
      }
      if (CURRENT_LIABILITY_PATTERNS.some((p) => lower.includes(p))) {
        return 'current';
      }
      return 'current'; // default for liabilities
    }

    return 'current'; // EQUITY doesn't sub-classify — treated as single group
  }

  function buildBalanceSheet(data: typeof financials, period: string): BSSection[] {
    if (!data) return [];
    const periodData = data.filter((f) => f.period === period);
    const groups = new Map<string, Map<string, { amount: number; accountId: string; code: string; xeroType: string }>>();

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
        accMap.set(account.name, {
          amount: Number(fin.amount),
          accountId: account.id,
          code: account.code,
          xeroType: account.type,
        });
      }
    }

    const result: BSSection[] = [];
    for (const cls of ['ASSET', 'LIABILITY', 'EQUITY']) {
      const accMap = groups.get(cls);
      if (!accMap) {
        result.push({ class: cls, subGroups: [], total: 0 });
        continue;
      }

      const allAccounts = Array.from(accMap.entries())
        .map(([name, entry]) => ({
          name,
          amount: entry.amount,
          accountId: entry.accountId,
          code: entry.code,
          classification: classifyAccount(name, entry.xeroType, cls),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (cls === 'EQUITY') {
        // Equity has no sub-classification
        const accounts = allAccounts.map(({ classification, ...rest }) => rest);
        const total = accounts.reduce((s, a) => s + a.amount, 0);
        result.push({ class: cls, subGroups: [{ label: 'Equity', accounts, total }], total });
      } else {
        const currentLabel = cls === 'ASSET' ? 'Current Assets' : 'Current Liabilities';
        const nonCurrentLabel = cls === 'ASSET' ? 'Non-Current Assets' : 'Non-Current Liabilities';

        const currentAccounts = allAccounts
          .filter((a) => a.classification === 'current')
          .map(({ classification, ...rest }) => rest);
        const nonCurrentAccounts = allAccounts
          .filter((a) => a.classification === 'non-current')
          .map(({ classification, ...rest }) => rest);

        const currentTotal = currentAccounts.reduce((s, a) => s + a.amount, 0);
        const nonCurrentTotal = nonCurrentAccounts.reduce((s, a) => s + a.amount, 0);
        const sectionTotal = currentTotal + nonCurrentTotal;

        const subGroups: SubGroup[] = [];
        if (currentAccounts.length > 0) subGroups.push({ label: currentLabel, accounts: currentAccounts, total: currentTotal });
        if (nonCurrentAccounts.length > 0) subGroups.push({ label: nonCurrentLabel, accounts: nonCurrentAccounts, total: nonCurrentTotal });

        result.push({ class: cls, subGroups, total: sectionTotal });
      }
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
