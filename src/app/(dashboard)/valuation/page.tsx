import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { ValuationClient } from './valuation-client';

// ── Exported Types ──

export interface ValuationMetrics {
  annualRevenue: number;
  ebitda: number;
  netDebt: number;
  cashBalance: number;
  workingCapital: number;
}

export interface ValuationMultipleResult {
  multiple: number;
  enterpriseValue: number;
  equityValue: number;
}

export interface SensitivityCell {
  ebitdaScenarioLabel: string;
  ebitdaScenarioValue: number;
  multiple: number;
  equityValue: number;
}

export interface BridgeStep {
  label: string;
  value: number;
  cumulative: number;
  type: 'base' | 'add' | 'subtract';
}

export interface ComparableBenchmark {
  metric: string;
  sectorLow: number;
  sectorHigh: number;
  alonukoValue: number;
  unit: string;
}

// ── Business Plan Data (from Alonuko Business Plan 2025) ──

export interface RevenueTrajectoryPoint {
  year: string;
  revenue: number;
  isProjection: boolean;
  yoyGrowth: string;
}

export interface ProductMargin {
  product: string;
  grossMargin: number;
  operatingMargin: number | null;
  color: string;
}

export interface FundraiseContext {
  raising: number;
  preMoneyValuation: number;
  structure: string;
  impliedRevenueMultiple: number;
}

export interface ExitScenario {
  year: string;
  targetRevenue: number;
  targetEbitdaMargin: number;
  targetEbitda: number;
  floorMultiple: number;
  floorValuation: number;
  investorReturnMultiple: string;
}

export interface MarketOpportunity {
  market: string;
  size: string;
  sizeGBP: string;
}

export interface ProfitabilityMilestone {
  year: string;
  target: string;
  status: 'achieved' | 'in-progress' | 'planned';
}

export interface BusinessPlanData {
  revenueTrajectory: RevenueTrajectoryPoint[];
  productMargins: ProductMargin[];
  fundraise: FundraiseContext;
  exitScenario: ExitScenario;
  markets: MarketOpportunity[];
  profitabilityPath: ProfitabilityMilestone[];
  keyMetrics: { label: string; value: string; detail: string }[];
  teamSize: number;
  usRevenueShare: number;
  /** True if projections are pulled from a linked scenario */
  scenarioLinked: boolean;
}

export interface ValuationData {
  metrics: ValuationMetrics;
  revenueMultiples: ValuationMultipleResult[];
  ebitdaMultiples: ValuationMultipleResult[];
  sensitivityMatrix: SensitivityCell[];
  ebitdaScenarioLabels: string[];
  ebitdaMultipleValues: number[];
  bridge: BridgeStep[];
  comparables: ComparableBenchmark[];
  hasData: boolean;
  midEbitdaMultiple: number;
  businessPlan: BusinessPlanData;
}

// ── Helpers ──

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

