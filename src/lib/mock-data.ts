/**
 * Mock Data — sample financial data for demo/preview mode.
 * Based on ALONUKO — Luxury Bridal Couture Design House (London, UK).
 * Used when no real accounting data is connected.
 *
 * ALIGNED WITH DRAFT ACCOUNTS FY2025 (source of truth):
 *   Turnover:    £1,433,012   |  Other Income: £25,000
 *   COGS:        £368,712     |  Staff:        £780,168
 *   Other:       £749,427     |  Depreciation: £47,170
 *   Interest:    £257,003     |  Net Loss:     £744,469
 *   Cash:        £22,375      |  Stock:        £135,199
 *   Net Assets:  -£1,529,224  |  Employees:    18
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type SampleCompany = {
  name: string;
  industry: string;
  revenue: number;
  employees: number;
  fiscalYear: string;
  currency: string;
  country: string;
};

export type MonthlyPnL = {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  salaries: number;
  rent: number;
  marketing: number;
  travel: number;
  it: number;
  professionalServices: number;
  otherOverheads: number;
  interestFinance: number;
  depreciation: number;
  totalOpEx: number;
  netProfit: number;
};

export type MonthlyBalanceSheet = {
  month: string;
  cash: number;
  accountsReceivable: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  fixedAssets: number;
  totalAssets: number;
  accountsPayable: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  equity: number;
};

export type MonthlyCashFlow = {
  month: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  closingBalance: number;
};

export type KPISnapshot = {
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'flat';
  category: 'profitability' | 'liquidity' | 'efficiency' | 'growth' | 'operational';
  format: 'currency' | 'percentage' | 'ratio' | 'months' | 'days' | 'number';
};

export type IntelligenceInsight = {
  title: string;
  summary: string;
  impact: 'positive' | 'negative' | 'neutral';
  category: 'revenue' | 'cash' | 'cost' | 'operational';
  severity: 'low' | 'medium' | 'high' | 'critical';
};

// ── Sample Company ─────────────────────────────────────────────────────────

export const SAMPLE_COMPANY: SampleCompany = {
  name: 'ALONUKO Ltd',
  industry: 'Luxury Bridal Couture',
  revenue: 1_433_012,
  employees: 18,
  fiscalYear: '2025',
  currency: 'GBP',
  country: 'GB',
};

// ── Helper ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── P&L Data (luxury bridal — seasonal peaks in spring & autumn) ─────────

function generatePnL(): MonthlyPnL[] {
  // Bridal: peak bookings Jan-Mar (wedding season prep) & Sep-Nov (autumn weddings)
  const seasonalMultiplier = [1.3, 1.4, 1.5, 1.1, 0.9, 0.7, 0.6, 0.8, 1.2, 1.3, 1.1, 0.8];
  // Base calibrated to produce ~£1.433M annual with seasonal + growth factors
  const baseRevenue = 101_500;
  const monthlyGrowth = 0.02; // 2% MoM underlying growth

  return MONTHS.map((month, i) => {
    const revenue = Math.round(
      baseRevenue * seasonalMultiplier[i] * Math.pow(1 + monthlyGrowth, i)
    );
    // Draft accounts: COGS (materials) = £368,712 / £1,433,012 = 25.7%
    // Bespoke couture: low material cost, high labour cost
    const cogs = Math.round(revenue * (0.24 + Math.random() * 0.03));
    const grossProfit = revenue - cogs;

    // Draft accounts: Staff costs £780,168 / 12 = £65,014/mo
    // 18 employees: 9 seamstresses, production manager, samples, 2 sales/CS,
    // social media (PT), 2 directors, admin + agency staff
    const salaries = Math.round(65_000 + i * 200);
    // London atelier showroom
    const rent = 6_500;
    // Instagram/Pinterest ads, bridal expos, photoshoot amortised
    const marketing = Math.round(4_000 + seasonalMultiplier[i] * 1_500);
    // US trunk shows (Houston, NYC, Atlanta — 3 per quarter in peak)
    const travel = i === 0 || i === 3 || i === 5 || i === 8 || i === 9 || i === 11 ? 8_500 : 1_500;
    // Design software, website, CRM, Shopify
    const it = 2_400;
    // Legal, accounting, import/export compliance
    const professionalServices = Math.round(2_000 + (i % 3 === 0 ? 2_500 : 0));
    // Embroidery, packaging, insurance, utilities, repairs, sundry
    // Draft accounts: Other charges £749K includes depreciation + interest, but
    // those are broken out separately. Remaining overhead: ~£445K / 12 = £37K/mo
    const otherOverheads = Math.round(35_000 + seasonalMultiplier[i] * 2_500);
    // Draft accounts: Interest payable £257,003 / 12 = £21,417/mo
    // Spread across 10+ lenders (BizCap, YouLend, Iwoca, etc.)
    const interestFinance = 21_417;
    // Draft accounts: Depreciation £47,170 / 12 = £3,931/mo
    const depreciation = 3_931;

    const totalOpEx = salaries + rent + marketing + travel + it + professionalServices +
      otherOverheads + interestFinance + depreciation;
    const netProfit = grossProfit - totalOpEx;

    return {
      month,
      revenue,
      cogs,
      grossProfit,
      salaries,
      rent,
      marketing,
      travel,
      it,
      professionalServices,
      otherOverheads,
      interestFinance,
      depreciation,
      totalOpEx,
      netProfit,
    };
  });
}

export const MOCK_PNL: MonthlyPnL[] = generatePnL();

// ── Balance Sheet (12 months) ──────────────────────────────────────────────

function generateBalanceSheet(): MonthlyBalanceSheet[] {
  // Draft accounts: Cash at bank £22,375 (end of FY)
  // Company is loss-making at ~£62K/mo, so cash fluctuates tightly
  let cash = 45_000; // Start of year slightly higher before losses erode it

  return MONTHS.map((month, i) => {
    const pnl = MOCK_PNL[i];
    // Cash moves with P&L but also with working capital timing (deposits received early)
    // Net loss is ~£62K/mo but cash flow is partially offset by customer deposits
    cash = Math.max(8_000, cash + Math.round(pnl.netProfit * 0.35 + 15_000));

    // Bridal deposits (50% upfront on £7K avg order = £3.5K × orders in pipeline)
    const accountsReceivable = Math.round(pnl.revenue * 0.20);
    // Draft accounts: Stock £135,199 (fabric, WIP gowns, finished stock)
    const otherCurrentAssets = Math.round(130_000 + pnl.cogs * 0.05);
    const totalCurrentAssets = cash + accountsReceivable + otherCurrentAssets;
    // Showroom fit-out, sewing machines, mannequins — depreciating
    const fixedAssets = Math.round(95_000 - i * pnl.depreciation);
    const totalAssets = totalCurrentAssets + fixedAssets;

    // Draft accounts: Trade creditors £124K, tax £221K
    // Fabric suppliers, embroidery vendors (Create Staff, KTC, Yousuf)
    const accountsPayable = Math.round(120_000 + pnl.cogs * 0.10);
    // HMRC, other current liabilities
    // Draft accounts: Creditors <1yr £780,747 (bank loans £305K + trade £124K + DLA £114K + tax £221K)
    const otherCurrentLiabilities = Math.round(530_000 + i * 2_000);
    const totalCurrentLiabilities = accountsPayable + otherCurrentLiabilities;
    // Draft accounts: Creditors >1yr £87,384 (long-term portion of debt)
    const longTermDebt = Math.round(87_000 - i * 500);
    const totalLiabilities = totalCurrentLiabilities + longTermDebt;
    // Draft accounts: Net assets -£1,529,224 (deeply negative equity)
    const equity = totalAssets - totalLiabilities;

    return {
      month,
      cash,
      accountsReceivable,
      otherCurrentAssets,
      totalCurrentAssets,
      fixedAssets,
      totalAssets,
      accountsPayable,
      otherCurrentLiabilities,
      totalCurrentLiabilities,
      longTermDebt,
      totalLiabilities,
      equity,
    };
  });
}

export const MOCK_BALANCE_SHEET: MonthlyBalanceSheet[] = generateBalanceSheet();

// ── Cash Flow (12 months) ──────────────────────────────────────────────────

function generateCashFlow(): MonthlyCashFlow[] {
  // Draft accounts: Cash at bank £22,375 (end of FY)
  // Company is loss-making but sustains through customer deposits and debt drawdowns
  let closingBalance = 45_000;

  return MONTHS.map((month, i) => {
    const pnl = MOCK_PNL[i];
    // Operating cash flow: net loss + add back depreciation + working capital movements
    // Customer deposits partially offset the operating loss
    const operatingCashFlow = Math.round(pnl.netProfit + pnl.depreciation + 18_000 + (Math.random() * 5_000 - 2_500));
    // Minimal capex — bespoke atelier, not capital-intensive
    const investingCashFlow = i % 4 === 0 ? -5_000 : -1_500;
    // Debt repayments net of new drawdowns — company relies on debt to fund losses
    // Some months: new MCA drawdown. Most months: net debt repayment
    const financingCashFlow = i === 2 || i === 7 ? 30_000 : -8_000;
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    closingBalance = Math.max(5_000, closingBalance + netCashFlow);

    return {
      month,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
      closingBalance,
    };
  });
}

export const MOCK_CASH_FLOW: MonthlyCashFlow[] = generateCashFlow();

// ── KPIs ───────────────────────────────────────────────────────────────────

/**
 * KPIs calibrated to draft accounts FY2025:
 *   Revenue: £1,433,012 | COGS: £368,712 | Gross margin: 74.3%
 *   Staff: £780,168 | Other: £749,427 | Interest: £257,003
 *   Net loss: £744,469 | Net margin: -51.9%
 *   EBITDA: Revenue - COGS - Staff - Other + Depreciation = -£417,826
 *   Cash: £22,375 | 18 employees
 */
