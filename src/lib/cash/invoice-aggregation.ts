/**
 * Cash-in horizon bucketing.
 *
 * Given a list of open invoices (each with an *effective* expected payment
 * date — either a user override or a model prediction), bucket them into the
 * four KPI horizons used at the top of the /cash/cash-in page.
 */

export type HorizonBucket = 'overdue' | 'today' | 'next_7' | 'next_8_30' | 'beyond';

export interface InvoiceForBucketing {
  amount: number; // remaining/expected amount in major units
  expectedDate: string; // YYYY-MM-DD
  excluded: boolean;
}

export interface HorizonTotal {
  bucket: HorizonBucket;
  count: number;
  amount: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(s: string): Date {
  return new Date(`${s.substring(0, 10)}T00:00:00Z`);
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function bucketForDate(expectedDate: string, today: Date = new Date()): HorizonBucket {
  const t = startOfDayUTC(today);
  const d = startOfDayUTC(parseDate(expectedDate));
  const diff = Math.round((d.getTime() - t.getTime()) / MS_PER_DAY);

  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'next_7';
  if (diff <= 30) return 'next_8_30';
  return 'beyond';
}

/**
 * Aggregate invoices into the four horizon KPIs (plus a 'beyond' for anything
 * past 30 days, which the page doesn't show as a top-line KPI but tracks for
 * the table tab).
 *
 * Excluded invoices contribute nothing to totals (but the table still renders them
 * if the "Show excluded" toggle is on).
 */
export function aggregateHorizons(
  invoices: InvoiceForBucketing[],
  today: Date = new Date(),
): Record<HorizonBucket, HorizonTotal> {
  const totals: Record<HorizonBucket, HorizonTotal> = {
    overdue: { bucket: 'overdue', count: 0, amount: 0 },
    today: { bucket: 'today', count: 0, amount: 0 },
    next_7: { bucket: 'next_7', count: 0, amount: 0 },
    next_8_30: { bucket: 'next_8_30', count: 0, amount: 0 },
    beyond: { bucket: 'beyond', count: 0, amount: 0 },
  };

  for (const inv of invoices) {
    if (inv.excluded) continue;
    const bucket = bucketForDate(inv.expectedDate, today);
    totals[bucket].count += 1;
    totals[bucket].amount += inv.amount;
  }

  return totals;
}

export const HORIZON_LABELS: Record<HorizonBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  next_7: 'Next 1-7 days',
  next_8_30: 'Next 8-30 days',
  beyond: 'Beyond 30 days',
};
