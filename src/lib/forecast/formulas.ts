/**
 * Forecast Formula Engine
 *
 * Resolves formula tokens (e.g. [[AVERAGE6]], [[PREVMONTH]], [[SMLASTYEAR]])
 * against historical financial data to produce forecast values.
 *
 * All functions are pure — no DB or side effects.
 *
 * Supported formulas:
 *   [[AVERAGE3]]     — 3-month trailing average
 *   [[AVERAGE6]]     — 6-month trailing average
 *   [[AVERAGE12]]    — 12-month trailing average
 *   [[PREVMONTH]]    — Same value as prior month
 *   [[SMLASTYEAR]]   — Same month, last year (seasonality-preserving)
 *   [[GROWTHRATE]]   — Apply trailing 6-month CAGR
 *   [[LINEARTREND]]  — Linear regression extrapolation (last 12 months)
 *   [[MEDIAN6]]      — 6-month trailing median
 *   [[MAX12]]        — Maximum of last 12 months
 *   [[MIN12]]        — Minimum of last 12 months
 *   [[ZERO]]         — Always zero
 *   123.45           — Literal number (no brackets)
 *   +5%              — Grow previous month by percentage
 */

// ─── Types ──────────────────────────────────────────────────────────

export type FormulaToken =
  | '[[AVERAGE3]]'
  | '[[AVERAGE6]]'
  | '[[AVERAGE12]]'
  | '[[PREVMONTH]]'
  | '[[SMLASTYEAR]]'
  | '[[GROWTHRATE]]'
  | '[[LINEARTREND]]'
  | '[[MEDIAN6]]'
  | '[[MAX12]]'
  | '[[MIN12]]'
  | '[[ZERO]]'
  | string; // literal number or +N%

export interface FormulaContext {
  /** Historical values in chronological order [oldest → newest] */
  historicalValues: number[];
  /** The corresponding period strings (YYYY-MM or YYYY-MM-01) */
  historicalPeriods: string[];
  /** Index of the forecast month (0 = first forecast month) */
  forecastIndex: number;
  /** Previously forecast values (for chaining month-over-month) */
  forecastValues: number[];
}

export interface FormulaLineItem {
  /** Account or category label */
  label: string;
  /** Formula to apply */
  formula: FormulaToken;
  /** Optional override value (if set, bypasses formula) */
  override?: number;
}

export interface ResolvedForecast {
  periods: string[];
  lines: Array<{
    label: string;
    formula: FormulaToken;
    values: number[];
  }>;
}

// ─── Token Registry ─────────────────────────────────────────────────

export const FORMULA_TOKENS: Array<{
  token: FormulaToken;
  label: string;
  description: string;
}> = [
  { token: '[[AVERAGE3]]', label: 'Avg (3m)', description: 'Average of last 3 months' },
  { token: '[[AVERAGE6]]', label: 'Avg (6m)', description: 'Average of last 6 months' },
  { token: '[[AVERAGE12]]', label: 'Avg (12m)', description: 'Average of last 12 months' },
  { token: '[[PREVMONTH]]', label: 'Prev Month', description: 'Same as previous month' },
  { token: '[[SMLASTYEAR]]', label: 'Same Month LY', description: 'Same month from last year (seasonal)' },
  { token: '[[GROWTHRATE]]', label: 'Growth Rate', description: 'Apply 6-month compound growth rate' },
  { token: '[[LINEARTREND]]', label: 'Linear Trend', description: 'Linear regression on last 12 months' },
  { token: '[[MEDIAN6]]', label: 'Median (6m)', description: 'Median of last 6 months' },
  { token: '[[MAX12]]', label: 'Max (12m)', description: 'Maximum of last 12 months' },
  { token: '[[MIN12]]', label: 'Min (12m)', description: 'Minimum of last 12 months' },
  { token: '[[ZERO]]', label: 'Zero', description: 'Always zero' },
];

// ─── Core Resolver ──────────────────────────────────────────────────

/**
 * Resolve a single formula token to a number for one forecast month.
 */