export default async function ValuationPage() {
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

  // 2. Fetch last 24 months of normalised_financials
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

  // Filter rows to last 12 months for annual figures
  const annualRows = rows.filter((r) => last12Periods.includes(r.period));

  // 3. Compute Revenue (REVENUE + OTHERINCOME are typically positive in P&L)
  const annualRevenue = Math.abs(sumByClass(annualRows, accountMap, ['REVENUE', 'OTHERINCOME']));

  // 4. Compute EBITDA
  //    EBITDA = Revenue - Direct Costs - Overheads + Depreciation + Interest (add-back)
  const directCosts = Math.abs(sumByClass(annualRows, accountMap, ['DIRECTCOSTS']));
  const overheads = Math.abs(sumByClass(annualRows, accountMap, ['OVERHEADS']));

  // Depreciation add-back: search overheads for depreciation/amortisation
  const depreciation = Math.abs(
    sumByClassAndType(annualRows, accountMap, 'OVERHEADS', /depreciation|amortis/i)
  );

  // Interest add-back: search overheads for interest expense
  const interestExpense = Math.abs(
    sumByClassAndType(annualRows, accountMap, 'OVERHEADS', /interest/i)
  );

  const ebitda = annualRevenue - directCosts - overheads + depreciation + interestExpense;

  // 5. Fetch net debt from debt_facilities
  const { data: debtData } = await supabase
    .from('debt_facilities')
    .select('current_balance, status')
    .eq('org_id', orgId)
    .eq('status', 'active');

  const debtRows = (debtData ?? []) as unknown as Array<{
    current_balance: number; status: string;
  }>;

  const netDebt = debtRows.reduce((sum, d) => sum + Number(d.current_balance), 0);

  // 6. Working capital: Current Assets - Current Liabilities
  //    Use ASSET class with "CURRENT" type and LIABILITY class with "CURRENT" type
  //    Fallback: use BANK class as a proxy for cash
  const latestPeriod = allPeriods[allPeriods.length - 1];
  const latestRows = rows.filter((r) => r.period === latestPeriod);

  // Cash = BANK class accounts (typically positive)
  const cashBalance = Math.abs(sumByClass(latestRows, accountMap, ['BANK']));

  // Current assets (ASSET type containing 'CURRENT' or bank)
  const currentAssets = Math.abs(
    sumByClassAndType(latestRows, accountMap, 'ASSET', /current/i)
  ) + cashBalance;

  // Current liabilities
  const currentLiabilities = Math.abs(
    sumByClassAndType(latestRows, accountMap, 'LIABILITY', /current/i)
  );

  const workingCapital = currentAssets - currentLiabilities;

  const metrics: ValuationMetrics = {
    annualRevenue,
    ebitda,
    netDebt,
    cashBalance,
    workingCapital,
  };

  const hasData = annualRows.length > 0;

  // 7. Revenue multiples
  const revMultiples = [0.5, 1, 1.5, 2, 3];
  const revenueMultiples: ValuationMultipleResult[] = revMultiples.map((m) => {
    const ev = annualRevenue * m;
    return { multiple: m, enterpriseValue: ev, equityValue: ev - netDebt + cashBalance };
  });

  // 8. EBITDA multiples
  const ebitdaMultipleValues = [3, 5, 7, 10, 12];
  const ebitdaMultiples: ValuationMultipleResult[] = ebitdaMultipleValues.map((m) => {
    const ev = ebitda * m;
    return { multiple: m, enterpriseValue: ev, equityValue: ev - netDebt + cashBalance };
  });

  // 9. Mid-range EBITDA multiple for bridge (7x)
  const midEbitdaMultiple = 7;
  const midEV = ebitda * midEbitdaMultiple;
  const midEquity = midEV - netDebt + cashBalance;

  const bridge: BridgeStep[] = [
    { label: `EBITDA (${midEbitdaMultiple}x)`, value: midEV, cumulative: midEV, type: 'base' },
    { label: 'Less: Net Debt', value: -netDebt, cumulative: midEV - netDebt, type: 'subtract' },
    { label: 'Plus: Cash', value: cashBalance, cumulative: midEquity, type: 'add' },
    { label: 'Equity Value', value: midEquity, cumulative: midEquity, type: 'base' },
  ];

  // 10. Sensitivity matrix
  const ebitdaScenarios = [
    { label: '-20%', factor: 0.8 },
    { label: '-10%', factor: 0.9 },
    { label: 'Base', factor: 1.0 },
    { label: '+10%', factor: 1.1 },
    { label: '+20%', factor: 1.2 },
  ];

  const sensitivityMatrix: SensitivityCell[] = [];

  for (const scenario of ebitdaScenarios) {
    for (const m of ebitdaMultipleValues) {
      const scenarioEbitda = ebitda * scenario.factor;
      const ev = scenarioEbitda * m;
      const equity = ev - netDebt + cashBalance;
      sensitivityMatrix.push({
        ebitdaScenarioLabel: scenario.label,
        ebitdaScenarioValue: scenarioEbitda,
        multiple: m,
        equityValue: equity,
      });
    }
  }

  // 11. Comparable benchmarks (fashion/retail sector)
  const alonukoRevMultiple = annualRevenue > 0
    ? (ebitda * midEbitdaMultiple) / annualRevenue
    : 0;
  const alonukoEbitdaMultiple = midEbitdaMultiple;
  const alonukoEbitdaMargin = annualRevenue > 0 ? (ebitda / annualRevenue) * 100 : 0;

  const comparables: ComparableBenchmark[] = [
    {
      metric: 'Revenue Multiple (EV/Revenue)',
      sectorLow: 0.5,
      sectorHigh: 1.5,
      alonukoValue: alonukoRevMultiple,
      unit: 'x',
    },
    {
      metric: 'EBITDA Multiple (EV/EBITDA)',
      sectorLow: 4,
      sectorHigh: 8,
      alonukoValue: alonukoEbitdaMultiple,
      unit: 'x',
    },
    {
      metric: 'EBITDA Margin',
      sectorLow: 5,
      sectorHigh: 15,
      alonukoValue: alonukoEbitdaMargin,
      unit: '%',
    },
  ];

  // ── Business Plan Data ──
  // LIVE DATA: Revenue history, margins, team size derived from platform
  // SCENARIO-LINKED: Forward projections pulled from scenario if available
  // STATIC: Deal terms (fundraise structure) and market sizes

  // 12a. Revenue by calendar year — derived from normalised_financials
  const revenueByYear = new Map<number, number>();
  for (const row of rows) {
    const acct = accountMap.get(row.account_id);
    if (acct && ['REVENUE', 'OTHERINCOME'].includes(acct.class)) {
      const year = new Date(row.period).getFullYear();
      revenueByYear.set(year, (revenueByYear.get(year) ?? 0) + Math.abs(Number(row.amount)));
    }
  }

  // 12b. Actual gross margin — revenue vs direct costs per year
  const directCostsByYear = new Map<number, number>();
  for (const row of rows) {
    const acct = accountMap.get(row.account_id);
    if (acct && acct.class === 'DIRECTCOSTS') {
      const year = new Date(row.period).getFullYear();
      directCostsByYear.set(year, (directCostsByYear.get(year) ?? 0) + Math.abs(Number(row.amount)));
    }
  }

  // 12c. Count distinct payroll accounts as a proxy for team size
  const payrollAccountIds = new Set<string>();
  for (const acct of allAccounts) {
    if (/wage|salary|payroll|paye|ni\b|pension|employer/i.test(acct.name)) {
      payrollAccountIds.add(acct.id);
    }
  }
  // Count unique payroll accounts with non-zero activity in last 3 months
  const recentPeriods = allPeriods.slice(-3);
  const activePayrollAccounts = new Set<string>();
  for (const row of rows) {
    if (payrollAccountIds.has(row.account_id) && recentPeriods.includes(row.period) && Number(row.amount) !== 0) {
      activePayrollAccounts.add(row.account_id);
    }
  }

  // 12d. Marketing spend as % of revenue (from overheads matching marketing patterns)
  const marketingSpend = rows
    .filter((r) => {
      const acct = accountMap.get(r.account_id);
      return acct && /marketing|advertising|social media|pr |promotion|content/i.test(acct.name);
    })
    .filter((r) => last12Periods.includes(r.period))
    .reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0);
  const marketingPct = annualRevenue > 0 ? (marketingSpend / annualRevenue) * 100 : 0;

  // Build revenue trajectory from live data + scenario projections
  const sortedYears = [...revenueByYear.keys()].sort();
  const liveRevenueTrajectory: RevenueTrajectoryPoint[] = sortedYears.map((year, i) => {
    const rev = revenueByYear.get(year) ?? 0;
    const prevRev = i > 0 ? (revenueByYear.get(sortedYears[i - 1]) ?? 0) : 0;
    const yoyGrowth = i > 0 && prevRev > 0
      ? `${Math.round(((rev - prevRev) / prevRev) * 100)}%`
      : '';
    return { year: String(year), revenue: rev, isProjection: false, yoyGrowth };
  });

  // 12e. Try to fetch forward projections from a scenario named "Business Plan*"
  let scenarioProjections: RevenueTrajectoryPoint[] = [];
  let scenarioLinked = false;
  try {
    const { data: scenarioData } = await supabase
      .from('scenarios')
      .select('id, name')
      .eq('org_id', orgId)
      .ilike('name', 'Business Plan%')
      .order('created_at', { ascending: false })
      .limit(1);

    if (scenarioData && scenarioData.length > 0) {
      const scenarioId = (scenarioData[0] as { id: string }).id;
      // Get latest model version
      const { data: mvData } = await supabase
        .from('model_versions')
        .select('id')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (mvData && mvData.length > 0) {
        const mvId = (mvData[0] as { id: string }).id;
        const { data: snapshots } = await supabase
          .from('model_snapshots')
          .select('period, revenue')
          .eq('model_version_id', mvId)
          .order('period', { ascending: true });

        if (snapshots && snapshots.length > 0) {
          scenarioLinked = true;
          // Aggregate by year
          const projByYear = new Map<number, number>();
          for (const snap of snapshots as Array<{ period: string; revenue: number }>) {
            const yr = new Date(snap.period).getFullYear();
            projByYear.set(yr, (projByYear.get(yr) ?? 0) + Number(snap.revenue));
          }
          const existingYears = new Set(sortedYears);
          const projYears = [...projByYear.keys()].filter((y) => !existingYears.has(y)).sort();
          let prevRev = liveRevenueTrajectory.length > 0
            ? liveRevenueTrajectory[liveRevenueTrajectory.length - 1].revenue
            : 0;
          for (const yr of projYears) {
            const rev = projByYear.get(yr) ?? 0;
            const yoyGrowth = prevRev > 0 ? `${Math.round(((rev - prevRev) / prevRev) * 100)}%` : '';
            scenarioProjections.push({
              year: `${yr}E`,
              revenue: rev,
              isProjection: true,
              yoyGrowth,
            });
            prevRev = rev;
          }
        }
      }
    }
  } catch {
    // Scenario tables may not exist yet
  }

  // Fall back to business plan targets if no scenario linked
  if (scenarioProjections.length === 0) {
    const lastActualYear = sortedYears[sortedYears.length - 1] ?? 2024;
    const lastActualRev = revenueByYear.get(lastActualYear) ?? 0;
    // Business Plan 2025 targets
    const targets = [
      { year: lastActualYear + 1, revenue: 2_000_000 },
      { year: lastActualYear + 2, revenue: 5_000_000 },
      { year: lastActualYear + 3, revenue: 10_000_000 },
    ].filter((t) => !revenueByYear.has(t.year)); // Don't overlap with actuals

    let prevRev = lastActualRev;
    for (const t of targets) {
      const yoyGrowth = prevRev > 0 ? `${Math.round(((t.revenue - prevRev) / prevRev) * 100)}%` : '';
      scenarioProjections.push({
        year: `${t.year}E`,
        revenue: t.revenue,
        isProjection: true,
        yoyGrowth,
      });
      prevRev = t.revenue;
    }
  }

  const revenueTrajectory = [...liveRevenueTrajectory, ...scenarioProjections];

  // 12f. Actual gross margin (latest full year)
  const latestFullYear = sortedYears[sortedYears.length - 1];
  const latestYearRev = revenueByYear.get(latestFullYear ?? 0) ?? 0;
  const latestYearCoS = directCostsByYear.get(latestFullYear ?? 0) ?? 0;
  const actualGrossMargin = latestYearRev > 0 ? ((latestYearRev - latestYearCoS) / latestYearRev) * 100 : 0;
  const actualEbitdaMargin = annualRevenue > 0 ? (ebitda / annualRevenue) * 100 : 0;

  // Product margins: use business plan targets (product-level isn't in Xero)
  const productMargins: ProductMargin[] = [
    { product: 'Bridal (Bespoke)', grossMargin: 60, operatingMargin: 50, color: '#7c3aed' },
    { product: 'Ready to Wear', grossMargin: 70, operatingMargin: 60, color: '#06b6d4' },
    { product: 'Evening Wear', grossMargin: 70, operatingMargin: 60, color: '#f59e0b' },
    { product: 'Robes & Lingerie', grossMargin: 90, operatingMargin: null, color: '#ec4899' },
  ];

  // Static deal terms
  const fundraise: FundraiseContext = {
    raising: 400_000,
    preMoneyValuation: 5_000_000,
    structure: 'SeedFAST',
    impliedRevenueMultiple: annualRevenue > 0 ? 5_000_000 / annualRevenue : 3.6,
  };

  // Exit scenario — uses latest actual revenue to compute forward targets
  const exitTargetRevenue = 10_000_000;
  const exitTargetEbitdaMargin = 15;
  const exitFloorMultiple = 4.5;
  const exitScenario: ExitScenario = {
    year: '2027',
    targetRevenue: exitTargetRevenue,
    targetEbitdaMargin: exitTargetEbitdaMargin,
    targetEbitda: exitTargetRevenue * (exitTargetEbitdaMargin / 100),
    floorMultiple: exitFloorMultiple,
    floorValuation: exitTargetRevenue * exitFloorMultiple,
    investorReturnMultiple: `${Math.round((exitTargetRevenue * exitFloorMultiple) / fundraise.preMoneyValuation)}x`,
  };

  const markets: MarketOpportunity[] = [
    { market: 'US Bridal Wear', size: '$28bn', sizeGBP: '£22bn' },
    { market: 'Global Evening Dress', size: '$1.8bn', sizeGBP: '£1.4bn' },
  ];

  // Profitability path — auto-determine status from live EBITDA
  const profitabilityPath: ProfitabilityMilestone[] = [
    {
      year: '2025',
      target: 'Reduce losses via CoGS analysis & debt refinancing',
      status: ebitda > 0 ? 'achieved' : 'in-progress',
    },
    {
      year: '2026',
      target: 'EBITDA positive by year-end',
      status: ebitda > 0 ? 'achieved' : 'planned',
    },
    { year: '2027', target: 'EBITDA margin of at least 15%', status: actualEbitdaMargin >= 15 ? 'achieved' : 'planned' },
  ];

  // Key metrics — mix of live and deck data
  const keyMetrics = [
    {
      label: 'Gross Margin',
      value: `${actualGrossMargin.toFixed(1)}%`,
      detail: `Live from Xero (${latestFullYear ?? 'N/A'})`,
    },
    {
      label: 'EBITDA Margin',
      value: `${actualEbitdaMargin.toFixed(1)}%`,
      detail: 'Trailing 12 months',
    },
    { label: 'Avg Dress Price', value: '£8,957', detail: '50% increase since 2021' },
    { label: 'Conversion Rate', value: '74%', detail: 'Appointments to confirmed' },
    {
      label: 'Marketing / Revenue',
      value: `${marketingPct.toFixed(1)}%`,
      detail: `£${Math.round(marketingSpend / 1000)}k annual spend (live)`,
    },
    { label: 'Trunk Show Margin', value: '~50%', detail: 'Operating margin, asset-light' },
  ];

  const businessPlan: BusinessPlanData = {
    revenueTrajectory,
    productMargins,
    fundraise,
    exitScenario,
    markets,
    profitabilityPath,
    keyMetrics,
    teamSize: activePayrollAccounts.size > 0 ? activePayrollAccounts.size : 22,
    usRevenueShare: 70,
    scenarioLinked,
  };

  return (
    <ValuationClient
      data={{
        metrics,
        revenueMultiples,
        ebitdaMultiples,
        sensitivityMatrix,
        ebitdaScenarioLabels: ebitdaScenarios.map((s) => s.label),
        ebitdaMultipleValues,
        bridge,
        comparables,
        hasData,
        midEbitdaMultiple,
        businessPlan,
      }}
    />
  );
}
