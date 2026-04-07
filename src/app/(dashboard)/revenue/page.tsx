import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { RevenueClient } from './revenue-client';

// ── Types ──

export interface RevenueAccount {
  accountId: string;
  accountName: string;
  accountCode: string;
  category: string; // grouped category
  amounts: Record<string, number>; // period → amount
  total: number;
}

export interface RevenuePeriodSummary {
  period: string;
  label: string;
  total: number;
  byCategory: Record<string, number>;
}

// ── Category Mapping ──

const REVENUE_CATEGORIES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /bridal.*bespoke/i, category: 'Bridal - Bespoke' },
  { pattern: /bridal.*mto|made.to.order/i, category: 'Bridal - Made to Order' },
  { pattern: /ready.to.wear|ready.*made/i, category: 'Ready to Wear' },
  { pattern: /evening/i, category: 'Evening Wear' },
  { pattern: /robe/i, category: 'Robes & Loungewear' },
  { pattern: /under.?garment/i, category: 'Undergarments' },
  { pattern: /accessor/i, category: 'Accessories' },
  { pattern: /homeware/i, category: 'Homeware' },
  { pattern: /wholesale/i, category: 'Wholesale' },
  { pattern: /consult|acuity/i, category: 'Consultations' },
  { pattern: /sewing.academy/i, category: 'Sewing Academy' },
  { pattern: /shopify/i, category: 'E-Commerce (Shopify)' },
  { pattern: /square/i, category: 'Point of Sale (Square)' },
  { pattern: /revolut/i, category: 'Payments (Revolut)' },
  { pattern: /shipping/i, category: 'Shipping Income' },
  { pattern: /alteration/i, category: 'Alterations' },
  { pattern: /grant|government/i, category: 'Grants & Awards' },
  { pattern: /interest|finance/i, category: 'Finance Income' },
  { pattern: /refund/i, category: 'Refunds' },
];

function categoriseRevenue(accountName: string): string {
  for (const { pattern, category } of REVENUE_CATEGORIES) {
    if (pattern.test(accountName)) return category;
  }
  return 'Other Revenue';
}

function monthLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ── Page ──

export default async function RevenuePage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Get chart of accounts for revenue/other income
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class')
    .eq('org_id', orgId)
    .in('class', ['REVENUE', 'OTHERINCOME']);

  const revenueAccounts = (coaData ?? []) as unknown as Array<{
    id: string; name: string; code: string; class: string;
  }>;

  const revenueAccountIds = revenueAccounts.map((a) => a.id);

  // Fetch all revenue transactions
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', revenueAccountIds)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string; amount: number; account_id: string;
  }>;

  // Build account map
  const accountMap = new Map(revenueAccounts.map((a) => [a.id, a]));

  // Aggregate by account
  const accountData = new Map<string, RevenueAccount>();
  const allPeriods = new Set<string>();

  for (const row of rows) {
    const acct = accountMap.get(row.account_id);
    if (!acct) continue;

    allPeriods.add(row.period);

    if (!accountData.has(row.account_id)) {
      accountData.set(row.account_id, {
        accountId: row.account_id,
        accountName: acct.name,
        accountCode: acct.code,
        category: categoriseRevenue(acct.name),
        amounts: {},
        total: 0,
      });
    }

    const entry = accountData.get(row.account_id)!;
    entry.amounts[row.period] = (entry.amounts[row.period] ?? 0) + Number(row.amount);
    entry.total += Number(row.amount);
  }

  // Sort periods and take last 12
  const sortedPeriods = Array.from(allPeriods).sort().slice(-12);

  // Build period summaries
  const periodSummaries: RevenuePeriodSummary[] = sortedPeriods.map((period) => {
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const acct of accountData.values()) {
      const amount = acct.amounts[period] ?? 0;
      if (amount !== 0) {
        byCategory[acct.category] = (byCategory[acct.category] ?? 0) + amount;
        total += amount;
      }
    }

    return { period, label: monthLabel(period), total, byCategory };
  });

  // Category totals for pie chart
  const categoryTotals: Record<string, number> = {};
  for (const acct of accountData.values()) {
    categoryTotals[acct.category] = (categoryTotals[acct.category] ?? 0) + acct.total;
  }

  // Top accounts by total
  const topAccounts = Array.from(accountData.values())
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // Concentration metrics
  const totalRevenue = Array.from(accountData.values()).reduce((s, a) => s + Math.max(0, a.total), 0);
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const topCategoryPct = totalRevenue > 0 && sortedCategories.length > 0
    ? (sortedCategories[0][1] / totalRevenue) * 100
    : 0;

  // Growth rate
  const lastPeriodTotal = periodSummaries.length > 0 ? periodSummaries[periodSummaries.length - 1].total : 0;
  const prevPeriodTotal = periodSummaries.length > 1 ? periodSummaries[periodSummaries.length - 2].total : 0;
  const momGrowth = prevPeriodTotal > 0 ? ((lastPeriodTotal - prevPeriodTotal) / prevPeriodTotal) * 100 : 0;

  // YoY if possible
  const yoyPeriod = periodSummaries.length >= 12 ? periodSummaries[periodSummaries.length - 12] : null;
  const yoyGrowth = yoyPeriod && yoyPeriod.total > 0
    ? ((lastPeriodTotal - yoyPeriod.total) / yoyPeriod.total) * 100
    : null;

  return (
    <RevenueClient
      periodSummaries={periodSummaries}
      categoryTotals={categoryTotals}
      topAccounts={topAccounts}
      totalRevenue={totalRevenue}
      topCategoryName={sortedCategories[0]?.[0] ?? ''}
      topCategoryPct={topCategoryPct}
      momGrowth={momGrowth}
      yoyGrowth={yoyGrowth}
      lastPeriodTotal={lastPeriodTotal}
      periods={sortedPeriods}
    />
  );
}