export const MOCK_KPIS: KPISnapshot[] = [
  // Profitability — company is loss-making
  { name: 'Gross Margin', value: 0.743, target: 0.70, trend: 'flat', category: 'profitability', format: 'percentage' },
  { name: 'Net Margin', value: -0.519, target: 0.05, trend: 'down', category: 'profitability', format: 'percentage' },
  { name: 'Operating Margin', value: -0.322, target: 0.10, trend: 'down', category: 'profitability', format: 'percentage' },
  { name: 'EBITDA', value: -417_826, target: 0, trend: 'down', category: 'profitability', format: 'currency' },

  // Liquidity — very tight, company relies on debt funding
  { name: 'Current Ratio', value: 0.35, target: 1.5, trend: 'down', category: 'liquidity', format: 'ratio' },
  { name: 'Quick Ratio', value: 0.06, target: 1.0, trend: 'down', category: 'liquidity', format: 'ratio' },
  { name: 'Cash Runway', value: 0.4, target: 6.0, trend: 'down', category: 'liquidity', format: 'months' },
  { name: 'Cash Position', value: 22_375, target: 100_000, trend: 'down', category: 'liquidity', format: 'currency' },

  // Efficiency
  { name: 'AR Days', value: 22, target: 30, trend: 'down', category: 'efficiency', format: 'days' },
  { name: 'AP Days', value: 42, target: 30, trend: 'up', category: 'efficiency', format: 'days' },
  { name: 'Revenue per Employee', value: 79_612, target: 100_000, trend: 'flat', category: 'efficiency', format: 'currency' },
  { name: 'OpEx Ratio', value: 1.52, target: 0.85, trend: 'up', category: 'efficiency', format: 'percentage' },

  // Growth — revenue growing modestly (£1.34M → £1.43M = 7%)
  { name: 'Revenue Growth (MoM)', value: 0.015, target: 0.03, trend: 'flat', category: 'growth', format: 'percentage' },
  { name: 'Revenue Growth (YoY)', value: 0.07, target: 0.20, trend: 'up', category: 'growth', format: 'percentage' },
  { name: 'Average Order Value', value: 7_000, target: 8_000, trend: 'up', category: 'growth', format: 'currency' },

  // Operational
  { name: 'Booking Conversion Rate', value: 0.65, target: 0.70, trend: 'flat', category: 'operational', format: 'percentage' },
  { name: 'Gowns Delivered', value: 17, target: 20, trend: 'flat', category: 'operational', format: 'number' },
];

