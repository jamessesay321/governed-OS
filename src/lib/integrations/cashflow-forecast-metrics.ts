/**
 * Cashflow Forecast Computation Layer
 *
 * Deterministic pure functions that parse and compute metrics from
 * Alonuko's Google Sheets cashflow forecast (2026).
 *
 * No side effects — takes parsed data in, returns computed metrics out.
 * Designed to compare forecast figures against Xero normalised_financials.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const MONTH_LABELS = [
  'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
  'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026',
] as const;

/** ISO date prefix for each month (used to match Xero period format YYYY-MM-01) */
const MONTH_ISO: Record<string, string> = {
  'Jan 2026': '2026-01-01',
  'Feb 2026': '2026-02-01',
  'Mar 2026': '2026-03-01',
  'Apr 2026': '2026-04-01',
  'May 2026': '2026-05-01',
  'Jun 2026': '2026-06-01',
  'Jul 2026': '2026-07-01',
  'Aug 2026': '2026-08-01',
  'Sep 2026': '2026-09-01',
  'Oct 2026': '2026-10-01',
  'Nov 2026': '2026-11-01',
  'Dec 2026': '2026-12-01',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonthlyForecastLine {
  label: string;
  values: number[];         // 12 entries, one per month (Jan–Dec)
  annualTotal: number;
}

export interface CashflowForecast {
  /** Revenue / inflow line items */
  inflows: MonthlyForecastLine[];
  /** Expense / outflow line items */
  outflows: MonthlyForecastLine[];
  /** Operational KPIs (consultations, conversion rates, client counts) */
  kpis: MonthlyForecastLine[];
  /** All raw parsed rows for reference */
  allRows: MonthlyForecastLine[];
  /** Month labels from the header row */
  months: string[];
  /** Year the forecast covers */
  year: number;
}

export interface MonthlyBreakdown {
  month: string;
  monthIso: string;
  inflows: number;
  outflows: number;
  net: number;
  cumulativeCash: number;
}

export interface CashflowSummary {
  totalInflows: number;
  totalOutflows: number;
  netCashflow: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

export interface ForecastVsActualMonth {
  month: string;
  monthIso: string;
  forecastRevenue: number;
  actualRevenue: number;
  variance: number;
  variancePct: number;
}

export interface ForecastVsActual {
  byMonth: ForecastVsActualMonth[];
}

export interface CashRunway {
  runwayMonths: number;
  firstNegativeMonth: string | null;
  minimumCashPoint: { month: string; balance: number };
  recommendedReserve: number;
}

/** Shape of a Xero normalised_financials row from Supabase */
export interface XeroActualRow {
  period: string;      // e.g. "2026-01-01"
  account_id: string;
  amount: number;
  transaction_count: number;
  source: string;
}

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a single CSV line, handling quoted fields with embedded commas.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse a numeric cell value. Handles:
 * - Comma-separated thousands: "83,317" → 83317
 * - Currency prefix: "£6,000" → 6000
 * - Percentages: "65%" → 0.65 (stored as decimal)
 * - Empty cells → 0
 * - Plain integers and decimals
 */
function parseNumericCell(raw: string): number {
  if (!raw || raw.trim() === '') return 0;

  const trimmed = raw.trim();

  // Percentage handling: "65%" → 0.65
  if (trimmed.endsWith('%')) {
    const num = parseFloat(trimmed.replace(/[^0-9.\-]/g, ''));
    return isNaN(num) ? 0 : num / 100;
  }

  // Remove currency symbols, commas, spaces
  const cleaned = trimmed.replace(/[£$€,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Determine if a label represents an inflow (revenue) line.
 */
function isInflowLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes('bridal balance') ||
    lower.includes('bridal deposit') ||
    lower.includes('consultation income') ||
    lower.includes('new bridal') ||
    lower.includes('remaining bridal') ||
    lower.includes('income') ||
    lower.includes('revenue') ||
    lower.includes('deposit') ||
    lower.includes('sales')
  );
}

/**
 * Determine if a label represents an outflow (expense) line.
 */
function isOutflowLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes('expense') ||
    lower.includes('loan') ||
    lower.includes('repayment') ||
    lower.includes('cost') ||
    lower.includes('salary') ||
    lower.includes('rent') ||
    lower.includes('tax') ||
    lower.includes('vat')
  );
}

/**
 * Determine if a label represents a KPI / operational metric (not GBP).
 */
function isKpiLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes('no. of') ||
    lower.includes('number of') ||
    lower.includes('conversion') ||
    lower.includes('average') ||
    lower.includes('total no') ||
    lower.includes('confirmed client') ||
    lower.includes('appointments') ||
    lower.includes('consultations') ||
    lower.includes('trunk show') ||
    lower.includes('uk consultation')
  );
}

