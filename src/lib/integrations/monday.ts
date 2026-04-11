/**
 * Monday.com Integration
 *
 * GraphQL API client for reading boards, items, and column values.
 * Uses API token authentication (Personal or OAuth).
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { updateLastSync } from './framework';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MondayBoard {
  id: string;
  name: string;
  description: string | null;
  state: string;
  board_kind: string;
  columns: MondayColumn[];
  groups: MondayGroup[];
  items_count: number;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str: string;
}

export interface MondayGroup {
  id: string;
  title: string;
  color: string;
}

export interface MondayItem {
  id: string;
  name: string;
  state: string;
  group: { id: string; title: string };
  column_values: MondayColumnValue[];
  created_at: string;
  updated_at: string;
}

export interface MondayColumnValue {
  id: string;
  title: string;
  type: string;
  text: string;
  value: string | null;
}

export interface MondayBrideSummary {
  name: string;
  status: string;
  dressPrice: number | null;
  depositPaid: number | null;
  balanceOwed: number | null;
  weddingDate: string | null;
  consultationDate: string | null;
  dressType: string | null;
  notes: string | null;
  itemId: string;
  rawColumns: Record<string, string>;
}

// ---------------------------------------------------------------------------
// GraphQL Client
// ---------------------------------------------------------------------------

const MONDAY_API_URL = 'https://api.monday.com/v2';

async function mondayQuery<T>(
  apiToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Monday.com API error: ${response.status} ${text}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(
      `Monday.com GraphQL error: ${json.errors.map((e: { message: string }) => e.message).join(', ')}`
    );
  }

  return json.data as T;
}

// ---------------------------------------------------------------------------
// Credential Management
// ---------------------------------------------------------------------------

export async function getMondayToken(orgId: string): Promise<string | null> {
  const supabase = await createUntypedServiceClient();
  const { data } = await supabase
    .from('integration_connections')
    .select('credentials')
    .eq('org_id', orgId)
    .eq('integration_id', 'monday')
    .eq('status', 'active')
    .single();

  if (!data) return null;
  const creds = data.credentials as { apiToken?: string };
  return creds.apiToken ?? null;
}

// ---------------------------------------------------------------------------
// Board Operations
// ---------------------------------------------------------------------------

/**
 * List all boards accessible to the token.
 */
export async function listBoards(apiToken: string): Promise<MondayBoard[]> {
  const data = await mondayQuery<{ boards: MondayBoard[] }>(
    apiToken,
    `query {
      boards(limit: 100) {
        id
        name
        description
        state
        board_kind
        items_count
        columns { id title type settings_str }
        groups { id title color }
      }
    }`
  );
  return data.boards;
}

/**
 * Get items from a specific board with all column values.
 */
export async function getBoardItems(
  apiToken: string,
  boardId: string,
  limit = 500
): Promise<{ board: MondayBoard; items: MondayItem[] }> {
  const data = await mondayQuery<{
    boards: Array<
      MondayBoard & { items_page: { items: MondayItem[] } }
    >;
  }>(
    apiToken,
    `query ($boardId: [ID!]!, $limit: Int!) {
      boards(ids: $boardId) {
        id
        name
        description
        state
        board_kind
        items_count
        columns { id title type settings_str }
        groups { id title color }
        items_page(limit: $limit) {
          items {
            id
            name
            state
            group { id title }
            column_values { id title type text value }
            created_at
            updated_at
          }
        }
      }
    }`,
    { boardId: [boardId], limit }
  );

  const board = data.boards[0];
  return {
    board,
    items: board.items_page.items,
  };
}

/**
 * Search boards by name (case-insensitive partial match).
 */
export async function findBoard(
  apiToken: string,
  nameQuery: string
): Promise<MondayBoard | null> {
  const boards = await listBoards(apiToken);
  const lower = nameQuery.toLowerCase();
  return (
    boards.find((b) => b.name.toLowerCase().includes(lower)) ?? null
  );
}

// ---------------------------------------------------------------------------
// Bride / Client Data Extraction
// ---------------------------------------------------------------------------

/**
 * Parse items from a "confirmed clients" board into bride summaries.
 * Attempts to auto-detect column meanings by title keywords.
 */
export function parseBrideData(items: MondayItem[]): MondayBrideSummary[] {
  return items.map((item) => {
    const cols: Record<string, string> = {};
    let status = '';
    let dressPrice: number | null = null;
    let depositPaid: number | null = null;
    let balanceOwed: number | null = null;
    let weddingDate: string | null = null;
    let consultationDate: string | null = null;
    let dressType: string | null = null;
    let notes: string | null = null;

    for (const cv of item.column_values) {
      const titleLower = cv.title.toLowerCase();
      const text = cv.text?.trim() || '';
      cols[cv.title] = text;

      // Auto-detect column meanings
      if (titleLower.includes('status') && !status) {
        status = text;
      }
      if (
        titleLower.includes('price') ||
        titleLower.includes('total') ||
        titleLower.includes('amount') ||
        titleLower.includes('cost')
      ) {
        const num = parseFloat(text.replace(/[£$,]/g, ''));
        if (!isNaN(num)) {
          if (titleLower.includes('deposit')) depositPaid = num;
          else if (titleLower.includes('balance') || titleLower.includes('owed'))
            balanceOwed = num;
          else dressPrice = num;
        }
      }
      if (titleLower.includes('wedding') && titleLower.includes('date')) {
        weddingDate = text || null;
      }
      if (
        titleLower.includes('consultation') ||
        titleLower.includes('appointment')
      ) {
        consultationDate = text || null;
      }
      if (
        titleLower.includes('dress') &&
        (titleLower.includes('type') || titleLower.includes('style'))
      ) {
        dressType = text || null;
      }
      if (titleLower.includes('note')) {
        notes = text || null;
      }
    }

    return {
      name: item.name,
      status: status || item.group.title,
      dressPrice,
      depositPaid,
      balanceOwed,
      weddingDate,
      consultationDate,
      dressType,
      notes,
      itemId: item.id,
      rawColumns: cols,
    };
  });
}