export function resolveFormula(
  token: FormulaToken,
  ctx: FormulaContext,
): number {
  // Literal number
  if (!token.startsWith('[[') && !token.startsWith('+')) {
    const num = parseFloat(token);
    return isNaN(num) ? 0 : num;
  }

  // Percentage growth: "+5%" means grow previous by 5%
  if (token.startsWith('+') && token.endsWith('%')) {
    const pct = parseFloat(token.slice(1, -1));
    if (isNaN(pct)) return 0;
    const prev = ctx.forecastIndex > 0
      ? ctx.forecastValues[ctx.forecastIndex - 1]
      : ctx.historicalValues[ctx.historicalValues.length - 1] ?? 0;
    return prev * (1 + pct / 100);
  }

  // All available data: historical + already-forecast values
  const allValues = [...ctx.historicalValues, ...ctx.forecastValues.slice(0, ctx.forecastIndex)];

  switch (token) {
    case '[[ZERO]]':
      return 0;

    case '[[PREVMONTH]]': {
      return allValues[allValues.length - 1] ?? 0;
    }

    case '[[AVERAGE3]]':
      return trailingAverage(allValues, 3);

    case '[[AVERAGE6]]':
      return trailingAverage(allValues, 6);

    case '[[AVERAGE12]]':
      return trailingAverage(allValues, 12);

    case '[[MEDIAN6]]':
      return trailingMedian(allValues, 6);

    case '[[MAX12]]':
      return trailingMax(allValues, 12);

    case '[[MIN12]]':
      return trailingMin(allValues, 12);

    case '[[SMLASTYEAR]]': {
      // Look 12 months back in the combined data
      const idx = allValues.length - 12;
      return idx >= 0 ? allValues[idx] : (allValues[0] ?? 0);
    }

    case '[[GROWTHRATE]]': {
      return applyGrowthRate(allValues, 6);
    }

    case '[[LINEARTREND]]': {
      return linearTrendExtrapolation(allValues, 12, ctx.forecastIndex);
    }

    default:
      return 0;
  }
}

// ─── Batch Resolver ─────────────────────────────────────────────────

/**
 * Generate a full forecast for multiple line items over multiple periods.
 */
export function generateFormulaForecast(
  lineItems: FormulaLineItem[],
  historicalData: Record<string, number[]>, // key = label, value = chronological amounts
  historicalPeriods: string[],
  forecastMonths: number,
): ResolvedForecast {
  const forecastPeriods = generateForecastPeriods(
    historicalPeriods[historicalPeriods.length - 1] ?? '',
    forecastMonths,
  );

  const lines = lineItems.map((item) => {
    const history = historicalData[item.label] ?? [];
    const forecastValues: number[] = [];

    for (let i = 0; i < forecastMonths; i++) {
      if (item.override !== undefined) {
        forecastValues.push(item.override);
      } else {
        const ctx: FormulaContext = {
          historicalValues: history,
          historicalPeriods,
          forecastIndex: i,
          forecastValues,
        };
        forecastValues.push(resolveFormula(item.formula, ctx));
      }
    }

    return {
      label: item.label,
      formula: item.formula,
      values: forecastValues,
    };
  });

  return { periods: forecastPeriods, lines };
}

// ─── Helpers ────────────────────────────────────────────────────────

function trailingAverage(values: number[], n: number): number {
  const slice = values.slice(-n);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function trailingMedian(values: number[], n: number): number {
  const slice = [...values.slice(-n)].sort((a, b) => a - b);
  if (slice.length === 0) return 0;
  const mid = Math.floor(slice.length / 2);
  return slice.length % 2 === 0
    ? (slice[mid - 1] + slice[mid]) / 2
    : slice[mid];
}

function trailingMax(values: number[], n: number): number {
  const slice = values.slice(-n);
  return slice.length > 0 ? Math.max(...slice) : 0;
}

function trailingMin(values: number[], n: number): number {
  const slice = values.slice(-n);
  return slice.length > 0 ? Math.min(...slice) : 0;
}

function applyGrowthRate(values: number[], lookbackMonths: number): number {
  const slice = values.slice(-lookbackMonths);
  if (slice.length < 2) return values[values.length - 1] ?? 0;

  const first = slice[0];
  const last = slice[slice.length - 1];
  if (first <= 0 || last <= 0) return last;

  // Compound monthly growth rate
  const months = slice.length - 1;
  const cmgr = Math.pow(last / first, 1 / months) - 1;
  return last * (1 + cmgr);
}

function linearTrendExtrapolation(
  values: number[],
  lookbackMonths: number,
  forecastIndex: number,
): number {
  const slice = values.slice(-lookbackMonths);
  if (slice.length < 2) return values[values.length - 1] ?? 0;

  const n = slice.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += slice[i];
    sumXY += i * slice[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return slice[slice.length - 1];

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Extrapolate: x = n + forecastIndex
  return intercept + slope * (n + forecastIndex);
}

function generateForecastPeriods(lastHistorical: string, months: number): string[] {
  if (!lastHistorical) return [];
  const periods: string[] = [];
  const d = new Date(lastHistorical.length === 7 ? lastHistorical + '-01' : lastHistorical);

  for (let i = 0; i < months; i++) {
    d.setMonth(d.getMonth() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    periods.push(`${y}-${m}`);
  }

  return periods;
}

// ─── Validation ─────────────────────────────────────────────────────

/**
 * Check if a string is a valid formula token.
 */
export function isValidFormula(token: string): boolean {
  if (token === '[[ZERO]]') return true;
  if (FORMULA_TOKENS.some((t) => t.token === token)) return true;
  if (token.startsWith('+') && token.endsWith('%')) {
    return !isNaN(parseFloat(token.slice(1, -1)));
  }
  return !isNaN(parseFloat(token));
}
