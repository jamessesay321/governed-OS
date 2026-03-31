/**
 * Financial Sense-Check Engine
 * --------------------------------------------------
 * Validates financial data for impossible or suspicious numbers.
 * Runs automatically on every financial page to catch:
 *   - Calculation errors (net profit > revenue)
 *   - Sign mismatches (negative revenue, positive expenses in raw data)
 *   - Balance sheet imbalances
 *   - Suspicious period-over-period movements
 *
 * Flags severity levels:
 *   ERROR   — Something is mathematically impossible, likely a bug
 *   WARNING — Unusual but possible, needs human review
 *   INFO    — Noteworthy for context
 */

export type SenseCheckSeverity = 'error' | 'warning' | 'info';

export interface SenseCheckFlag {
  severity: SenseCheckSeverity;
  code: string;
  message: string;
  period?: string;
  field?: string;
  value?: number;
  expected?: string;
}

export interface PnLCheckInput {
  period: string;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface BSCheckInput {
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

// ─── P&L Sense Checks ──────────────────────────────────────────

export function checkPnL(input: PnLCheckInput): SenseCheckFlag[] {
  const flags: SenseCheckFlag[] = [];
  const { period, revenue, costOfSales, grossProfit, expenses, netProfit } = input;

  // ERROR: Net profit exceeds revenue (mathematically impossible for operating P&L)
  if (netProfit > revenue && revenue > 0) {
    flags.push({
      severity: 'error',
      code: 'PNL_NET_EXCEEDS_REVENUE',
      message: `Net profit (${fmt(netProfit)}) is greater than revenue (${fmt(revenue)}). This is mathematically impossible — check cost/expense sign conventions.`,
      period,
      field: 'netProfit',
      value: netProfit,
      expected: `≤ ${fmt(revenue)}`,
    });
  }

  // ERROR: Gross profit exceeds revenue
  if (grossProfit > revenue && revenue > 0) {
    flags.push({
      severity: 'error',
      code: 'PNL_GP_EXCEEDS_REVENUE',
      message: `Gross profit (${fmt(grossProfit)}) exceeds revenue (${fmt(revenue)}). Check cost of sales sign convention.`,
      period,
      field: 'grossProfit',
      value: grossProfit,
      expected: `≤ ${fmt(revenue)}`,
    });
  }

  // ERROR: Gross profit calculation mismatch
  const expectedGP = revenue - costOfSales;
  if (Math.abs(grossProfit - expectedGP) > 0.02) {
    flags.push({
      severity: 'error',
      code: 'PNL_GP_MISMATCH',
      message: `Gross profit (${fmt(grossProfit)}) doesn't match Revenue - Cost of Sales (${fmt(expectedGP)}).`,
      period,
      field: 'grossProfit',
      value: grossProfit,
      expected: fmt(expectedGP),
    });
  }

  // ERROR: Net profit calculation mismatch
  const expectedNP = grossProfit - expenses;
  if (Math.abs(netProfit - expectedNP) > 0.02) {
    flags.push({
      severity: 'error',
      code: 'PNL_NP_MISMATCH',
      message: `Net profit (${fmt(netProfit)}) doesn't match Gross Profit - Expenses (${fmt(expectedNP)}).`,
      period,
      field: 'netProfit',
      value: netProfit,
      expected: fmt(expectedNP),
    });
  }

  // WARNING: Negative revenue
  if (revenue < 0) {
    flags.push({
      severity: 'warning',
      code: 'PNL_NEGATIVE_REVENUE',
      message: `Revenue is negative (${fmt(revenue)}). This could indicate credit notes exceeding sales, or a sign convention issue.`,
      period,
      field: 'revenue',
      value: revenue,
    });
  }

  // WARNING: Zero revenue with expenses
  if (revenue === 0 && expenses > 0) {
    flags.push({
      severity: 'warning',
      code: 'PNL_ZERO_REVENUE_WITH_EXPENSES',
      message: `No revenue recorded but ${fmt(expenses)} in expenses. Could indicate incomplete data sync.`,
      period,
    });
  }

  // WARNING: Very high gross margin (>90%) — unusual for most businesses
  if (revenue > 0) {
    const gpMargin = (grossProfit / revenue) * 100;
    if (gpMargin > 90) {
      flags.push({
        severity: 'info',
        code: 'PNL_HIGH_GROSS_MARGIN',
        message: `Gross margin is ${gpMargin.toFixed(1)}%. This is unusually high — verify cost of sales accounts are mapped correctly.`,
        period,
        field: 'grossMargin',
        value: gpMargin,
      });
    }
  }

  // WARNING: Expenses > 2x revenue — possible but worth flagging
  if (revenue > 0 && expenses > revenue * 2) {
    flags.push({
      severity: 'warning',
      code: 'PNL_EXPENSES_VERY_HIGH',
      message: `Expenses (${fmt(expenses)}) are more than 2x revenue (${fmt(revenue)}). Verify expense account classifications.`,
      period,
    });
  }

  return flags;
}

// ─── Balance Sheet Sense Checks ─────────────────────────────────

export function checkBalanceSheet(input: BSCheckInput): SenseCheckFlag[] {
  const flags: SenseCheckFlag[] = [];
  const { period, totalAssets, totalLiabilities, totalEquity } = input;

  // WARNING: Assets = Liabilities + Equity (accounting equation)
  const expectedEquity = totalAssets - totalLiabilities;
  if (totalEquity !== 0 && Math.abs(totalEquity - expectedEquity) > 1) {
    flags.push({
      severity: 'warning',
      code: 'BS_EQUATION_IMBALANCE',
      message: `Balance sheet doesn't balance. Assets (${fmt(totalAssets)}) ≠ Liabilities (${fmt(totalLiabilities)}) + Equity (${fmt(totalEquity)}). Difference: ${fmt(totalAssets - totalLiabilities - totalEquity)}.`,
      period,
    });
  }

  // WARNING: Negative total assets
  if (totalAssets < 0) {
    flags.push({
      severity: 'warning',
      code: 'BS_NEGATIVE_ASSETS',
      message: `Total assets are negative (${fmt(totalAssets)}). Check asset account sign conventions.`,
      period,
      field: 'totalAssets',
      value: totalAssets,
    });
  }

  return flags;
}

// ─── Period-over-Period Checks ──────────────────────────────────

export function checkPeriodMovement(
  current: PnLCheckInput,
  prior: PnLCheckInput
): SenseCheckFlag[] {
  const flags: SenseCheckFlag[] = [];

  // WARNING: Revenue change > 100% in a single month
  if (prior.revenue > 0) {
    const change = ((current.revenue - prior.revenue) / prior.revenue) * 100;
    if (Math.abs(change) > 100) {
      flags.push({
        severity: 'warning',
        code: 'PERIOD_REVENUE_SPIKE',
        message: `Revenue changed ${change > 0 ? '+' : ''}${change.toFixed(0)}% from ${current.period} to ${prior.period}. This may be correct but is worth reviewing.`,
        period: current.period,
        field: 'revenue',
        value: change,
      });
    }
  }

  // WARNING: Expenses change > 200% in a single month
  if (prior.expenses > 0) {
    const change = ((current.expenses - prior.expenses) / prior.expenses) * 100;
    if (Math.abs(change) > 200) {
      flags.push({
        severity: 'warning',
        code: 'PERIOD_EXPENSE_SPIKE',
        message: `Expenses changed ${change > 0 ? '+' : ''}${change.toFixed(0)}% from ${current.period} to ${prior.period}. Verify this isn't a data issue.`,
        period: current.period,
        field: 'expenses',
        value: change,
      });
    }
  }

  return flags;
}

// ─── Batch Check ────────────────────────────────────────────────

export function runAllPnLChecks(periods: PnLCheckInput[]): SenseCheckFlag[] {
  const flags: SenseCheckFlag[] = [];

  for (const p of periods) {
    flags.push(...checkPnL(p));
  }

  // Period-over-period checks (sorted ascending)
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  for (let i = 1; i < sorted.length; i++) {
    flags.push(...checkPeriodMovement(sorted[i], sorted[i - 1]));
  }

  // Sort: errors first, then warnings, then info
  const order: Record<SenseCheckSeverity, number> = { error: 0, warning: 1, info: 2 };
  flags.sort((a, b) => order[a.severity] - order[b.severity]);

  return flags;
}

// ─── Helper ─────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
