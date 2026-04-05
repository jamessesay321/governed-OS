/**
 * Balance Sheet Health Checks
 *
 * ACCA/ICAEW practitioner-standard ratio analysis and benchmarks.
 * All calculations are deterministic (no AI).
 *
 * References:
 * - FRS 102 Section 4 (Statement of Financial Position)
 * - ISA 570 (Going Concern)
 * - ICAEW Financial Reporting Faculty guidance
 * - ACCA Technical Articles on ratio analysis
 */

export interface BalanceSheetHealth {
  ratios: FinancialRatio[];
  overallScore: number; // 0-100
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  creditFactors: CreditFactor[];
}

export interface FinancialRatio {
  name: string;
  value: number;
  formatted: string;
  benchmark: string;
  status: 'healthy' | 'watch' | 'warning' | 'critical';
  explanation: string;
  category: 'liquidity' | 'solvency' | 'efficiency' | 'profitability';
}

export interface CreditFactor {
  factor: string;
  impact: 'positive' | 'neutral' | 'negative';
  description: string;
}

export function assessBalanceSheetHealth(params: {
  // Balance sheet items
  currentAssets: number;
  currentLiabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  cash: number;
  inventory: number;
  tradeReceivables: number;
  tradePayables: number;
  longTermDebt: number;
  // P&L items for efficiency ratios
  revenue: number;
  costOfSales: number;
  operatingProfit: number;
  interestExpense: number;
  netProfit: number;
  // Context
  periodDays?: number; // Days in the reporting period (default 365)
}): BalanceSheetHealth {
  const {
    currentAssets,
    currentLiabilities,
    totalAssets,
    totalLiabilities,
    equity,
    cash,
    inventory,
    tradeReceivables,
    tradePayables,
    revenue,
    costOfSales,
    operatingProfit,
    interestExpense,
    netProfit,
    periodDays = 365,
  } = params;

  const ratios: FinancialRatio[] = [];

  // ---- LIQUIDITY RATIOS ----

  // Current ratio
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 99;
  ratios.push({
    name: 'Current ratio',
    value: currentRatio,
    formatted: `${currentRatio.toFixed(2)}:1`,
    benchmark: 'Healthy: > 1.5:1, Watch: 1.0-1.5, Warning: < 1.0',
    status: currentRatio >= 1.5 ? 'healthy' : currentRatio >= 1.0 ? 'watch' : 'critical',
    explanation: currentRatio >= 1.5
      ? 'Strong ability to meet short-term obligations.'
      : currentRatio >= 1.0
        ? 'Adequate short-term cover but limited headroom.'
        : 'Current liabilities exceed current assets - liquidity risk.',
    category: 'liquidity',
  });

  // Quick ratio (acid test) - excludes inventory
  const quickAssets = currentAssets - inventory;
  const quickRatio = currentLiabilities > 0 ? quickAssets / currentLiabilities : 99;
  ratios.push({
    name: 'Quick ratio (acid test)',
    value: quickRatio,
    formatted: `${quickRatio.toFixed(2)}:1`,
    benchmark: 'Healthy: > 1.0:1, Watch: 0.7-1.0, Warning: < 0.7',
    status: quickRatio >= 1.0 ? 'healthy' : quickRatio >= 0.7 ? 'watch' : 'warning',
    explanation: quickRatio >= 1.0
      ? 'Can meet short-term obligations without selling inventory.'
      : 'Dependent on inventory liquidation to meet current obligations.',
    category: 'liquidity',
  });

  // Cash ratio
  const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 99;
  ratios.push({
    name: 'Cash ratio',
    value: cashRatio,
    formatted: `${cashRatio.toFixed(2)}:1`,
    benchmark: 'Healthy: > 0.5, Watch: 0.2-0.5, Warning: < 0.2',
    status: cashRatio >= 0.5 ? 'healthy' : cashRatio >= 0.2 ? 'watch' : 'warning',
    explanation: `Cash covers ${(cashRatio * 100).toFixed(0)}% of current liabilities.`,
    category: 'liquidity',
  });

  // ---- SOLVENCY RATIOS ----

  // Gearing ratio
  const gearing = equity > 0 ? (totalLiabilities / equity) * 100 : 999;
  ratios.push({
    name: 'Gearing (debt-to-equity)',
    value: gearing,
    formatted: `${gearing.toFixed(0)}%`,
    benchmark: 'Low: < 50%, Moderate: 50-100%, High: > 100%',
    status: gearing <= 50 ? 'healthy' : gearing <= 100 ? 'watch' : gearing <= 200 ? 'warning' : 'critical',
    explanation: gearing <= 50
      ? 'Low gearing - strong equity position.'
      : gearing <= 100
        ? 'Moderate gearing - monitor debt levels.'
        : 'High gearing - significant reliance on debt financing.',
    category: 'solvency',
  });

  // Debt ratio
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  ratios.push({
    name: 'Debt ratio',
    value: debtRatio,
    formatted: `${debtRatio.toFixed(0)}%`,
    benchmark: 'Healthy: < 50%, Watch: 50-75%, Warning: > 75%',
    status: debtRatio < 50 ? 'healthy' : debtRatio < 75 ? 'watch' : 'warning',
    explanation: `${debtRatio.toFixed(0)}% of assets are financed by debt.`,
    category: 'solvency',
  });

  // Interest cover
  if (interestExpense > 0) {
    const interestCover = operatingProfit / interestExpense;
    ratios.push({
      name: 'Interest cover',
      value: interestCover,
      formatted: `${interestCover.toFixed(1)}x`,
      benchmark: 'Comfortable: > 3x, Adequate: 1.5-3x, Warning: < 1.5x',
      status: interestCover >= 3 ? 'healthy' : interestCover >= 1.5 ? 'watch' : 'critical',
      explanation: interestCover >= 3
        ? 'Operating profit comfortably covers interest payments.'
        : interestCover >= 1
          ? 'Operating profit covers interest but with limited headroom.'
          : 'Operating profit insufficient to cover interest - significant risk.',
      category: 'solvency',
    });
  }

  // ---- EFFICIENCY RATIOS ----

  // Debtor days
  if (revenue > 0) {
    const debtorDays = (tradeReceivables / revenue) * periodDays;
    ratios.push({
      name: 'Debtor days',
      value: debtorDays,
      formatted: `${debtorDays.toFixed(0)} days`,
      benchmark: 'Good: < 30 days, Acceptable: 30-60 days, Slow: > 60 days',
      status: debtorDays <= 30 ? 'healthy' : debtorDays <= 60 ? 'watch' : 'warning',
      explanation: `Average ${debtorDays.toFixed(0)} days to collect from customers.`,
      category: 'efficiency',
    });
  }

  // Creditor days
  if (costOfSales > 0) {
    const creditorDays = (tradePayables / Math.abs(costOfSales)) * periodDays;
    ratios.push({
      name: 'Creditor days',
      value: creditorDays,
      formatted: `${creditorDays.toFixed(0)} days`,
      benchmark: 'Standard: 30-45 days, Extended: 45-90 days, Stretched: > 90 days',
      status: creditorDays <= 45 ? 'healthy' : creditorDays <= 90 ? 'watch' : 'warning',
      explanation: `Average ${creditorDays.toFixed(0)} days to pay suppliers. ${creditorDays > 60 ? 'Extended payment may indicate cash pressure.' : ''}`,
      category: 'efficiency',
    });
  }

  // Inventory days (if applicable)
  if (inventory > 0 && costOfSales !== 0) {
    const inventoryDays = (inventory / Math.abs(costOfSales)) * periodDays;
    ratios.push({
      name: 'Inventory days',
      value: inventoryDays,
      formatted: `${inventoryDays.toFixed(0)} days`,
      benchmark: 'Fast: < 30 days, Normal: 30-90 days, Slow: > 90 days (varies by industry)',
      status: inventoryDays <= 60 ? 'healthy' : inventoryDays <= 120 ? 'watch' : 'warning',
      explanation: `${inventoryDays.toFixed(0)} days of stock held. ${inventoryDays > 90 ? 'Consider slow-moving stock provisions.' : ''}`,
      category: 'efficiency',
    });
  }

  // ---- PROFITABILITY RATIOS ----

  if (revenue > 0) {
    // Gross margin
    const grossMargin = ((revenue - Math.abs(costOfSales)) / revenue) * 100;
    ratios.push({
      name: 'Gross margin',
      value: grossMargin,
      formatted: `${grossMargin.toFixed(1)}%`,
      benchmark: 'Varies by industry. Fashion/retail: 50-70% typical.',
      status: grossMargin >= 40 ? 'healthy' : grossMargin >= 20 ? 'watch' : 'warning',
      explanation: `${grossMargin.toFixed(1)}% gross margin after direct costs.`,
      category: 'profitability',
    });

    // Operating margin
    const operatingMargin = (operatingProfit / revenue) * 100;
    ratios.push({
      name: 'Operating margin',
      value: operatingMargin,
      formatted: `${operatingMargin.toFixed(1)}%`,
      benchmark: 'Good: > 15%, Adequate: 5-15%, Thin: < 5%',
      status: operatingMargin >= 15 ? 'healthy' : operatingMargin >= 5 ? 'watch' : operatingMargin >= 0 ? 'warning' : 'critical',
      explanation: operatingMargin >= 0
        ? `${operatingMargin.toFixed(1)}% operating margin.`
        : `Operating loss of ${Math.abs(operatingMargin).toFixed(1)}% of revenue.`,
      category: 'profitability',
    });

    // Net margin
    const netMargin = (netProfit / revenue) * 100;
    ratios.push({
      name: 'Net margin',
      value: netMargin,
      formatted: `${netMargin.toFixed(1)}%`,
      benchmark: 'Good: > 10%, Adequate: 2-10%, Loss: < 0%',
      status: netMargin >= 10 ? 'healthy' : netMargin >= 2 ? 'watch' : netMargin >= 0 ? 'warning' : 'critical',
      explanation: netMargin >= 0
        ? `${netMargin.toFixed(1)}% net margin after all costs and tax.`
        : `Net loss of ${Math.abs(netMargin).toFixed(1)}% of revenue.`,
      category: 'profitability',
    });

    // Return on equity (ROE)
    if (equity > 0) {
      const roe = (netProfit / equity) * 100;
      ratios.push({
        name: 'Return on equity (ROE)',
        value: roe,
        formatted: `${roe.toFixed(1)}%`,
        benchmark: 'Good: > 15%, Adequate: 8-15%, Poor: < 8%',
        status: roe >= 15 ? 'healthy' : roe >= 8 ? 'watch' : roe >= 0 ? 'warning' : 'critical',
        explanation: `${roe.toFixed(1)}% return on shareholders' equity.`,
        category: 'profitability',
      });
    }
  }

  // ---- CREDIT FACTORS ----

  const creditFactors: CreditFactor[] = [];

  // Net worth
  creditFactors.push({
    factor: 'Net worth',
    impact: equity > 0 ? 'positive' : 'negative',
    description: equity > 0
      ? `Positive net worth of ${formatGBP(equity)}.`
      : `Negative net worth of ${formatGBP(equity)}. Significant credit risk factor.`,
  });

  // Profitability
  creditFactors.push({
    factor: 'Profitability',
    impact: netProfit > 0 ? 'positive' : 'negative',
    description: netProfit > 0
      ? `Profitable - net profit of ${formatGBP(netProfit)}.`
      : `Loss-making - net loss of ${formatGBP(Math.abs(netProfit))}. Weakens credit profile.`,
  });

  // Liquidity
  creditFactors.push({
    factor: 'Liquidity',
    impact: currentRatio >= 1.5 ? 'positive' : currentRatio >= 1.0 ? 'neutral' : 'negative',
    description: `Current ratio of ${currentRatio.toFixed(2)}. ${currentRatio >= 1.5 ? 'Strong' : currentRatio >= 1.0 ? 'Adequate' : 'Weak'} short-term liquidity.`,
  });

  // Secured lending
  creditFactors.push({
    factor: 'Gearing',
    impact: gearing <= 50 ? 'positive' : gearing <= 100 ? 'neutral' : 'negative',
    description: `Gearing at ${gearing.toFixed(0)}%. ${gearing <= 50 ? 'Conservative' : gearing <= 100 ? 'Moderate' : 'High'} leverage.`,
  });

  // ---- OVERALL SCORE ----

  let totalScore = 0;
  let totalWeight = 0;

  for (const ratio of ratios) {
    const weight = ratio.category === 'liquidity' ? 3 : ratio.category === 'solvency' ? 2.5 : ratio.category === 'profitability' ? 2 : 1.5;
    const statusScore = ratio.status === 'healthy' ? 100 : ratio.status === 'watch' ? 65 : ratio.status === 'warning' ? 35 : 10;
    totalScore += statusScore * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

  let overallGrade: BalanceSheetHealth['overallGrade'];
  if (overallScore >= 80) overallGrade = 'A';
  else if (overallScore >= 65) overallGrade = 'B';
  else if (overallScore >= 50) overallGrade = 'C';
  else if (overallScore >= 35) overallGrade = 'D';
  else overallGrade = 'F';

  const summary = `Overall financial health: Grade ${overallGrade} (${overallScore}/100). ${
    overallGrade === 'A' ? 'Strong financial position across all key metrics.' :
    overallGrade === 'B' ? 'Good financial position with some areas to monitor.' :
    overallGrade === 'C' ? 'Mixed financial position - several areas need attention.' :
    overallGrade === 'D' ? 'Weak financial position - multiple warning indicators.' :
    'Critical financial position - urgent action required.'
  }`;

  return {
    ratios,
    overallScore,
    overallGrade,
    summary,
    creditFactors,
  };
}

function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}
