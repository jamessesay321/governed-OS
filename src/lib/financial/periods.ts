/**
 * Financial year-aware period utilities.
 *
 * All functions take year-end config as parameters (no DB dependency)
 * so they're pure, testable, and usable on both server and client.
 */

// ─── Financial Year Boundaries ──────────────────────────────────────

/**
 * Get the start date of the financial year containing `referenceDate`.
 *
 * Example: year-end = March 31 → FY starts April 1.
 * For reference date Nov 2025 → FY start = 1 Apr 2025.
 * For reference date Feb 2026 → FY start = 1 Apr 2025.
 * For reference date May 2026 → FY start = 1 Apr 2026.
 */
export function getFinancialYearStart(
  referenceDate: Date,
  yearEndMonth: number
): Date {
  const fyStartMonth = (yearEndMonth % 12) + 1; // month after year-end
  const refMonth = referenceDate.getMonth() + 1; // 1-indexed
  const refYear = referenceDate.getFullYear();

  // If FY starts in month 1 (Jan), it's a calendar year
  if (fyStartMonth === 1) {
    return new Date(refYear, 0, 1);
  }

  // If we're before the FY start month, the FY started last year
  const fyStartYear = refMonth >= fyStartMonth ? refYear : refYear - 1;
  return new Date(fyStartYear, fyStartMonth - 1, 1);
}

/**
 * Get the current financial year start as a period string (YYYY-MM-01).
 */
export function getCurrentFYStartPeriod(yearEndMonth: number): string {
  const start = getFinancialYearStart(new Date(), yearEndMonth);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Get the financial year end date for the FY containing `referenceDate`.
 */
export function getFinancialYearEnd(
  referenceDate: Date,
  yearEndMonth: number,
  yearEndDay: number
): Date {
  const start = getFinancialYearStart(referenceDate, yearEndMonth);
  // Year-end is in yearEndMonth of the same year (if FY starts Jan+)
  // or the next year (if FY crosses calendar boundary)
  let endYear = start.getFullYear();
  const fyStartMonth = (yearEndMonth % 12) + 1;
  if (fyStartMonth > 1) {
    // FY crosses into next calendar year
    endYear = yearEndMonth >= fyStartMonth ? start.getFullYear() : start.getFullYear() + 1;
  }
  // Simpler: FY end is always start year + (yearEndMonth < fyStartMonth ? 1 : 0)
  if (yearEndMonth < (start.getMonth() + 1)) {
    endYear = start.getFullYear() + 1;
  }
  return new Date(endYear, yearEndMonth - 1, yearEndDay);
}

// ─── Period Filtering ───────────────────────────────────────────────

/**
 * Filter periods to only those within the current financial year (YTD).
 */
export function getYTDPeriods(
  availablePeriods: string[],
  yearEndMonth: number
): string[] {
  const fyStart = getCurrentFYStartPeriod(yearEndMonth);
  const today = new Date();
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  return availablePeriods
    .filter((p) => p >= fyStart && p <= currentPeriod)
    .sort();
}

/**
 * Get default display periods: current financial year's months.
 * Falls back to last 12 months if no periods fall in current FY.
 */
export function getDefaultDisplayPeriods(
  availablePeriods: string[],
  yearEndMonth: number
): string[] {
  const ytd = getYTDPeriods(availablePeriods, yearEndMonth);
  if (ytd.length > 0) return ytd;

  // Fallback: last 12 months
  return [...availablePeriods].sort().reverse().slice(0, 12).reverse();
}

// ─── Financial Year Labels ──────────────────────────────────────────

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Get a human label for the current financial year.
 * E.g. "Apr 2025 – Mar 2026" for a March year-end.
 */
export function getFinancialYearLabel(yearEndMonth: number): string {
  const start = getFinancialYearStart(new Date(), yearEndMonth);
  const fyStartMonth = start.getMonth(); // 0-indexed
  const startYear = start.getFullYear();
  const endMonth = yearEndMonth - 1; // 0-indexed
  const endYear = endMonth < fyStartMonth ? startYear + 1 : startYear;

  return `${MONTH_NAMES_SHORT[fyStartMonth]} ${startYear} \u2013 ${MONTH_NAMES_SHORT[endMonth]} ${endYear}`;
}

/**
 * Get the financial quarter for a period string.
 * For a March year-end: Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar.
 */
export function getFinancialQuarter(
  period: string,
  yearEndMonth: number
): { quarter: number; label: string; year: number } {
  const d = new Date(period);
  const month = d.getMonth() + 1; // 1-indexed
  const fyStartMonth = (yearEndMonth % 12) + 1;

  // Months since FY start (0-indexed)
  let monthsIntoFY = month - fyStartMonth;
  if (monthsIntoFY < 0) monthsIntoFY += 12;

  const quarter = Math.floor(monthsIntoFY / 3) + 1;

  // Determine the FY label year (use FY end year)
  const start = getFinancialYearStart(d, yearEndMonth);
  const endYear = yearEndMonth < fyStartMonth
    ? start.getFullYear() + 1
    : start.getFullYear();

  return {
    quarter,
    label: `Q${quarter} FY${String(endYear).slice(-2)}`,
    year: endYear,
  };
}

/**
 * Group periods into financial quarters.
 */
export function groupByFinancialQuarter(
  periods: string[],
  yearEndMonth: number
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const p of periods) {
    const { label } = getFinancialQuarter(p, yearEndMonth);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(p);
  }
  return groups;
}

// ─── Calendar Year Defaults ─────────────────────────────────────────

/** Default year-end month when no accounting config exists (December = calendar year). */
export const DEFAULT_YEAR_END_MONTH = 12;
export const DEFAULT_YEAR_END_DAY = 31;
