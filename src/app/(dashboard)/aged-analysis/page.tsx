import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { AgedAnalysisClient } from './aged-analysis-client';

// ── Types ──

export interface AgingBucket {
  label: string;
  amount: number;
  colour: 'green' | 'amber' | 'red';
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  amount: number;
}

export interface TrendPoint {
  period: string;
  label: string;
  debtors: number;
  creditors: number;
  workingCapital: number;
}

export interface AgedAnalysisData {
  totalDebtors: number;
  totalCreditors: number;
  dso: number;
  dpo: number;
  workingCapitalCycle: number;
  debtorBuckets: AgingBucket[];
  creditorBuckets: AgingBucket[];
  topDebtorAccounts: AccountBalance[];
  topCreditorAccounts: AccountBalance[];
  trendData: TrendPoint[];
  dsoTrend: { period: string; label: string; dso: number; dpo: number }[];
  latestPeriod: string;
  hasData: boolean;
}

// ── Helpers ──

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * Derive aging buckets from the last 4 months of balance data for a set of accounts.
 * Latest month = Current, prior month = 1 Month, etc.
 * This is an approximation; real aged data would come from invoice-level detail.
 */
function deriveAgingBuckets(
  financials: Array<{ period: string; amount: number; account_id: string }>,
  accountIds: Set<string>,
  periods: string[],
): AgingBucket[] {
  // Group balance by period (most recent first)
  const sortedPeriods = periods.slice(0, 4);

  const periodTotals = sortedPeriods.map((p) => {
    const total = financials
      .filter((f) => f.period === p && accountIds.has(f.account_id))
      .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);
    return total;
  });

  // Calculate aging distribution from the latest balance
  const latestTotal = periodTotals[0] || 0;
  if (latestTotal === 0) {
    return [
      { label: 'Current', amount: 0, colour: 'green' },
      { label: '1 Month', amount: 0, colour: 'amber' },
      { label: '2 Months', amount: 0, colour: 'amber' },
      { label: '3+ Months', amount: 0, colour: 'red' },
    ];
  }

  // Estimate aging using balance changes between periods
  // If balance is increasing, newer amounts are accumulating (more current)
  // If balance is stable, assume roughly even aging
  const changes: number[] = [];
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    changes.push(Math.max(0, periodTotals[i] - (periodTotals[i + 1] || 0)));
  }

  // Current = new amounts added this period (change from prior)
  const currentAmount = changes[0] || latestTotal * 0.45;
  const remaining = latestTotal - currentAmount;

  // Distribute remaining across older buckets
  const oneMonth = remaining * 0.35;
  const twoMonths = remaining * 0.30;
  const threeMonths = remaining * 0.35;

  return [
    { label: 'Current', amount: Math.round(currentAmount), colour: 'green' },
    { label: '1 Month', amount: Math.round(oneMonth), colour: 'amber' },
    { label: '2 Months', amount: Math.round(twoMonths), colour: 'amber' },
    { label: '3+ Months', amount: Math.round(threeMonths), colour: 'red' },
  ];
}

// ── Page ──

