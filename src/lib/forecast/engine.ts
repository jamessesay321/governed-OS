import { createUntypedServiceClient } from '@/lib/supabase/server';
import { calculateCorporationTax } from '@/lib/financial/uk-tax';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForecastInput {
  orgId: string;
  startPeriod: string; // YYYY-MM
  months: number; // how many months to forecast (1-36)
  assumptions: ForecastAssumption[];
}

export interface ForecastAssumption {
  category: string; // e.g. 'revenue_growth', 'cogs_percent', 'opex_growth', 'headcount'
  type: 'percentage' | 'absolute' | 'formula';
  value: number;
  label: string;
}

export interface ForecastResult {
  orgId: string;
  generatedAt: string;
  periods: string[]; // ['2025-12', '2026-01', '2026-02', ...]
  pnl: ForecastPnL;
  balanceSheet: ForecastBalanceSheet;
  cashFlow: ForecastCashFlow;
  assumptions: ForecastAssumption[];
  confidence: number;
}

export interface ForecastPnL {
  revenue: number[];
  costOfSales: number[];
  grossProfit: number[];
  operatingExpenses: number[];
  operatingProfit: number[];
  otherIncome: number[];
  otherExpenses: number[];
  netProfit: number[];
}

export interface ForecastBalanceSheet {
  cash: number[];
  receivables: number[];
  inventory: number[];
  totalCurrentAssets: number[];
  fixedAssets: number[];
  totalAssets: number[];
  payables: number[];
  shortTermDebt: number[];
  totalCurrentLiabilities: number[];
  longTermDebt: number[];
  equity: number[];
  retainedEarnings: number[];
  totalLiabilitiesAndEquity: number[];
}

