/**
 * Monday.com API Client
 *
 * Interacts with Monday.com's GraphQL API (v2) to fetch boards,
 * items, updates, and search results. Maps board items to Grove
 * client/invoice format for ERP integration.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
}

export interface MondayColumnValue {
  id: string;
  title: string;
  type: string;
  text: string;
  value: string | null;
}

export interface MondayUpdate {
  id: string;
  body: string;
  created_at: string;
  creator: {
    id: string;
    name: string;
  };
}

export interface MondayItem {
  id: string;
  name: string;
  state: string;
  created_at: string;
  updated_at: string;
  group: {
    id: string;
    title: string;
  };
  column_values: MondayColumnValue[];
}

export interface MondayBoard {
  id: string;
  name: string;
  description: string | null;
  state: string;
  board_kind: string;
  columns: MondayColumn[];
  items_count: number;
}

export interface MondayBoardWithItems extends MondayBoard {
  items_page: {
    cursor: string | null;
    items: MondayItem[];
  };
}

/** Mapped Grove record from a Monday.com item */
export interface GroveMappedRecord {
  sourceId: string;
  sourceName: string;
  sourceBoard: string;
  group: string;
  status: string | null;
  date: string | null;
  amount: number | null;
  client: string | null;
  description: string | null;
  columnValues: Record<string, string>;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const MONDAY_API_URL = 'https://api.monday.com/v2';

/**
 * Execute a GraphQL query against the Monday.com API.
 */
async function mondayQuery<T = Record<string, unknown>>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`Monday.com API error (${res.status}): ${text}`);
  }

  const json = await res.json();

  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e: { message: string }) => e.message).join('; ');
    throw new Error(`Monday.com GraphQL error: ${msg}`);
  }

  return json.data as T;
}

// ---------------------------------------------------------------------------
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Fetch all boards for the authenticated account.
 */
export async function fetchBoards(
  apiKey: string
): Promise<MondayBoard[]> {
  const query = `
    query {
      boards(limit: 50) {
        id
        name
        description
        state
        board_kind
        items_count
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  const data = await mondayQuery<{ boards: MondayBoard[] }>(apiKey, query);
  return data.boards ?? [];
}

/**
 * Fetch items for a specific board (paginated, first 100).
 */
export async function fetchBoardItems(
  apiKey: string,
  boardId: string,
  cursor?: string
): Promise<{ items: MondayItem[]; cursor: string | null }> {
  const query = cursor
    ? `
      query ($cursor: String!) {
        next_items_page(limit: 100, cursor: $cursor) {
          cursor
          items {
            id
            name
            state
            created_at
            updated_at
            group {
              id
              title
            }
            column_values {
              id
              title
              type
              text
              value
            }
          }
        }
      }
    `
    : `
      query ($boardId: [ID!]!) {
        boards(ids: $boardId) {
          items_page(limit: 100) {
            cursor
            items {
              id
              name
              state
              created_at
              updated_at
              group {
                id
                title
              }
              column_values {
                id
                title
                type
                text
                value
              }
            }
          }
        }
      }
    `;

  if (cursor) {
    const data = await mondayQuery<{
      next_items_page: { cursor: string | null; items: MondayItem[] };
    }>(apiKey, query, { cursor });
    return {
      items: data.next_items_page?.items ?? [],
      cursor: data.next_items_page?.cursor ?? null,
    };
  }

  const data = await mondayQuery<{
    boards: Array<{
      items_page: { cursor: string | null; items: MondayItem[] };
    }>;
  }>(apiKey, query, { boardId: [boardId] });

  const board = data.boards?.[0];
  return {
    items: board?.items_page?.items ?? [],
    cursor: board?.items_page?.cursor ?? null,
  };
}

/**
 * Fetch updates (comments/activity) for a specific item.
 */
export async function fetchItemUpdates(
  apiKey: string,
  itemId: string
): Promise<MondayUpdate[]> {
  const query = `
    query ($itemId: [ID!]!) {
      items(ids: $itemId) {
        updates(limit: 25) {
          id
          body
          created_at
          creator {
            id
            name
          }
        }
      }
    }
  `;

  const data = await mondayQuery<{
    items: Array<{ updates: MondayUpdate[] }>;
  }>(apiKey, query, { itemId: [itemId] });

  return data.items?.[0]?.updates ?? [];
}

/**
 * Search items across all boards by keyword.
 */
export async function searchItems(
  apiKey: string,
  queryText: string
): Promise<MondayItem[]> {
  const query = `
    query ($queryText: String!) {
      items_page_by_column_values(
        limit: 50,
        board_id: 0,
        columns: [{ column_id: "name", column_values: [$queryText] }]
      ) {
        items {
          id
          name
          state
          created_at
          updated_at
          group {
            id
            title
          }
          column_values {
            id
            title
            type
            text
            value
          }
        }
      }
    }
  `;

  // Note: board_id: 0 searches all boards, but this endpoint requires
  // a specific board. As a fallback, use a simpler text search approach.
  // Monday.com v2 does not have a universal text search, so we use
  // a boards + items query with filtering client-side.

  const boards = await fetchBoards(apiKey);
  const allItems: MondayItem[] = [];
  const lowerQuery = queryText.toLowerCase();

  // Search across first 10 boards for performance
  for (const board of boards.slice(0, 10)) {
    const { items } = await fetchBoardItems(apiKey, board.id);
    const matching = items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.column_values.some((cv) =>
          cv.text?.toLowerCase().includes(lowerQuery)
        )
    );
    allItems.push(...matching);
  }

  return allItems;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/**
 * Map a Monday.com item to a Grove-compatible record.
 * Attempts to extract common fields like status, date, amount, and client
 * from column values based on column type.
 */
export function mapItemToGroveRecord(
  item: MondayItem,
  boardName: string
): GroveMappedRecord {
  let status: string | null = null;
  let date: string | null = null;
  let amount: number | null = null;
  let client: string | null = null;
  let description: string | null = null;
  const columnValues: Record<string, string> = {};

  for (const cv of item.column_values) {
    columnValues[cv.title] = cv.text ?? '';

    // Heuristic mapping based on column type
    switch (cv.type) {
      case 'color': // Status column
        if (!status && cv.text) status = cv.text;
        break;
      case 'date':
        if (!date && cv.text) date = cv.text;
        break;
      case 'numeric':
        if (amount === null && cv.text) {
          const parsed = parseFloat(cv.text.replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsed)) amount = parsed;
        }
        break;
      case 'text':
        // Try to identify client/description columns by title
        if (!client && /client|customer|company/i.test(cv.title) && cv.text) {
          client = cv.text;
        } else if (!description && /desc|note|detail/i.test(cv.title) && cv.text) {
          description = cv.text;
        }
        break;
      case 'long_text':
        if (!description && cv.text) description = cv.text;
        break;
    }
  }

  return {
    sourceId: item.id,
    sourceName: item.name,
    sourceBoard: boardName,
    group: item.group?.title ?? 'Ungrouped',
    status,
    date,
    amount,
    client,
    description,
    columnValues,
    updatedAt: item.updated_at,
  };
}