export default async function AgedAnalysisPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // 1. Fetch chart of accounts
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, type, class')
    .eq('org_id', orgId);

  const accounts = (coaData ?? []) as unknown as Array<{
    id: string;
    name: string;
    type: string;
    class: string;
  }>;

  if (accounts.length === 0) {
    return <AgedAnalysisClient data={{ hasData: false } as AgedAnalysisData} />;
  }

  // 2. Identify debtor and creditor accounts by name/type patterns
  const debtorPatterns = [
    'trade debtor', 'accounts receivable', 'trade receivable',
    'debtors', 'receivable', 'prepayment',
  ];
  const creditorPatterns = [
    'trade creditor', 'accounts payable', 'trade payable',
    'creditors', 'payable', 'accrual',
  ];

  const debtorAccounts = accounts.filter((a) => {
    const nameLower = a.name.toLowerCase();
    const typeLower = (a.type ?? '').toLowerCase();
    const classUpper = (a.class ?? '').toUpperCase();
    return (
      classUpper === 'ASSET' &&
      (debtorPatterns.some((p) => nameLower.includes(p)) ||
        typeLower.includes('receivable') ||
        typeLower.includes('current') ||
        typeLower.includes('prepayment'))
    );
  });

  const creditorAccounts = accounts.filter((a) => {
    const nameLower = a.name.toLowerCase();
    const typeLower = (a.type ?? '').toLowerCase();
    const classUpper = (a.class ?? '').toUpperCase();
    return (
      classUpper === 'LIABILITY' &&
      (creditorPatterns.some((p) => nameLower.includes(p)) ||
        typeLower.includes('payable') ||
        typeLower.includes('current') ||
        typeLower.includes('accrual'))
    );
  });

  // Fall back to class-based matching if name matching yielded nothing
  const debtorAccountsFinal =
    debtorAccounts.length > 0
      ? debtorAccounts
      : accounts.filter((a) => a.class.toUpperCase() === 'ASSET' && a.type.toUpperCase() !== 'BANK');
  const creditorAccountsFinal =
    creditorAccounts.length > 0
      ? creditorAccounts
      : accounts.filter((a) => a.class.toUpperCase() === 'LIABILITY');

  const debtorIds = new Set(debtorAccountsFinal.map((a) => a.id));
  const creditorIds = new Set(creditorAccountsFinal.map((a) => a.id));
  const allRelevantIds = [...debtorIds, ...creditorIds];

  // 3. Fetch normalised_financials for those accounts (last 12 months)
  const { data: financialsData } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', allRelevantIds)
    .order('period', { ascending: false })
    .limit(5000);

  const financials = (financialsData ?? []) as unknown as Array<{
    period: string;
    amount: number;
    account_id: string;
  }>;

  // 4. Fetch revenue and COGS for DSO/DPO calculation
  const revenueAccountIds = accounts
    .filter((a) => {
      const cls = a.class.toUpperCase();
      return cls === 'REVENUE' || cls === 'OTHERINCOME';
    })
    .map((a) => a.id);

  const cogsAccountIds = accounts
    .filter((a) => a.class.toUpperCase() === 'DIRECTCOSTS')
    .map((a) => a.id);

  const { data: pnlData } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', [...revenueAccountIds, ...cogsAccountIds])
    .order('period', { ascending: false })
    .limit(5000);

  const pnlFinancials = (pnlData ?? []) as unknown as Array<{
    period: string;
    amount: number;
    account_id: string;
  }>;

  // 5. Get available periods
  const allPeriods = [
    ...new Set([...financials.map((f) => f.period), ...pnlFinancials.map((f) => f.period)]),
  ].sort().reverse();

  const periods = allPeriods.slice(0, 12);

  if (periods.length === 0) {
    return <AgedAnalysisClient data={{ hasData: false } as AgedAnalysisData} />;
  }

  const latestPeriod = periods[0];

  // 6. Compute latest totals
  const revenueIdSet = new Set(revenueAccountIds);
  const cogsIdSet = new Set(cogsAccountIds);

  const latestDebtors = financials
    .filter((f) => f.period === latestPeriod && debtorIds.has(f.account_id))
    .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

  const latestCreditors = financials
    .filter((f) => f.period === latestPeriod && creditorIds.has(f.account_id))
    .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

  // Annualise revenue and COGS from the latest 12 months
  const totalRevenue = pnlFinancials
    .filter((f) => revenueIdSet.has(f.account_id) && periods.includes(f.period))
    .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

  const totalCOGS = pnlFinancials
    .filter((f) => cogsIdSet.has(f.account_id) && periods.includes(f.period))
    .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

  // Scale to annual if we have fewer than 12 months
  const monthsAvailable = Math.max(periods.length, 1);
  const annualisedRevenue = (totalRevenue / monthsAvailable) * 12;
  const annualisedCOGS = (totalCOGS / monthsAvailable) * 12;

  // 7. Compute DSO, DPO, Working Capital Cycle
  const dso = annualisedRevenue > 0 ? Math.round((latestDebtors / annualisedRevenue) * 365) : 0;
  const dpo = annualisedCOGS > 0 ? Math.round((latestCreditors / annualisedCOGS) * 365) : 0;
  const workingCapitalCycle = dso - dpo;

  // 8. Derive aging buckets
  const debtorBuckets = deriveAgingBuckets(financials, debtorIds, periods);
  const creditorBuckets = deriveAgingBuckets(financials, creditorIds, periods);

  // 9. Top debtor/creditor accounts by outstanding amount
  const debtorAccountMap = new Map<string, { name: string; total: number }>();
  for (const f of financials) {
    if (f.period !== latestPeriod || !debtorIds.has(f.account_id)) continue;
    const acc = debtorAccountsFinal.find((a) => a.id === f.account_id);
    if (!acc) continue;
    const existing = debtorAccountMap.get(f.account_id);
    if (existing) {
      existing.total += Math.abs(Number(f.amount));
    } else {
      debtorAccountMap.set(f.account_id, {
        name: acc.name,
        total: Math.abs(Number(f.amount)),
      });
    }
  }

  const creditorAccountMap = new Map<string, { name: string; total: number }>();
  for (const f of financials) {
    if (f.period !== latestPeriod || !creditorIds.has(f.account_id)) continue;
    const acc = creditorAccountsFinal.find((a) => a.id === f.account_id);
    if (!acc) continue;
    const existing = creditorAccountMap.get(f.account_id);
    if (existing) {
      existing.total += Math.abs(Number(f.amount));
    } else {
      creditorAccountMap.set(f.account_id, {
        name: acc.name,
        total: Math.abs(Number(f.amount)),
      });
    }
  }

  const topDebtorAccounts: AccountBalance[] = Array.from(debtorAccountMap.entries())
    .map(([id, val]) => ({ accountId: id, accountName: val.name, amount: val.total }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const topCreditorAccounts: AccountBalance[] = Array.from(creditorAccountMap.entries())
    .map(([id, val]) => ({ accountId: id, accountName: val.name, amount: val.total }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // 10. Build 12-month trend data
  const trendData: TrendPoint[] = periods
    .slice()
    .reverse()
    .map((p) => {
      const periodDebtors = financials
        .filter((f) => f.period === p && debtorIds.has(f.account_id))
        .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

      const periodCreditors = financials
        .filter((f) => f.period === p && creditorIds.has(f.account_id))
        .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

      return {
        period: p,
        label: monthLabel(p),
        debtors: Math.round(periodDebtors),
        creditors: Math.round(periodCreditors),
        workingCapital: Math.round(periodDebtors - periodCreditors),
      };
    });

  // 11. DSO vs DPO trend
  const dsoTrend = periods
    .slice()
    .reverse()
    .map((p) => {
      const pDebtors = financials
        .filter((f) => f.period === p && debtorIds.has(f.account_id))
        .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

      const pCreditors = financials
        .filter((f) => f.period === p && creditorIds.has(f.account_id))
        .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

      const pRevenue = pnlFinancials
        .filter((f) => f.period === p && revenueIdSet.has(f.account_id))
        .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

      const pCOGS = pnlFinancials
        .filter((f) => f.period === p && cogsIdSet.has(f.account_id))
        .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);

      // Annualise single-month revenue/COGS
      const annRev = pRevenue * 12;
      const annCogs = pCOGS * 12;

      return {
        period: p,
        label: monthLabel(p),
        dso: annRev > 0 ? Math.round((pDebtors / annRev) * 365) : 0,
        dpo: annCogs > 0 ? Math.round((pCreditors / annCogs) * 365) : 0,
      };
    });

  const data: AgedAnalysisData = {
    totalDebtors: Math.round(latestDebtors),
    totalCreditors: Math.round(latestCreditors),
    dso,
    dpo,
    workingCapitalCycle,
    debtorBuckets,
    creditorBuckets,
    topDebtorAccounts,
    topCreditorAccounts,
    trendData,
    dsoTrend,
    latestPeriod,
    hasData: true,
  };

  return <AgedAnalysisClient data={data} />;
}
