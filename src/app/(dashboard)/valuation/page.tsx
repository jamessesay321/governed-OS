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

  // ── Business Plan Data (from Alonuko Business Plan 2025 PDF) ──

  const revenueTrajectory: RevenueTrajectoryPoint[] = [
    { year: '2021', revenue: 145_000, isProjection: false, yoyGrowth: '' },
    { year: '2022', revenue: 500_000, isProjection: false, yoyGrowth: '245%' },
    { year: '2023', revenue: 1_300_000, isProjection: false, yoyGrowth: '160%' },
    { year: '2024', revenue: 1_400_000, isProjection: false, yoyGrowth: '8%' },
    { year: '2025E', revenue: 2_000_000, isProjection: true, yoyGrowth: '43%' },
    { year: '2026E', revenue: 5_000_000, isProjection: true, yoyGrowth: '150%' },
    { year: '2027E', revenue: 10_000_000, isProjection: true, yoyGrowth: '100%' },
  ];

  const productMargins: ProductMargin[] = [
    { product: 'Bridal (Bespoke)', grossMargin: 60, operatingMargin: 50, color: '#7c3aed' },
    { product: 'Ready to Wear', grossMargin: 70, operatingMargin: 60, color: '#06b6d4' },
    { product: 'Evening Wear', grossMargin: 70, operatingMargin: 60, color: '#f59e0b' },
    { product: 'Robes & Lingerie', grossMargin: 90, operatingMargin: null, color: '#ec4899' },
  ];

  const fundraise: FundraiseContext = {
    raising: 400_000,
    preMoneyValuation: 5_000_000,
    structure: 'SeedFAST',
    impliedRevenueMultiple: 5_000_000 / 1_400_000,
  };

  const exitScenario: ExitScenario = {
    year: '2027',
    targetRevenue: 10_000_000,
    targetEbitdaMargin: 15,
    targetEbitda: 1_500_000,
    floorMultiple: 4.5,
    floorValuation: 50_000_000,
    investorReturnMultiple: '10x',
  };

  const markets: MarketOpportunity[] = [
    { market: 'US Bridal Wear', size: '$28bn', sizeGBP: '£22bn' },
    { market: 'Global Evening Dress', size: '$1.8bn', sizeGBP: '£1.4bn' },
  ];

  const profitabilityPath: ProfitabilityMilestone[] = [
    { year: '2025', target: 'Reduce losses via CoGS analysis & debt refinancing', status: 'in-progress' },
    { year: '2026', target: 'EBITDA positive by year-end', status: 'planned' },
    { year: '2027', target: 'EBITDA margin of at least 15%', status: 'planned' },
  ];

  const keyMetrics = [
    { label: 'Avg Dress Price', value: '£8,957', detail: '50% increase since 2021' },
    { label: 'Avg Bride Spend', value: '£9,000', detail: '3x from £3k in 2021' },
    { label: 'Conversion Rate', value: '74%', detail: 'Appointments to confirmed clients' },
    { label: 'Trunk Show Margin', value: '~50%', detail: 'Operating margin, asset-light model' },
    { label: 'Social Following', value: '1m+', detail: 'IG, TikTok & Facebook combined' },
    { label: 'Marketing Spend', value: '<5%', detail: 'Of sales — highly capital-efficient' },
  ];

  const businessPlan: BusinessPlanData = {
    revenueTrajectory,
    productMargins,
    fundraise,
    exitScenario,
    markets,
    profitabilityPath,
    keyMetrics,
    teamSize: 22,
    usRevenueShare: 70,
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