// ---------------------------------------------------------------------------
// 1. parseCashflowForecast
// ---------------------------------------------------------------------------

/**
 * Parse raw CSV text from the Google Sheets cashflow forecast into a
 * structured CashflowForecast object.
 *
 * The CSV has an irregular layout:
 *   - First column is often empty (indent column)
 *   - Second column is the row label ("Particulars" header)
 *   - Columns 3–14 are Jan 2026 – Dec 2026
 *   - Column 15 is "2026 Total"
 *   - Many empty/separator rows
 *   - Some rows contain KPI data (counts, percentages) rather than GBP amounts
 */
export function parseCashflowForecast(csvText: string): CashflowForecast {
  const lines = csvText.trim().split(/\r?\n/);

  const inflows: MonthlyForecastLine[] = [];
  const outflows: MonthlyForecastLine[] = [];
  const kpis: MonthlyForecastLine[] = [];
  const allRows: MonthlyForecastLine[] = [];

  let detectedMonths: string[] = [...MONTH_LABELS];

  for (const line of lines) {
    const fields = parseCSVLine(line);

    // The label is typically in position 1 (index 1) because column 0 is an indent
    const label = (fields[1] ?? '').trim();

    // Skip empty rows, pure separator rows, and the header row
    if (!label || label === 'Particulars') {
      // Check if this is the header row — extract month labels
      if (label === 'Particulars') {
        const monthFields = fields.slice(2, 14);
        if (monthFields.length === 12 && monthFields[0].includes('2026')) {
          detectedMonths = monthFields.map(m => m.trim());
        }
      }
      continue;
    }

    // Extract the 12 monthly values (columns index 2–13)
    const monthlyValues = fields.slice(2, 14).map(parseNumericCell);

    // Pad to 12 if fewer columns present
    while (monthlyValues.length < 12) {
      monthlyValues.push(0);
    }

    // Annual total (column 14), or sum if not present
    const rawTotal = fields[14] !== undefined ? parseNumericCell(fields[14]) : 0;
    const computedTotal = monthlyValues.reduce((a, b) => a + b, 0);
    const annualTotal = rawTotal || computedTotal;

    // Skip rows where the label looks like stray data (e.g. just a currency value)
    if (label.startsWith('£') || label.startsWith('$') || /^\d/.test(label)) {
      continue;
    }

    const forecastLine: MonthlyForecastLine = {
      label,
      values: monthlyValues,
      annualTotal: Math.round(annualTotal * 100) / 100,
    };

    allRows.push(forecastLine);

    // Classify the line
    if (isKpiLabel(label)) {
      kpis.push(forecastLine);
    } else if (isOutflowLabel(label)) {
      outflows.push(forecastLine);
    } else if (isInflowLabel(label)) {
      inflows.push(forecastLine);
    }
    // Rows that don't match any category are still in allRows for reference
  }

  return {
    inflows,
    outflows,
    kpis,
    allRows,
    months: detectedMonths as unknown as string[],
    year: 2026,
  };
}

// ---------------------------------------------------------------------------
// 2. computeCashflowSummary
// ---------------------------------------------------------------------------

/**
 * Aggregate all inflow and outflow lines into a monthly breakdown with
 * running cumulative cash position.
 */
export function computeCashflowSummary(
  forecast: CashflowForecast,
  openingCashBalance: number = 0
): CashflowSummary {
  const monthlyBreakdown: MonthlyBreakdown[] = [];
  let totalInflows = 0;
  let totalOutflows = 0;
  let cumulative = openingCashBalance;

  for (let m = 0; m < 12; m++) {
    const monthLabel = forecast.months[m] ?? MONTH_LABELS[m];
    const monthIso = MONTH_ISO[monthLabel] ?? `2026-${String(m + 1).padStart(2, '0')}-01`;

    const monthInflows = forecast.inflows.reduce(
      (sum, line) => sum + (line.values[m] ?? 0),
      0
    );

    const monthOutflows = forecast.outflows.reduce(
      (sum, line) => sum + (line.values[m] ?? 0),
      0
    );

    const net = monthInflows - monthOutflows;
    cumulative += net;

    totalInflows += monthInflows;
    totalOutflows += monthOutflows;

    monthlyBreakdown.push({
      month: monthLabel,
      monthIso,
      inflows: Math.round(monthInflows * 100) / 100,
      outflows: Math.round(monthOutflows * 100) / 100,
      net: Math.round(net * 100) / 100,
      cumulativeCash: Math.round(cumulative * 100) / 100,
    });
  }

  return {
    totalInflows: Math.round(totalInflows * 100) / 100,
    totalOutflows: Math.round(totalOutflows * 100) / 100,
    netCashflow: Math.round((totalInflows - totalOutflows) * 100) / 100,
    monthlyBreakdown,
  };
}