// ── Intelligence Insights ──────────────────────────────────────────────────

export const SAMPLE_INTELLIGENCE_INSIGHTS: IntelligenceInsight[] = [
  {
    title: 'Annual Debt Service Exceeds Operating Capacity',
    summary:
      'Interest payments of £257K/yr on £700K+ debt are consuming 18% of revenue. DSCR is below 1.0. Cost restructuring (3 redundancies saving £110K) and trunk show revenue ramp are critical to regain serviceability.',
    impact: 'negative',
    category: 'cost',
    severity: 'critical',
  },
  {
    title: 'Staff Costs at 54% of Revenue — Well Above Fashion Benchmark',
    summary:
      'Staff costs of £780K on £1.43M revenue (54%) far exceed the 25-35% fashion industry benchmark. This reflects the bespoke manufacturing model. The strategic plan targets £110K/yr saving from June 2026 redundancies.',
    impact: 'negative',
    category: 'cost',
    severity: 'high',
  },
  {
    title: 'Strong Gross Margin Despite Losses',
    summary:
      'Gross margin of 74.3% (COGS £369K / Revenue £1.43M) is excellent and above luxury fashion benchmarks. The margin problem is below the gross line — overhead and debt, not pricing or materials.',
    impact: 'positive',
    category: 'revenue',
    severity: 'medium',
  },
  {
    title: 'US Trunk Show Expansion — Key Revenue Growth Lever',
    summary:
      'Houston, NYC and Atlanta trunk shows targeting £930K in 2026 (12 shows). Revenue per show ramps from £40K to £130K through the year. Combined with 3 new product lines (Civil, All-Black, Mainline), this is the primary profitability pathway.',
    impact: 'positive',
    category: 'revenue',
    severity: 'high',
  },
  {
    title: 'Cash Position Critical — £22K Balance',
    summary:
      'Cash at bank of £22,375 against monthly losses of ~£62K gives less than 2 weeks of runway without new debt drawdowns. Daily MCA repayments (BizCap £782, Elect £1,357) create acute liquidity pressure.',
    impact: 'negative',
    category: 'cash',
    severity: 'critical',
  },
];
