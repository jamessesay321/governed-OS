/**
 * Monday.com → Bridal Orders Mapping Layer
 *
 * Converts Monday.com board items into the MondayBridalOrder format
 * using heuristic column matching. Designed to work with Alonuko's
 * Monday.com boards that track confirmed and unconfirmed clients.
 */

import type { MondayItem, MondayColumnValue } from './monday';
import { fetchBoardItems } from './monday';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MondayBridalOrder {
  mondayItemId: string;
  clientName: string;
  status: 'confirmed' | 'on_hold' | 'cancelled' | 'completed' | 'enquiry';
  dressStyle: string | null;
  dressName: string | null;
  dressPrice: number | null;
  weddingDate: string | null;
  orderCode: string | null;
  email: string | null;
  phone: string | null;
  depositPaid: number | null;
  depositDate: string | null;
  nextPaymentDue: string | null;
  nextPaymentAmount: number | null;
  totalPaid: number | null;
  outstandingBalance: number | null;
  notes: string | null;
  group: string;
  columnValues: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Column Matching Patterns
// ---------------------------------------------------------------------------

/** Heuristic patterns for matching Monday.com column titles to bridal order fields */
const COLUMN_PATTERNS = {
  status: /\bstatus\b|\bstage\b/i,
  dress: /\bdress\b|\bstyle\b|\bdesign\b|\bgarment\b/i,
  dressName: /\bdress\s*name\b|\bgarment\s*name\b|\bdesign\s*name\b/i,
  price: /\bprice\b|\bamount\b|\bcost\b|\bvalue\b|\bdress\s*price\b/i,
  weddingDate: /\bwedding\b|\bevent\s*date\b|\bceremony\b/i,
  email: /\bemail\b|\be-?mail\b/i,
  phone: /\bphone\b|\bmobile\b|\btel\b|\bcell\b/i,
  deposit: /\bdeposit\b/i,
  depositDate: /\bdeposit\s*date\b|\bpaid\s*date\b/i,
  payment: /\bpayment\b|\bpaid\b|\btotal\s*paid\b/i,
  nextPayment: /\bnext\s*payment\b|\bbalance\s*due\b|\bdue\b/i,
  nextPaymentAmount: /\bnext\s*(?:payment\s*)?amount\b|\bbalance\s*amount\b/i,
  outstanding: /\boutstanding\b|\bbalance\b|\bremaining\b|\bowed\b/i,
  orderCode: /\border\b|\bref\b|\bcode\b|\bbr26\b|\border\s*code\b|\breference\b/i,
  notes: /\bnotes?\b|\bcomment\b|\bdescription\b|\bdetail\b/i,
} as const;

// ---------------------------------------------------------------------------
// Group → Status Mapping
// ---------------------------------------------------------------------------

const GROUP_STATUS_MAP: Record<string, MondayBridalOrder['status']> = {
  confirmed: 'confirmed',
  'in progress': 'confirmed',
  active: 'confirmed',
  'on hold': 'on_hold',
  'on-hold': 'on_hold',
  hold: 'on_hold',
  pending: 'on_hold',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  completed: 'completed',
  done: 'completed',
  delivered: 'completed',
  enquiry: 'enquiry',
  inquiry: 'enquiry',
  lead: 'enquiry',
  new: 'enquiry',
  prospect: 'enquiry',
};

function mapGroupToStatus(groupTitle: string): MondayBridalOrder['status'] {
  const normalised = groupTitle.toLowerCase().trim();
  return GROUP_STATUS_MAP[normalised] ?? 'enquiry';
}

// ---------------------------------------------------------------------------
// Column Value Extraction Helpers
// ---------------------------------------------------------------------------

/**
 * Find the first column value whose title matches a given pattern.
 * Returns the text value or null if no match is found.
 */
function findColumnText(
  columnValues: MondayColumnValue[],
  pattern: RegExp
): string | null {
  for (const cv of columnValues) {
    const title = cv.title ?? cv.id;
    if (pattern.test(title) && cv.text) {
      return cv.text;
    }
  }
  return null;
}

/**
 * Find and parse a numeric column value matching a given pattern.
 */
function findColumnNumber(
  columnValues: MondayColumnValue[],
  pattern: RegExp
): number | null {
  const text = findColumnText(columnValues, pattern);
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Find a date column value. Monday.com dates are typically in YYYY-MM-DD format.
 */
function findColumnDate(
  columnValues: MondayColumnValue[],
  pattern: RegExp
): string | null {
  const text = findColumnText(columnValues, pattern);
  if (!text) return null;
  // Monday.com date columns return YYYY-MM-DD or date strings
  // Try to normalise to ISO date
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) return dateMatch[0];
  // Try parsing as a general date
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return text;
}

/**
 * Extract status from column values, falling back to group-based status.
 */
function extractStatus(
  columnValues: MondayColumnValue[],
  groupTitle: string
): MondayBridalOrder['status'] {
  const statusText = findColumnText(columnValues, COLUMN_PATTERNS.status);
  if (statusText) {
    const normalised = statusText.toLowerCase().trim();
    if (GROUP_STATUS_MAP[normalised]) return GROUP_STATUS_MAP[normalised];
  }
  return mapGroupToStatus(groupTitle);
}

// ---------------------------------------------------------------------------
// Public: Map a single Monday.com item to a bridal order
// ---------------------------------------------------------------------------

/**
 * Map a Monday.com item to a MondayBridalOrder using heuristic column matching.
 *
 * The function inspects column titles using regex patterns to identify which
 * columns correspond to bridal order fields. When no column matches, the
 * field falls back to null.
 *
 * @param item - The Monday.com item (with normalised column_values)
 * @param _boardName - Name of the source board (unused, reserved for future context)
 */
export function mapMondayItemToBridalOrder(
  item: MondayItem,
  _boardName: string
): MondayBridalOrder {
  const cv = item.column_values ?? [];
  const groupTitle = item.group?.title ?? 'Ungrouped';

  // Build the raw column values map
  const columnValues: Record<string, string> = {};
  for (const col of cv) {
    const title = col.title ?? col.id;
    columnValues[title] = col.text ?? '';
  }

  // Determine dress style vs dress name
  // If a column matches the specific "dress name" pattern, use it for dressName
  // and a separate "dress/style" match for dressStyle.
  // If only one column matches the general "dress" pattern, use it for dressStyle.
  const dressNameText = findColumnText(cv, COLUMN_PATTERNS.dressName);
  const dressText = findColumnText(cv, COLUMN_PATTERNS.dress);

  return {
    mondayItemId: item.id,
    clientName: item.name,
    status: extractStatus(cv, groupTitle),
    dressStyle: dressNameText ? dressText : dressText,
    dressName: dressNameText ?? null,
    dressPrice: findColumnNumber(cv, COLUMN_PATTERNS.price),
    weddingDate: findColumnDate(cv, COLUMN_PATTERNS.weddingDate),
    orderCode: findColumnText(cv, COLUMN_PATTERNS.orderCode),
    email: findColumnText(cv, COLUMN_PATTERNS.email),
    phone: findColumnText(cv, COLUMN_PATTERNS.phone),
    depositPaid: findColumnNumber(cv, COLUMN_PATTERNS.deposit),
    depositDate: findColumnDate(cv, COLUMN_PATTERNS.depositDate),
    nextPaymentDue: findColumnDate(cv, COLUMN_PATTERNS.nextPayment),
    nextPaymentAmount: findColumnNumber(cv, COLUMN_PATTERNS.nextPaymentAmount),
    totalPaid: findColumnNumber(cv, COLUMN_PATTERNS.payment),
    outstandingBalance: findColumnNumber(cv, COLUMN_PATTERNS.outstanding),
    notes: findColumnText(cv, COLUMN_PATTERNS.notes),
    group: groupTitle,
    columnValues,
  };
}

// ---------------------------------------------------------------------------
// Public: Sync all items from a Monday.com board
// ---------------------------------------------------------------------------

/**
 * Fetch all items from a Monday.com board and map them to bridal orders.
 *
 * Handles pagination by following the cursor until all items are retrieved.
 *
 * @param apiKey - Monday.com API key
 * @param boardId - The board ID to sync from
 * @returns Array of mapped bridal orders
 */
export async function syncMondayOrders(
  apiKey: string,
  boardId: string
): Promise<MondayBridalOrder[]> {
  const allItems: MondayItem[] = [];
  let nextCursor: string | undefined;
  let isFirstPage = true;

  // Paginate through all board items
  do {
    const result = await fetchBoardItems(
      apiKey,
      boardId,
      isFirstPage ? undefined : nextCursor
    );
    allItems.push(...result.items);
    nextCursor = result.cursor ?? undefined;
    isFirstPage = false;
  } while (nextCursor);

  // Map all items to bridal orders
  return allItems.map((item) =>
    mapMondayItemToBridalOrder(item, `Board ${boardId}`)
  );
}
