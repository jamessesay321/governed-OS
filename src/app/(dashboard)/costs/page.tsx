import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { analyseCostStructure, type CostStructureSummary } from '@/lib/financial/cost-structure';
import { CostsClient } from './costs-client';

// ── Types ──

export interface CostAccount {
  accountId: string;
  accountName: string;
  accountCode: string;
  category: string;
  xeroClass: string;
  amounts: Record<string, number>;
  total: number;
}

export interface CostPeriodSummary {
  period: string;
  label: string;
  directCosts: number;
  overheads: number;
  total: number;
  byCategory: Record<string, number>;
}

// ── Category Mapping ──

const COST_CATEGORIES: Array<{ pattern: RegExp; category: string }> = [
  // Direct costs - Production
  { pattern: /CoS.*Bridal.*Bespoke/i, category: 'CoGS – Bridal Bespoke' },
  { pattern: /CoS.*Bridal.*MTO|CoS.*Made.to.Order/i, category: 'CoGS – Bridal MTO' },
  { pattern: /CoS.*Ready.to.Wear/i, category: 'CoGS – Ready to Wear' },
  { pattern: /CoS.*Under.?garment/i, category: 'CoGS – Undergarments' },
  { pattern: /CoS.*Robe/i, category: 'CoGS – Robes' },
  { pattern: /CoS.*Accessor/i, category: 'CoGS – Accessories' },
  { pattern: /CoS.*Wholesale/i, category: 'CoGS – Wholesale' },
  { pattern: /CoS.*Evening/i, category: 'CoGS – Evening Wear' },
  { pattern: /CoS.*Other/i, category: 'CoGS – Other' },
  { pattern: /Cost of sales/i, category: 'CoGS – General' },

  // Direct costs - Materials
  { pattern: /^Fabric$/i, category: 'Materials – Fabric' },
  { pattern: /Embroidery/i, category: 'Materials – Embroidery' },
  { pattern: /Sewing Accessor/i, category: 'Materials – Sewing Accessories' },
  { pattern: /Purchases(?! USD)/i, category: 'Materials – General Purchases' },
  { pattern: /Purchases USD/i, category: 'Materials – Purchases (USD)' },

  // Direct costs - Staff (allocated to production)
  { pattern: /Bridal production/i, category: 'Staff – Bridal Production' },
  { pattern: /Samples production/i, category: 'Staff – Samples Production' },
  { pattern: /Production manager/i, category: 'Staff – Production Manager' },
  { pattern: /Development manager/i, category: 'Staff – Development' },
  { pattern: /Product development/i, category: 'Staff – Product Development' },
  { pattern: /Social media manager/i, category: 'Staff – Social Media' },
  { pattern: /Customer service/i, category: 'Staff – Customer Service' },
  { pattern: /CEO personal assistant/i, category: 'Staff – CEO PA' },

  // Direct costs - Other
  { pattern: /Freelance/i, category: 'Freelance & Outsourcing' },
  { pattern: /Shipping Cost/i, category: 'Shipping Costs' },
  { pattern: /Opening|Closing|stock/i, category: 'Stock Movements' },

  // Overheads - Loan Interest
  { pattern: /BBL interest/i, category: 'Interest – BBL' },
  { pattern: /Capital on Tap/i, category: 'Interest – Capital on Tap' },
  { pattern: /Lenkie/i, category: 'Interest – Lenkie' },
  { pattern: /MaxCap|MAxCap/i, category: 'Interest – MaxCap' },
  { pattern: /Iwoca/i, category: 'Interest – Iwoca' },
  { pattern: /YouLend/i, category: 'Interest – YouLend' },
  { pattern: /Bizcap/i, category: 'Interest – BizCap' },
  { pattern: /GotCap/i, category: 'Interest – GotCap' },
  { pattern: /Swift interest/i, category: 'Interest – Swift' },
  { pattern: /Interest payable|Interest Expense/i, category: 'Interest – General' },
  { pattern: /Loan fees/i, category: 'Loan Fees' },
  { pattern: /Bank overdraft/i, category: 'Bank Overdraft Interest' },

  // Overheads - Premises
  { pattern: /^Rent$/i, category: 'Premises – Rent' },
  { pattern: /Accommodation/i, category: 'Premises – Accommodation' },
  { pattern: /^Rates$/i, category: 'Premises – Rates' },
  { pattern: /Gas.*Electric|Light.*heat/i, category: 'Premises – Utilities' },
  { pattern: /Cleaning/i, category: 'Premises – Cleaning' },
  { pattern: /Business Storage/i, category: 'Premises – Storage' },

  // Overheads - Professional
  { pattern: /Accountancy/i, category: 'Professional – Accounting' },
  { pattern: /Legal/i, category: 'Professional – Legal' },
  { pattern: /Consultancy/i, category: 'Professional – Consulting' },

  // Overheads - Marketing
  { pattern: /Advertising/i, category: 'Marketing – Advertising' },
  { pattern: /Marketing Material/i, category: 'Marketing – Materials' },
  { pattern: /Media Management/i, category: 'Marketing – Media Management' },
  { pattern: /Photoshoot/i, category: 'Marketing – Photoshoots' },

  // Overheads - Technology
  { pattern: /Software/i, category: 'Technology – Software' },
  { pattern: /Website/i, category: 'Technology – Website' },
  { pattern: /Computer/i, category: 'Technology – Computing' },
  { pattern: /Internet.*Telephone|IT.*Telephone/i, category: 'Technology – Telecom' },

  // Overheads - Payment/Bank Fees
  { pattern: /Bank charge/i, category: 'Payment Fees – Bank' },
  { pattern: /Credit card charge/i, category: 'Payment Fees – Credit Card' },
  { pattern: /Sales Merchant|Stripe Fee|PayPal fee|Revolut Merchant|Square Fee|Square Third/i, category: 'Payment Fees – Merchant' },
  { pattern: /Paypal Currency|Paypal Uncategorised|Square Chargeback/i, category: 'Payment Fees – Other' },
  { pattern: /Shopify Fee/i, category: 'Payment Fees – Shopify' },

  // Overheads - Staff (general)
  { pattern: /Wages.*Salaries/i, category: 'Staff – General Wages' },
  { pattern: /Director.*remuneration/i, category: 'Staff – Director Pay' },
  { pattern: /Employers? NIC/i, category: 'Staff – Employer NIC' },
  { pattern: /Employers? Pension|Smart Pension|^Pensions$/i, category: 'Staff – Employer Pension' },
  { pattern: /Payroll Expense/i, category: 'Staff – Payroll' },
  { pattern: /Staff training/i, category: 'Staff – Training' },
  { pattern: /Recruitment/i, category: 'Staff – Recruitment' },
  { pattern: /Intern/i, category: 'Staff – Interns' },
  { pattern: /Directors.*pension/i, category: 'Staff – Director Pension' },
  { pattern: /Cost of Labour/i, category: 'Staff – Labour' },

  // Overheads - Travel
  { pattern: /Trunk Show/i, category: 'Trunk Shows' },
  { pattern: /Travel|Travelling|Motor|Subsistence/i, category: 'Travel & Subsistence' },

  // Overheads - Other
  { pattern: /Insurance/i, category: 'Insurance' },
  { pattern: /Corporation Tax/i, category: 'Corporation Tax' },
  { pattern: /Depreciation/i, category: 'Depreciation' },
  { pattern: /Dividend/i, category: 'Dividends' },
  { pattern: /Equipment/i, category: 'Equipment' },
  { pattern: /Events/i, category: 'Events' },
  { pattern: /Studio expense/i, category: 'Studio Expenses' },
  { pattern: /Donation/i, category: 'Donations' },
  { pattern: /Entertaining|Refreshment|Food/i, category: 'Entertainment' },
  { pattern: /Printing|postage|Stationery|Postage.*Shipping/i, category: 'Postage & Stationery' },
  { pattern: /Repairs|maintenance/i, category: 'Repairs & Maintenance' },
  { pattern: /Subscriptions/i, category: 'Subscriptions' },
  { pattern: /Supplies|Office expense/i, category: 'Office Supplies' },
  { pattern: /Currency|Revaluation/i, category: 'Currency Adjustments' },
  { pattern: /Bad debt/i, category: 'Bad Debts' },
  { pattern: /self assessment/i, category: 'Self Assessment' },
  { pattern: /Reconciliation/i, category: 'Reconciliation' },
  { pattern: /Suspense/i, category: 'Suspense' },
  { pattern: /Acuity/i, category: 'Booking Fees (Acuity)' },
  { pattern: /Agency/i, category: 'Agency Services' },
  { pattern: /Vehicle Lease/i, category: 'Vehicle Lease' },
  { pattern: /Courier/i, category: 'Courier & Delivery' },
  { pattern: /Refund/i, category: 'Refunds' },
  { pattern: /Out of Pocket/i, category: 'Out of Pocket' },
  { pattern: /Sundry/i, category: 'Sundry' },
  { pattern: /Uncategorised/i, category: 'Uncategorised' },
];