// ---------------------------------------------------------------------------
// 3. computeForecastVsActuals
// ---------------------------------------------------------------------------

/**
 * Compare forecast revenue to Xero actual revenue from normalised_financials.
 *
 * @param forecast   - Parsed cashflow forecast
 * @param xeroActuals - Array of normalised_financials rows (revenue accounts only)
 *
 * Revenue actuals are aggregated by period (month). Forecast revenue is the
 * sum of all inflow lines for each month.
 */
export function computeForecastVsActuals(
  forecast: CashflowForecast,
  xeroActuals: XeroActualRow[]
): ForecastVsActual {
  // Aggregate Xero actuals by period
  const actualsByPeriod = new Map<string, number>();
  for (const row of xeroActuals) {
    const period = row.period.substring(0, 10); // normalise to YYYY-MM-DD
    const existing = actualsByPeriod.get(period) ?? 0;
    // Revenue amounts in Xero are typically negative (credit), so take absolute value
    actualsByPeriod.set(period, existing + Math.abs(row.amount));
  }

  const byMonth: ForecastVsActualMonth[] = [];

  for (let m = 0; m < 12; m++) {
    const monthLabel = forecast.months[m] ?? MONTH_LABELS[m];
    const monthIso = MONTH_ISO[monthLabel] ?? `2026-${String(m + 1).padStart(2, '0')}-01`;

    const forecastRevenue = forecast.inflows.reduce(
      (sum, line) => sum + (line.values[m] ?? 0),
      0
    );

    const actualRevenue = actualsByPeriod.get(monthIso) ?? 0;
    const variance = actualRevenue - forecastRevenue;
    const variancePct = forecastRevenue !== 0
      ? (variance / forecastRevenue) * 100
      : actualRevenue !== 0 ? 100 : 0;

    byMonth.push({
      month: monthLabel,
      monthIso,
      forecastRevenue: Math.round(forecastRevenue * 100) / 100,
      actualRevenue: Math.round(actualRevenue * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePct: Math.round(variancePct * 100) / 100,
    });
  }

  return { byMonth };
}

// ---------------------------------------------------------------------------
// 4. computeCashRunway
// ---------------------------------------------------------------------------

/**
 * Compute the cash runway from the forecast, given the current cash balance.
 *
 * Walks forward from the current month, applying forecast net cashflows,
 * to determine how many months the business can sustain before cash goes negative.
 *
 * @param forecast          - Parsed cashflow forecast
 * @param currentCashBalance - Current bank balance (GBP)
 */
export function computeCashRunway(
  forecast: CashflowForecast,
  currentCashBalance: number
): CashRunway {
  const summary = computeCashflowSummary(forecast, currentCashBalance);

  let runwayMonths = 0;
  let firstNegativeMonth: string | null = null;
  let minimumCash = currentCashBalance;
  let minimumCashMonth = 'Opening';

  for (const mb of summary.monthlyBreakdown) {
    if (mb.cumulativeCash >= 0) {
      runwayMonths++;
    }

    if (mb.cumulativeCash < 0 && firstNegativeMonth === null) {
      firstNegativeMonth = mb.month;
    }

    if (mb.cumulativeCash < minimumCash) {
      minimumCash = mb.cumulativeCash;
      minimumCashMonth = mb.month;
    }
  }

  // Recommended reserve = 3 months of average outflows
  const avgMonthlyOutflows = summary.totalOutflows / 12;
  const recommendedReserve = Math.round(avgMonthlyOutflows * 3 * 100) / 100;

  return {
    runwayMonths,
    firstNegativeMonth,
    minimumCashPoint: {
      month: minimumCashMonth,
      balance: Math.round(minimumCash * 100) / 100,
    },
    recommendedReserve,
  };
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

export { MONTHS, MONTH_LABELS, MONTH_ISO };