export interface ForecastCashFlow {
  operatingCashFlow: number[];
  investingCashFlow: number[];
  financingCashFlow: number[];
  netCashFlow: number[];
  closingCash: number[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round to 2 decimal places (currency-safe). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Generate period strings: '2026-01', '2026-02', etc. */
function generatePeriods(start: string, count: number): string[] {
  const [startYear, startMonth] = start.split('-').map(Number);
  const periods: string[] = [];
  for (let i = 0; i < count; i++) {
    const totalMonths = (startYear * 12 + startMonth - 1) + i;
    const y = Math.floor(totalMonths / 12);
    const m = (totalMonths % 12) + 1;
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return periods;
}

/** Simple linear regression on an array of values. Returns slope per index. */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** Look up an assumption value by category, falling back to a default. */
function getAssumption(
  assumptions: ForecastAssumption[],
  category: string,
  fallback: number,
): number {
  const found = assumptions.find((a) => a.category === category);
  return found ? found.value : fallback;
}

// ---------------------------------------------------------------------------
// Base Rate Calculation
// ---------------------------------------------------------------------------

interface BaseRates {
  avgRevenue: number;
  avgGrossMarginPct: number;
  avgOpexPct: number;
  revenueGrowthRate: number; // monthly growth rate from linear regression
  lastRevenue: number;
  lastCogs: number;
  lastOpex: number;
  avgCollectionDays: number;
  avgPaymentDays: number;
}

async function fetchBaseRates(orgId: string): Promise<BaseRates> {
  const supabase = await createUntypedServiceClient();

  // Get the last 6 months of actuals
  const { data: financials, error } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .order('period', { ascending: false });

  if (error) {
    console.error('[forecast] Error fetching financials:', error.message);
  }

  const rows = (financials || []) as Array<{
    period: string;
    amount: number;
    account_id: string;
  }>;

  // Get account classes from chart_of_accounts
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, class')
    .eq('org_id', orgId);

  const accountClassMap = new Map<string, string>();
  for (const acc of (accounts || []) as Array<{ id: string; class: string }>) {
    accountClassMap.set(acc.id, acc.class?.toUpperCase() || '');
  }

  // Group amounts by period and class
  const periodData = new Map<string, { revenue: number; cogs: number; opex: number }>();

  for (const row of rows) {
    const cls = accountClassMap.get(row.account_id) || '';
    if (!periodData.has(row.period)) {
      periodData.set(row.period, { revenue: 0, cogs: 0, opex: 0 });
    }
    const pd = periodData.get(row.period)!;
    if (cls === 'REVENUE' || cls === 'OTHERINCOME') pd.revenue += Number(row.amount);
    else if (cls === 'DIRECTCOSTS') pd.cogs += Number(row.amount);
    else if (cls === 'EXPENSE' || cls === 'OVERHEADS') pd.opex += Number(row.amount);
  }

  // Take last 6 periods sorted ascending
  const sortedPeriods = Array.from(periodData.keys()).sort().slice(-6);
  const revenues = sortedPeriods.map((p) => periodData.get(p)!.revenue);
  const cogsArr = sortedPeriods.map((p) => periodData.get(p)!.cogs);
  const opexArr = sortedPeriods.map((p) => periodData.get(p)!.opex);

  const avgRevenue = revenues.length > 0
    ? revenues.reduce((a, b) => a + b, 0) / revenues.length
    : 0;

  const avgCogs = cogsArr.length > 0
    ? cogsArr.reduce((a, b) => a + b, 0) / cogsArr.length
    : 0;

  const avgGrossMarginPct = avgRevenue > 0
    ? ((avgRevenue - avgCogs) / avgRevenue) * 100
    : 50;

  const avgOpexPct = avgRevenue > 0 ? (opexArr.reduce((a, b) => a + b, 0) / opexArr.length / avgRevenue) * 100 : 30;

  // Revenue growth trend via linear regression
  const slope = linearRegressionSlope(revenues);
  const revenueGrowthRate = avgRevenue > 0 ? slope / avgRevenue : 0.02; // default 2% if no data

  return {
    avgRevenue,
    avgGrossMarginPct,
    avgOpexPct,
    revenueGrowthRate,
    lastRevenue: revenues.length > 0 ? revenues[revenues.length - 1] : 0,
    lastCogs: cogsArr.length > 0 ? cogsArr[cogsArr.length - 1] : 0,
    lastOpex: opexArr.length > 0 ? opexArr[opexArr.length - 1] : 0,
    avgCollectionDays: 30, // Default; could be computed from receivables data
    avgPaymentDays: 30,    // Default; could be computed from payables data
  };
}

// ---------------------------------------------------------------------------
// Main Forecast Generator
// ---------------------------------------------------------------------------

export async function generateForecast(input: ForecastInput): Promise<ForecastResult> {
  const { orgId, startPeriod, months, assumptions } = input;

  // 1. Fetch base rates from actuals
  const base = await fetchBaseRates(orgId);

  // 2. Fetch business thesis for context (best-effort)
  const supabase = await createUntypedServiceClient();
  const { data: thesis } = await supabase
    .from('business_theses')
    .select('content')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Thesis is informational — used for confidence scoring
  const hasThesis = !!thesis;

  // 3. Resolve assumptions with fallbacks to base rates
  const revenueGrowth = getAssumption(assumptions, 'revenue_growth', base.revenueGrowthRate * 100) / 100;
  const cogsPct = getAssumption(assumptions, 'cogs_percent', 100 - base.avgGrossMarginPct) / 100;
  const opexGrowth = getAssumption(assumptions, 'opex_growth', 2) / 100; // default 2% monthly
  const headcount = getAssumption(assumptions, 'headcount', 0);
  const avgSalary = getAssumption(assumptions, 'avg_salary', 5000); // monthly per head
  const capex = getAssumption(assumptions, 'capex', 0);
  const debtRepayment = getAssumption(assumptions, 'debt_repayment', 0);
  const depreciation = getAssumption(assumptions, 'depreciation', 0);
  const otherIncome = getAssumption(assumptions, 'other_income', 0);
  const otherExpenses = getAssumption(assumptions, 'other_expenses', 0);
  const collectionDays = getAssumption(assumptions, 'collection_days', base.avgCollectionDays);
  const paymentDays = getAssumption(assumptions, 'payment_days', base.avgPaymentDays);

  // 4. Generate period labels
  const periods = generatePeriods(startPeriod, months);

  // 5. Project P&L
  const pnl: ForecastPnL = {
    revenue: [],
    costOfSales: [],
    grossProfit: [],
    operatingExpenses: [],
    operatingProfit: [],
    otherIncome: [],
    otherExpenses: [],
    netProfit: [],
  };

  let prevRevenue = base.lastRevenue || base.avgRevenue || 10000;
  let prevOpex = base.lastOpex || (base.avgRevenue * base.avgOpexPct / 100) || 3000;

  for (let i = 0; i < months; i++) {
    const revenue = round2(prevRevenue * (1 + revenueGrowth));
    const cogs = round2(revenue * cogsPct);
    const grossProfit = round2(revenue - cogs);
    const baseOpex = round2(prevOpex * (1 + opexGrowth));
    const headcountCost = round2(headcount * avgSalary);
    const totalOpex = round2(baseOpex + headcountCost);
    const opProfit = round2(grossProfit - totalOpex);
    const profitBeforeTax = round2(opProfit + otherIncome - otherExpenses);
    // Apply UK Corporation Tax with marginal relief (FY2023+: 19% up to £50k, 25% over £250k)
    // Annualise the monthly profit for rate banding, then divide back to monthly CT
    const annualisedProfit = profitBeforeTax * 12;
    const monthlyCT = annualisedProfit > 0 ? round2(calculateCorporationTax(annualisedProfit) / 12) : 0;
    const netP = round2(profitBeforeTax - monthlyCT);

    pnl.revenue.push(revenue);
    pnl.costOfSales.push(cogs);
    pnl.grossProfit.push(grossProfit);
    pnl.operatingExpenses.push(totalOpex);
    pnl.operatingProfit.push(opProfit);
    pnl.otherIncome.push(round2(otherIncome));
    pnl.otherExpenses.push(round2(otherExpenses));
    pnl.netProfit.push(netP);

    prevRevenue = revenue;
    prevOpex = baseOpex; // headcount cost is additive, not compounding base opex
  }

  // 6. Project Balance Sheet
  const bs: ForecastBalanceSheet = {
    cash: [],
    receivables: [],
    inventory: [],
    totalCurrentAssets: [],
    fixedAssets: [],
    totalAssets: [],
    payables: [],
    shortTermDebt: [],
    totalCurrentLiabilities: [],
    longTermDebt: [],
    equity: [],
    retainedEarnings: [],
    totalLiabilitiesAndEquity: [],
  };

  let prevCash = base.lastRevenue * 2 || 50000; // rough starting cash estimate
  let cumulativeRetainedEarnings = 0;
  let prevFixedAssets = 0;
  let prevLongTermDebt = 0;
  const baseEquity = prevCash; // simplified starting equity

  for (let i = 0; i < months; i++) {
    const receivables = round2(pnl.revenue[i] * (collectionDays / 30));
    const payables = round2(pnl.costOfSales[i] * (paymentDays / 30));
    const inventory = 0; // Simplified — could be extended

    // Working capital changes for cash flow
    const prevReceivables = i > 0 ? bs.receivables[i - 1] : receivables;
    const prevPayables = i > 0 ? bs.payables[i - 1] : payables;

    const wcChange = (receivables - prevReceivables) - (payables - prevPayables);

    // Cash flow components
    const operatingCF = round2(pnl.netProfit[i] + depreciation - wcChange);
    const investingCF = round2(-capex);
    const financingCF = round2(-debtRepayment);
    const netCF = round2(operatingCF + investingCF + financingCF);

    const cash = round2(prevCash + netCF);

    const fixedAssets = round2(prevFixedAssets + capex - depreciation);
    const totalCurrentAssets = round2(cash + receivables + inventory);
    const totalAssets = round2(totalCurrentAssets + fixedAssets);

    const shortTermDebt = 0;
    const totalCurrentLiabilities = round2(payables + shortTermDebt);
    const longTermDebt = round2(Math.max(0, prevLongTermDebt - debtRepayment));

    cumulativeRetainedEarnings = round2(cumulativeRetainedEarnings + pnl.netProfit[i]);
    const equity = round2(baseEquity);
    const totalLiabilitiesAndEquity = round2(
      totalCurrentLiabilities + longTermDebt + equity + cumulativeRetainedEarnings
    );

    bs.cash.push(cash);
    bs.receivables.push(receivables);
    bs.inventory.push(inventory);
    bs.totalCurrentAssets.push(totalCurrentAssets);
    bs.fixedAssets.push(fixedAssets);
    bs.totalAssets.push(totalAssets);
    bs.payables.push(payables);
    bs.shortTermDebt.push(shortTermDebt);
    bs.totalCurrentLiabilities.push(totalCurrentLiabilities);
    bs.longTermDebt.push(longTermDebt);
    bs.equity.push(equity);
    bs.retainedEarnings.push(cumulativeRetainedEarnings);
    bs.totalLiabilitiesAndEquity.push(totalLiabilitiesAndEquity);

    prevCash = cash;
    prevFixedAssets = fixedAssets;
    prevLongTermDebt = longTermDebt;
  }

  // 7. Project Cash Flow statement
  const cf: ForecastCashFlow = {
    operatingCashFlow: [],
    investingCashFlow: [],
    financingCashFlow: [],
    netCashFlow: [],
    closingCash: [],
  };

  for (let i = 0; i < months; i++) {
    const prevReceivables = i > 0 ? bs.receivables[i - 1] : bs.receivables[0];
    const prevPayables = i > 0 ? bs.payables[i - 1] : bs.payables[0];
    const wcChange = (bs.receivables[i] - prevReceivables) - (bs.payables[i] - prevPayables);

    const operatingCF = round2(pnl.netProfit[i] + depreciation - wcChange);
    const investingCF = round2(-capex);
    const financingCF = round2(-debtRepayment);
    const netCF = round2(operatingCF + investingCF + financingCF);

    cf.operatingCashFlow.push(operatingCF);
    cf.investingCashFlow.push(investingCF);
    cf.financingCashFlow.push(financingCF);
    cf.netCashFlow.push(netCF);
    cf.closingCash.push(bs.cash[i]);
  }

  // 8. Calculate confidence score
  // Higher confidence if we have more actuals data and a thesis
  const dataPoints = base.avgRevenue > 0 ? 6 : 0;
  const confidence = round2(
    Math.min(0.95, 0.4 + (dataPoints / 12) + (hasThesis ? 0.1 : 0) - (months > 12 ? 0.1 : 0))
  );

  const result: ForecastResult = {
    orgId,
    generatedAt: new Date().toISOString(),
    periods,
    pnl,
    balanceSheet: bs,
    cashFlow: cf,
    assumptions,
    confidence: Math.max(0.1, confidence),
  };

  // 9. Save to database
  const { error: insertError } = await supabase.from('forecasts').insert({
    org_id: orgId,
    periods: periods as unknown,
    pnl: pnl as unknown,
    balance_sheet: bs as unknown,
    cash_flow: cf as unknown,
    assumptions: assumptions as unknown,
    confidence: result.confidence,
    generated_at: result.generatedAt,
  });

  if (insertError) {
    console.error('[forecast] Error saving forecast:', insertError.message);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Get Latest Forecast
// ---------------------------------------------------------------------------

export async function getLatestForecast(orgId: string): Promise<ForecastResult | null> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('forecasts')
    .select('*')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[forecast] Error fetching latest:', error.message);
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    orgId: row.org_id as string,
    generatedAt: row.generated_at as string,
    periods: row.periods as string[],
    pnl: row.pnl as ForecastPnL,
    balanceSheet: row.balance_sheet as ForecastBalanceSheet,
    cashFlow: row.cash_flow as ForecastCashFlow,
    assumptions: row.assumptions as ForecastAssumption[],
    confidence: Number(row.confidence) || 0,
  };
}

// ---------------------------------------------------------------------------
// Compare Forecast to Actuals
// ---------------------------------------------------------------------------

export interface ForecastVariance {
  period: string;
  metric: string;
  forecast: number;
  actual: number;
  variance: number;
  variancePct: number;
}

export async function compareForecastToActuals(
  orgId: string,
  forecastId: string,
): Promise<ForecastVariance[]> {
  const supabase = await createUntypedServiceClient();

  // Fetch the forecast
  const { data: forecastRow, error: fErr } = await supabase
    .from('forecasts')
    .select('*')
    .eq('id', forecastId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fErr || !forecastRow) {
    console.error('[forecast] Error fetching forecast for comparison:', fErr?.message);
    return [];
  }

  const row = forecastRow as Record<string, unknown>;
  const periods = row.periods as string[];
  const pnl = row.pnl as ForecastPnL;

  // Fetch actuals for those periods
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('period', periods.map((p) => `${p}-01`));

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, class')
    .eq('org_id', orgId);

  const accountClassMap = new Map<string, string>();
  for (const acc of (accounts || []) as Array<{ id: string; class: string }>) {
    accountClassMap.set(acc.id, acc.class?.toUpperCase() || '');
  }

  // Aggregate actuals by period
  const actualsByPeriod = new Map<string, { revenue: number; cogs: number; opex: number }>();
  for (const fin of (financials || []) as Array<{ period: string; amount: number; account_id: string }>) {
    const periodKey = fin.period.substring(0, 7); // YYYY-MM
    if (!actualsByPeriod.has(periodKey)) {
      actualsByPeriod.set(periodKey, { revenue: 0, cogs: 0, opex: 0 });
    }
    const cls = accountClassMap.get(fin.account_id) || '';
    const pd = actualsByPeriod.get(periodKey)!;
    if (cls === 'REVENUE') pd.revenue += Number(fin.amount);
    else if (cls === 'DIRECTCOSTS') pd.cogs += Number(fin.amount);
    else if (cls === 'EXPENSE' || cls === 'OVERHEADS') pd.opex += Number(fin.amount);
  }

  const variances: ForecastVariance[] = [];

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const actuals = actualsByPeriod.get(period);
    if (!actuals) continue; // No actuals yet for this period

    const metrics = [
      { metric: 'revenue', forecast: pnl.revenue[i], actual: actuals.revenue },
      { metric: 'costOfSales', forecast: pnl.costOfSales[i], actual: actuals.cogs },
      { metric: 'operatingExpenses', forecast: pnl.operatingExpenses[i], actual: actuals.opex },
    ];

    for (const m of metrics) {
      const variance = round2(m.actual - m.forecast);
      const variancePct = m.forecast !== 0
        ? round2((variance / Math.abs(m.forecast)) * 100)
        : 0;

      variances.push({
        period,
        metric: m.metric,
        forecast: m.forecast,
        actual: m.actual,
        variance,
        variancePct,
      });
    }
  }

  return variances;
}