function categoriseCost(accountName: string): string {
  for (const { pattern, category } of COST_CATEGORIES) {
    if (pattern.test(accountName)) return category;
  }
  return 'Other Expenses';
}

// Higher-level grouping for summary
const COST_GROUPS: Record<string, string> = {
  'CoGS': 'Cost of Goods Sold',
  'Materials': 'Direct Materials',
  'Staff': 'Staff Costs',
  'Interest': 'Interest Expense',
  'Premises': 'Premises & Rent',
  'Professional': 'Professional Fees',
  'Marketing': 'Marketing & Advertising',
  'Technology': 'Technology',
  'Payment Fees': 'Payment & Bank Fees',
  'Freelance': 'Freelance & Outsourcing',
  'Trunk Shows': 'Trunk Shows',
  'Travel': 'Travel & Subsistence',
};

function getCostGroup(category: string): string {
  for (const [prefix, group] of Object.entries(COST_GROUPS)) {
    if (category.startsWith(prefix)) return group;
  }
  return 'Other Overheads';
}

function monthLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ── Page ──

export default async function CostsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Get chart of accounts for cost accounts
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class, type')
    .eq('org_id', orgId)
    .in('class', ['EXPENSE', 'DIRECTCOSTS', 'OVERHEADS']);

  const costAccounts = (coaData ?? []) as unknown as Array<{
    id: string; name: string; code: string; class: string; type: string;
  }>;

  const costAccountIds = costAccounts.map((a) => a.id);

  // Fetch all cost transactions
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', costAccountIds)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string; amount: number; account_id: string;
  }>;

  // Build account map
  const accountMap = new Map(costAccounts.map((a) => [a.id, a]));

  // Aggregate by account
  const accountData = new Map<string, CostAccount>();
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
        category: categoriseCost(acct.name),
        xeroClass: acct.class,
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
  const periodSummaries: CostPeriodSummary[] = sortedPeriods.map((period) => {
    const byCategory: Record<string, number> = {};
    let directCosts = 0;
    let overheads = 0;
    let total = 0;

    for (const acct of accountData.values()) {
      const amount = acct.amounts[period] ?? 0;
      if (amount !== 0) {
        byCategory[acct.category] = (byCategory[acct.category] ?? 0) + amount;
        total += amount;
        if (acct.xeroClass === 'DIRECTCOSTS') {
          directCosts += amount;
        } else {
          overheads += amount;
        }
      }
    }

    return { period, label: monthLabel(period), directCosts, overheads, total, byCategory };
  });

  // Category totals (detailed)
  const categoryTotals: Record<string, number> = {};
  for (const acct of accountData.values()) {
    categoryTotals[acct.category] = (categoryTotals[acct.category] ?? 0) + acct.total;
  }

  // Group totals (high-level)
  const groupTotals: Record<string, number> = {};
  for (const [cat, total] of Object.entries(categoryTotals)) {
    const group = getCostGroup(cat);
    groupTotals[group] = (groupTotals[group] ?? 0) + total;
  }

  // Interest breakdown
  const interestTotal = Object.entries(categoryTotals)
    .filter(([cat]) => cat.startsWith('Interest'))
    .reduce((sum, [, v]) => sum + v, 0);

  // Top cost accounts
  const topAccounts = Array.from(accountData.values())
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Totals
  const totalCosts = Array.from(accountData.values()).reduce((s, a) => s + Math.max(0, a.total), 0);
  const totalDirectCosts = Array.from(accountData.values())
    .filter((a) => a.xeroClass === 'DIRECTCOSTS')
    .reduce((s, a) => s + Math.max(0, a.total), 0);
  const totalOverheads = totalCosts - totalDirectCosts;

  // Get revenue for gross margin calculation
  const { data: revCoaData } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('org_id', orgId)
    .in('class', ['REVENUE', 'OTHERINCOME']);

  const revIds = ((revCoaData ?? []) as unknown as Array<{ id: string }>).map((a) => a.id);

  let totalRevenue = 0;
  if (revIds.length > 0) {
    const { data: revFinancials } = await supabase
      .from('normalised_financials')
      .select('amount')
      .eq('org_id', orgId)
      .in('account_id', revIds)
      .in('period', sortedPeriods);

    totalRevenue = ((revFinancials ?? []) as unknown as Array<{ amount: number }>)
      .reduce((s, r) => s + Number(r.amount), 0);
  }

  // MoM growth
  const lastPeriodTotal = periodSummaries.length > 0 ? periodSummaries[periodSummaries.length - 1].total : 0;
  const prevPeriodTotal = periodSummaries.length > 1 ? periodSummaries[periodSummaries.length - 2].total : 0;
  const momGrowth = prevPeriodTotal > 0 ? ((lastPeriodTotal - prevPeriodTotal) / prevPeriodTotal) * 100 : 0;

  // Cost-to-revenue ratio
  const costToRevenueRatio = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0;

  // Group period data for stacked chart
  const groupPeriodData = sortedPeriods.map((period) => {
    const row: Record<string, number | string> = { label: monthLabel(period) };
    for (const acct of accountData.values()) {
      const amount = acct.amounts[period] ?? 0;
      if (amount !== 0) {
        const group = getCostGroup(acct.category);
        row[group] = ((row[group] as number) ?? 0) + amount;
      }
    }
    return row;
  });

  // Auto-classify costs as fixed/variable/discretionary
  const costStructure = analyseCostStructure(
    Array.from(accountData.values()).map(a => ({
      accountId: a.accountId,
      accountName: a.accountName,
      accountCode: a.accountCode,
      xeroClass: a.xeroClass,
      total: a.total,
    })),
    totalRevenue,
    sortedPeriods.length
  );

  return (
    <CostsClient
      periodSummaries={periodSummaries}
      categoryTotals={categoryTotals}
      groupTotals={groupTotals}
      groupPeriodData={groupPeriodData}
      topAccounts={topAccounts}
      totalCosts={totalCosts}
      totalDirectCosts={totalDirectCosts}
      totalOverheads={totalOverheads}
      totalRevenue={totalRevenue}
      interestTotal={interestTotal}
      costToRevenueRatio={costToRevenueRatio}
      momGrowth={momGrowth}
      lastPeriodTotal={lastPeriodTotal}
      costStructure={costStructure}
    />
  );
}
