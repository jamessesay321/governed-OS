import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  computeNormalisedEBITDA,
  computeActionLevers,
  computeSensitivityMatrix,
  UK_SME_BENCHMARK_RATE,
  type NormalisedEBITDAResult,
  type ActionLever,
  type SensitivityScenario,
} from '@/lib/financial/normalised-ebitda';
import { BreakevenClient } from './breakeven-client';

// ── Exported types for client component ──

export interface BreakevenPageData {
  result: NormalisedEBITDAResult;
  levers: ActionLever[];
  sensitivityMatrix: SensitivityScenario[];
  hasData: boolean;
  periodRange: string;
  overheadBreakdown: OverheadCategory[];
  bridgeSteps: BridgeStep[];
  averageOrderValue: number;
}

export interface OverheadCategory {
  name: string;
  amount: number;
  isInterest: boolean;
  isDepreciation: boolean;
}

export interface BridgeStep {
  label: string;
  value: number;
  cumulative: number;
  type: 'revenue' | 'cost' | 'addback' | 'total';
}

// ── Helpers (same as valuation page) ──

function sumByClass(
  rows: Array<{ amount: number; account_id: string }>,
  accountMap: Map<string, { id: string; name: string; code: string; class: string; type: string }>,
  classes: string[],
): number {
  let total = 0;
  for (const row of rows) {
    const acct = accountMap.get(row.account_id);
    if (acct && classes.includes(acct.class)) {
      total += Number(row.amount);
    }
  }
  return total;
}

function sumByClassAndType(
  rows: Array<{ amount: number; account_id: string }>,
  accountMap: Map<string, { id: string; name: string; code: string; class: string; type: string }>,
  classValue: string,
  typePattern: RegExp,
): number {
  let total = 0;
  for (const row of rows) {
    const acct = accountMap.get(row.account_id);
    if (acct && acct.class === classValue && typePattern.test(acct.type)) {
      total += Number(row.amount);
    }
  }
  return total;
}

// ── Page ──