// ---------------------------------------------------------------------------
// Finance Request Extraction
// ---------------------------------------------------------------------------

export interface MondayFinanceRequest {
  name: string;
  amount: number | null;
  category: string | null;
  status: string;
  requestDate: string | null;
  approvedBy: string | null;
  supplier: string | null;
  description: string | null;
  itemId: string;
  group: string;
  rawColumns: Record<string, string>;
}

/**
 * Parse items from a finance request board.
 */
export function parseFinanceRequests(
  items: MondayItem[]
): MondayFinanceRequest[] {
  return items.map((item) => {
    const cols: Record<string, string> = {};
    let amount: number | null = null;
    let category: string | null = null;
    let status = '';
    let requestDate: string | null = null;
    let approvedBy: string | null = null;
    let supplier: string | null = null;
    let description: string | null = null;

    for (const cv of item.column_values) {
      const titleLower = cv.title.toLowerCase();
      const text = cv.text?.trim() || '';
      cols[cv.title] = text;

      if (
        titleLower.includes('amount') ||
        titleLower.includes('cost') ||
        titleLower.includes('price') ||
        titleLower.includes('budget')
      ) {
        const num = parseFloat(text.replace(/[£$,]/g, ''));
        if (!isNaN(num)) amount = num;
      }
      if (titleLower.includes('category') || titleLower.includes('type')) {
        category = text || null;
      }
      if (titleLower.includes('status')) {
        status = text;
      }
      if (titleLower.includes('date')) {
        requestDate = text || null;
      }
      if (titleLower.includes('approved') || titleLower.includes('approver')) {
        approvedBy = text || null;
      }
      if (
        titleLower.includes('supplier') ||
        titleLower.includes('vendor') ||
        titleLower.includes('payee')
      ) {
        supplier = text || null;
      }
      if (
        titleLower.includes('description') ||
        titleLower.includes('detail') ||
        titleLower.includes('note')
      ) {
        description = text || null;
      }
    }

    return {
      name: item.name,
      amount,
      category,
      status: status || item.group.title,
      requestDate,
      approvedBy,
      supplier,
      description,
      itemId: item.id,
      group: item.group.title,
      rawColumns: cols,
    };
  });
}

// ---------------------------------------------------------------------------
// Sync & Staging
// ---------------------------------------------------------------------------

/**
 * Sync a Monday.com board's items into staged_transactions.
 */
export async function syncMondayBoard(
  orgId: string,
  apiToken: string,
  boardId: string,
  boardName: string
): Promise<{ synced: number }> {
  console.log(
    `[MONDAY] Syncing board "${boardName}" (${boardId}) for org ${orgId}`
  );

  const { items } = await getBoardItems(apiToken, boardId);
  const supabase = await createUntypedServiceClient();

  const rows = items.map((item) => ({
    org_id: orgId,
    source: 'monday',
    source_id: `monday_item_${boardId}_${item.id}`,
    status: 'pending',
    raw_data: {
      board_id: boardId,
      board_name: boardName,
      item_id: item.id,
      name: item.name,
      group: item.group,
      column_values: item.column_values.map((cv) => ({
        id: cv.id,
        title: cv.title,
        type: cv.type,
        text: cv.text,
      })),
      created_at: item.created_at,
      updated_at: item.updated_at,
    },
    confidence_score: 0,
  }));

  // Upsert in batches
  const batchSize = 50;
  let total = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('staged_transactions')
      .upsert(batch, { onConflict: 'org_id,source,source_id' });

    if (error) {
      console.warn(
        `[MONDAY] Batch insert error: ${error.message}`
      );
    } else {
      total += batch.length;
    }
  }

  await updateLastSync(orgId, 'monday');
  console.log(`[MONDAY] Synced ${total} items from "${boardName}"`);
  return { synced: total };
}

// ---------------------------------------------------------------------------
// Compatibility Aliases (used by older API routes)
// ---------------------------------------------------------------------------

/** Alias for listBoards — used by legacy API routes */
export const fetchBoards = listBoards;

/**
 * Cursor-compatible board items fetch.
 * Legacy routes expect { items, cursor } return shape.
 */
export async function fetchBoardItems(
  apiToken: string,
  boardId: string,
  _cursor?: string
): Promise<{ items: MondayItem[]; cursor: string | null }> {
  const { items } = await getBoardItems(apiToken, boardId);
  return { items, cursor: null };
}

/**
 * Map a Monday.com item to a generic Grove record.
 * Used by the legacy sync route.
 */
export function mapItemToGroveRecord(
  item: MondayItem,
  boardName: string
): Record<string, unknown> {
  const cols: Record<string, string> = {};
  for (const cv of item.column_values) {
    cols[cv.title] = cv.text ?? '';
  }
  return {
    sourceId: `monday_${item.id}`,
    source: 'monday',
    boardName,
    name: item.name,
    group: item.group?.title ?? 'Ungrouped',
    status: item.state,
    columns: cols,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}
