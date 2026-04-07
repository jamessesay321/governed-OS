import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { TrunkShowsClient } from './trunk-shows-client';

// ── Types ──

export interface TrunkShowPeriodSummary {
  period: string;
  label: string;
  total: number;
  byCategory: Record<string, number>;
}

export interface TrunkShowCategorySummary {
  name: string;
  total: number;
  pct: number;
}

// ── Account Code Mapping ──

const TRUNK_SHOW_CODES: Record<string, string> = {
  '570': 'Travel',
  '571': 'Food & Drink',
  '572': 'Purchases',
  '573': 'Freelance Workers',
  '574': 'Shipping',
};

function monthLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ── Page ──

export default async function TrunkShowsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  const trunkCodes = Object.keys(TRUNK_SHOW_CODES);

  // Fetch chart_of_accounts for trunk show codes
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class')
    .eq('org_id', orgId)
    .in('code', trunkCodes);

  const accounts = (coaData ?? []) as unknown as Array<{
    id: string; name: string; code: string; class: string;
  }>;

  const accountIds = accounts.map((a) => a.id);
  const idToCode = new Map(accounts.map((a) => [a.id, a.code]));

  // Fetch normalised_financials for trunk show accounts
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', accountIds)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string; amount: number; account_id: string;
  }>;

  // Aggregate by period and category
  const allPeriods = new Set<string>();
  const periodCategoryAmounts = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const code = idToCode.get(row.account_id);
    if (!code) continue;

    const categoryName = TRUNK_SHOW_CODES[code] ?? 'Other';
    allPeriods.add(row.period);

    if (!periodCategoryAmounts.has(row.period)) {
      periodCategoryAmounts.set(row.period, {});
    }
    const byCategory = periodCategoryAmounts.get(row.period)!;
    byCategory[categoryName] = (byCategory[categoryName] ?? 0) + Number(row.amount);
  }

  const sortedPeriods = Array.from(allPeriods).sort().slice(-12);

  // Build period summaries
  const periodSummaries: TrunkShowPeriodSummary[] = sortedPeriods.map((period) => {
    const byCategory = periodCategoryAmounts.get(period) ?? {};
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    return { period, label: monthLabel(period), total, byCategory };
  });

  // Category totals
  const categoryTotals: Record<string, number> = {};
  for (const ps of periodSummaries) {
    for (const [cat, amt] of Object.entries(ps.byCategory)) {
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + amt;
    }
  }

  const totalTrunkShowSpend = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  // Category summaries for display
  const categorySummaries: TrunkShowCategorySummary[] = Object.entries(categoryTotals)
    .map(([name, total]) => ({
      name,
      total,
      pct: totalTrunkShowSpend > 0 ? (total / totalTrunkShowSpend) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Average per event month (months where spend > 0)
  const activeMonths = periodSummaries.filter((p) => p.total > 0);
  const averagePerEvent = activeMonths.length > 0
    ? totalTrunkShowSpend / activeMonths.length
    : 0;

  // Largest month
  const largestMonth = periodSummaries.reduce(
    (max, p) => (p.total > max.total ? p : max),
    { period: '', label: 'N/A', total: 0, byCategory: {} },
  );

  // Fetch revenue for % of revenue calculation and ROI hint
  const { data: revCoaData } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('org_id', orgId)
    .in('class', ['REVENUE', 'OTHERINCOME']);

  const revIds = ((revCoaData ?? []) as unknown as Array<{ id: string }>).map((a) => a.id);

  // Fetch revenue by period for ROI hint
  const revenuePeriodMap: Record<string, number> = {};
  let totalRevenue = 0;

  if (revIds.length > 0) {
    const { data: revFinancials } = await supabase
      .from('normalised_financials')
      .select('period, amount')
      .eq('org_id', orgId)
      .in('account_id', revIds)
      .in('period', sortedPeriods);

    const revRows = (revFinancials ?? []) as unknown as Array<{
      period: string; amount: number;
    }>;

    for (const r of revRows) {
      revenuePeriodMap[r.period] = (revenuePeriodMap[r.period] ?? 0) + Number(r.amount);
      totalRevenue += Number(r.amount);
    }
  }

  const spendAsPctOfRevenue = totalRevenue > 0
    ? (totalTrunkShowSpend / totalRevenue) * 100
    : 0;

  // ROI hint: for months with trunk show activity, compare revenue
  const roiData = sortedPeriods.map((period) => {
    const trunkSpend = periodSummaries.find((p) => p.period === period)?.total ?? 0;
    const revenue = revenuePeriodMap[period] ?? 0;
    return {
      label: monthLabel(period),
      trunkShowSpend: Math.round(trunkSpend),
      revenue: Math.round(revenue),
      hasTrunkShow: trunkSpend > 0,
    };
  });

  return (
    <TrunkShowsClient
      periodSummaries={periodSummaries}
      categorySummaries={categorySummaries}
      categoryTotals={categoryTotals}
      totalTrunkShowSpend={totalTrunkShowSpend}
      averagePerEvent={averagePerEvent}
      largestMonthLabel={largestMonth.label}
      largestMonthTotal={largestMonth.total}
      spendAsPctOfRevenue={spendAsPctOfRevenue}
      totalRevenue={totalRevenue}
      roiData={roiData}
      periods={sortedPeriods}
    />
  );
}