export default async function BreakevenPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // 1. Fetch chart of accounts
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class, type')
    .eq('org_id', orgId);

  const allAccounts = (coaData ?? []) as unknown as Array<{
    id: string; name: string; code: string; class: string; type: string;
  }>;

  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));

  // 2. Fetch normalised_financials
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string; amount: number; account_id: string;
  }>;

  // Get distinct periods sorted chronologically
  const allPeriods = [...new Set(rows.map((r) => r.period))].sort();
  const last12Periods = allPeriods.slice(-12);

  // Filter to last 12 months
  const annualRows = rows.filter((r) => last12Periods.includes(r.period));

  // 3. Compute financials (same as valuation page)
  const annualRevenue = Math.abs(sumByClass(annualRows, accountMap, ['REVENUE', 'OTHERINCOME']));
  const directCosts = Math.abs(sumByClass(annualRows, accountMap, ['DIRECTCOSTS']));
  const overheads = Math.abs(sumByClass(annualRows, accountMap, ['OVERHEADS']));

  // Depreciation add-back
  const depreciation = Math.abs(
    sumByClassAndType(annualRows, accountMap, 'OVERHEADS', /depreciation|amortis/i),
  );

  // Interest add-back
  const interestExpense = Math.abs(
    sumByClassAndType(annualRows, accountMap, 'OVERHEADS', /interest/i),
  );

  // 4. Fetch debt facilities (active lenders with rates)
  const { data: debtData } = await supabase
    .from('debt_facilities')
    .select('current_balance, effective_apr, interest_rate, category, status')
    .eq('org_id', orgId)
    .eq('status', 'active');

  const debtFacilities = (debtData ?? []) as unknown as Array<{
    current_balance: number;
    effective_apr: number;
    interest_rate: number;
    category: string;
    status: string;
  }>;

  // 5. Compute current monthly revenue (latest period or average)
  const latestPeriodRows = rows.filter((r) => r.period === last12Periods[last12Periods.length - 1]);
  const latestMonthRevenue = Math.abs(sumByClass(latestPeriodRows, accountMap, ['REVENUE', 'OTHERINCOME']));
  const avgMonthlyRevenue = annualRevenue / Math.max(last12Periods.length, 1);
  const currentMonthlyRevenue = latestMonthRevenue > 0 ? latestMonthRevenue : avgMonthlyRevenue;

  // 6. Calculate monthly revenue growth rate from trailing data
  let monthlyRevenueGrowthRate = 0;
  if (last12Periods.length >= 6) {
    const firstHalfPeriods = last12Periods.slice(0, 6);
    const secondHalfPeriods = last12Periods.slice(-6);
    const firstHalfRows = rows.filter((r) => firstHalfPeriods.includes(r.period));
    const secondHalfRows = rows.filter((r) => secondHalfPeriods.includes(r.period));
    const firstHalfRevenue = Math.abs(sumByClass(firstHalfRows, accountMap, ['REVENUE', 'OTHERINCOME']));
    const secondHalfRevenue = Math.abs(sumByClass(secondHalfRows, accountMap, ['REVENUE', 'OTHERINCOME']));
    if (firstHalfRevenue > 0) {
      const sixMonthGrowth = (secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue;
      monthlyRevenueGrowthRate = sixMonthGrowth / 6;
    }
  }

  // 7. Compute normalised EBITDA
  const result = computeNormalisedEBITDA({
    revenue: annualRevenue,
    directCosts,
    overheads,
    depreciationAddback: depreciation,
    interestAddback: interestExpense,
    debtFacilities,
    benchmarkRate: UK_SME_BENCHMARK_RATE,
    currentMonthlyRevenue,
    monthlyRevenueGrowthRate,
  });

  // 8. Compute action levers
  const averageOrderValue = 8957; // Alonuko bridal average
  const levers = computeActionLevers(result, averageOrderValue);

  // 9. Compute sensitivity matrix
  const sensitivityMatrix = computeSensitivityMatrix(result);

  // 10. Build overhead breakdown for cost analysis
  const overheadByAccount = new Map<string, { name: string; total: number; isInterest: boolean; isDepreciation: boolean }>();
  for (const row of annualRows) {
    const acct = accountMap.get(row.account_id);
    if (acct && acct.class === 'OVERHEADS') {
      const existing = overheadByAccount.get(row.account_id);
      const isInterest = /interest/i.test(acct.type) || /interest/i.test(acct.name);
      const isDepreciation = /depreciation|amortis/i.test(acct.type) || /depreciation|amortis/i.test(acct.name);
      if (existing) {
        existing.total += Math.abs(Number(row.amount));
      } else {
        overheadByAccount.set(row.account_id, {
          name: acct.name,
          total: Math.abs(Number(row.amount)),
          isInterest,
          isDepreciation,
        });
      }
    }
  }

  const overheadBreakdown: OverheadCategory[] = [...overheadByAccount.values()]
    .map((v) => ({
      name: v.name,
      amount: v.total,
      isInterest: v.isInterest,
      isDepreciation: v.isDepreciation,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 11. Build EBITDA bridge steps
  const bridgeSteps: BridgeStep[] = [];
  let cumulative = annualRevenue;
  bridgeSteps.push({
    label: 'Revenue',
    value: annualRevenue,
    cumulative,
    type: 'revenue',
  });

  cumulative -= directCosts;
  bridgeSteps.push({
    label: 'Direct Costs',
    value: -directCosts,
    cumulative,
    type: 'cost',
  });

  cumulative -= overheads;
  bridgeSteps.push({
    label: 'Overheads',
    value: -overheads,
    cumulative,
    type: 'cost',
  });

  cumulative += depreciation;
  bridgeSteps.push({
    label: 'D&A Addback',
    value: depreciation,
    cumulative,
    type: 'addback',
  });

  cumulative += interestExpense;
  bridgeSteps.push({
    label: 'Interest Addback',
    value: interestExpense,
    cumulative,
    type: 'addback',
  });

  bridgeSteps.push({
    label: 'EBITDA',
    value: result.ebitda,
    cumulative: result.ebitda,
    type: 'total',
  });

  // 12. Period range label
  const periodRange =
    last12Periods.length > 0
      ? `${formatPeriodLabel(last12Periods[0])} - ${formatPeriodLabel(last12Periods[last12Periods.length - 1])}`
      : 'No data';

  const hasData = annualRows.length > 0;

  return (
    <BreakevenClient
      data={{
        result,
        levers,
        sensitivityMatrix,
        hasData,
        periodRange,
        overheadBreakdown,
        bridgeSteps,
        averageOrderValue,
      }}
    />
  );
}

// ── Period formatter ──

function formatPeriodLabel(period: string): string {
  try {
    const date = new Date(period);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  } catch {
    return period;
  }
}
