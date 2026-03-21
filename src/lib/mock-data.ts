/**
 * Mock Data — sample financial data for demo/preview mode.
 * Based on ALONUKO — Luxury Bridal Couture Design House (London, UK).
 * Used when no real accounting data is connected.
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
  revenue: 1_450_000,
  employees: 12,
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
  const baseRevenue = 105_000; // ~£105K base, scaled by season
  const monthlyGrowth = 0.02; // 2% MoM underlying growth

  return MONTHS.map((month, i) => {
    const revenue = Math.round(
      baseRevenue * seasonalMultiplier[i] * Math.pow(1 + monthlyGrowth, i)
    );
    // Luxury bridal: high gross margins (~68-72%) — bespoke gowns £3K-£15K each
    const cogs = Math.round(revenue * (0.28 + Math.random() * 0.04));
    const grossProfit = revenue - cogs;

    // Team: 3 designers, 4 seamstresses, 2 consultants, 1 studio manager, 1 marketing, 1 admin
    const salaries = Math.round(38_000 + i * 300);
    // Mayfair/Knightsbridge showroom
    const rent = 6_500;
    // Fashion shows, bridal expos, Instagram/Pinterest ads
    const marketing = Math.round(5_500 + seasonalMultiplier[i] * 2_000);
    // Trunk shows in US cities (NYC, LA, Houston, Miami)
    const travel = i === 0 || i === 3 || i === 8 ? 8_500 : 1_200;
    // Design software, website, CRM
    const it = 2_400;
    // Legal, accounting, import/export
    const professionalServices = Math.round(1_800 + (i % 3 === 0 ? 2_500 : 0));

    const totalOpEx = salaries + rent + marketing + travel + it + professionalServices;
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
      totalOpEx,
      netProfit,
    };
  });
}

export const MOCK_PNL: MonthlyPnL[] = generatePnL();

// ── Balance Sheet (12 months) ──────────────────────────────────────────────

function generateBalanceSheet(): MonthlyBalanceSheet[] {
  let cash = 185_000;

  return MONTHS.map((month, i) => {
    const pnl = MOCK_PNL[i];
    cash = cash + Math.round(pnl.netProfit * 0.55);

    // Bridal deposits & trunk show receivables
    const accountsReceivable = Math.round(pnl.revenue * 0.25);
    // Fabric inventory, work-in-progress gowns
    const otherCurrentAssets = Math.round(35_000 + pnl.cogs * 0.15);
    const totalCurrentAssets = cash + accountsReceivable + otherCurrentAssets;
    // Showroom fit-out, sewing machines, mannequins
    const fixedAssets = Math.round(120_000 - i * 1_800);
    const totalAssets = totalCurrentAssets + fixedAssets;

    // Fabric suppliers, embellishment vendors
    const accountsPayable = Math.round(pnl.cogs * 0.35);
    const otherCurrentLiabilities = Math.round(12_000 + i * 150);
    const totalCurrentLiabilities = accountsPayable + otherCurrentLiabilities;
    // Showroom lease deposit / small business loan
    const longTermDebt = Math.round(35_000 - i * 1_500);
    const totalLiabilities = totalCurrentLiabilities + longTermDebt;
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
  let closingBalance = 185_000;

  return MONTHS.map((month, i) => {
    const pnl = MOCK_PNL[i];
    const operatingCashFlow = Math.round(pnl.netProfit + 1_800 + (Math.random() * 3_000 - 1_500));
    // Fabric sourcing trips, equipment
    const investingCashFlow = i % 4 === 0 ? -12_000 : -2_500;
    const financingCashFlow = i === 0 ? -3_000 : -1_500;
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    closingBalance = closingBalance + netCashFlow;

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

export const MOCK_KPIS: KPISnapshot[] = [
  // Profitability
  { name: 'Gross Margin', value: 0.705, target: 0.70, trend: 'up', category: 'profitability', format: 'percentage' },
  { name: 'Net Margin', value: 0.148, target: 0.15, trend: 'up', category: 'profitability', format: 'percentage' },
  { name: 'Operating Margin', value: 0.195, target: 0.20, trend: 'flat', category: 'profitability', format: 'percentage' },
  { name: 'EBITDA', value: 22_800, target: 25_000, trend: 'up', category: 'profitability', format: 'currency' },

  // Liquidity
  { name: 'Current Ratio', value: 2.8, target: 2.0, trend: 'up', category: 'liquidity', format: 'ratio' },
  { name: 'Quick Ratio', value: 2.2, target: 1.5, trend: 'up', category: 'liquidity', format: 'ratio' },
  { name: 'Cash Runway', value: 5.8, target: 6.0, trend: 'up', category: 'liquidity', format: 'months' },
  { name: 'Cash Position', value: 215_000, target: 200_000, trend: 'up', category: 'liquidity', format: 'currency' },

  // Efficiency
  { name: 'AR Days', value: 28, target: 30, trend: 'down', category: 'efficiency', format: 'days' },
  { name: 'AP Days', value: 25, target: 30, trend: 'flat', category: 'efficiency', format: 'days' },
  { name: 'Revenue per Employee', value: 120_833, target: 110_000, trend: 'up', category: 'efficiency', format: 'currency' },
  { name: 'OpEx Ratio', value: 0.51, target: 0.50, trend: 'down', category: 'efficiency', format: 'percentage' },

  // Growth
  { name: 'Revenue Growth (MoM)', value: 0.028, target: 0.03, trend: 'up', category: 'growth', format: 'percentage' },
  { name: 'Revenue Growth (YoY)', value: 0.22, target: 0.20, trend: 'up', category: 'growth', format: 'percentage' },
  { name: 'Average Order Value', value: 7_850, target: 8_000, trend: 'up', category: 'growth', format: 'currency' },

  // Operational
  { name: 'Booking Conversion Rate', value: 0.42, target: 0.45, trend: 'up', category: 'operational', format: 'percentage' },
  { name: 'Gowns Delivered', value: 18, target: 20, trend: 'up', category: 'operational', format: 'number' },
];

// ── Intelligence Insights ──────────────────────────────────────────────────

export const SAMPLE_INTELLIGENCE_INSIGHTS: IntelligenceInsight[] = [
  {
    title: 'US Trunk Shows Driving Growth',
    summary:
      'Trunk shows in NYC and Houston generated 34% of Q1 bookings. Average order value from US clients is 40% higher than UK. Consider expanding to LA and Miami.',
    impact: 'positive',
    category: 'revenue',
    severity: 'medium',
  },
  {
    title: 'Fabric Import Costs Rising',
    summary:
      'Italian silk and French lace suppliers have increased prices by 12% this quarter. Gross margin impact of ~2pp if not offset. Consider renegotiating or diversifying suppliers.',
    impact: 'negative',
    category: 'cost',
    severity: 'high',
  },
  {
    title: 'Seasonal Cash Flow Pattern',
    summary:
      'Summer months (Jun-Aug) show 30% lower revenue. Typical for bridal. Pre-collecting deposits and running a ready-to-wear capsule could smooth cash flow.',
    impact: 'neutral',
    category: 'cash',
    severity: 'medium',
  },
  {
    title: 'Instagram Driving Consultations',
    summary:
      '68% of new consultations cite Instagram as discovery channel. Cost per consultation via social: £45 vs £180 for bridal expos. Reallocate marketing spend.',
    impact: 'positive',
    category: 'operational',
    severity: 'low',
  },
];
