import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  getMondayToken,
  getBoardItems,
  syncMondayBoard,
  parseBrideData,
  parseFinanceRequests,
} from '@/lib/integrations/monday';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/integrations/monday/sync
 * Sync a specific Monday.com board.
 * Body: { boardId: string, boardName?: string }
 *
 * Returns parsed data for known board types (confirmed clients, finance requests).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('advisor');
    const orgId = profile.org_id as string;

    const token = await getMondayToken(orgId);
    if (!token) {
      return NextResponse.json(
        { error: 'Monday.com not connected' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { boardId, boardName } = body;

    if (!boardId) {
      return NextResponse.json(
        { error: 'boardId is required' },
        { status: 400 }
      );
    }

    // Fetch board items
    const { board, items } = await getBoardItems(token, boardId);
    const name = boardName || board.name;

    // Stage into database
    const { synced } = await syncMondayBoard(orgId, token, boardId, name);

    // Parse data based on board type
    const nameLower = name.toLowerCase();
    let parsedData: unknown = null;

    if (
      nameLower.includes('confirmed') ||
      nameLower.includes('client') ||
      nameLower.includes('bride')
    ) {
      const brides = parseBrideData(items);
      parsedData = {
        type: 'confirmed_clients',
        count: brides.length,
        brides,
        summary: {
          totalBrides: brides.length,
          withDressPrice: brides.filter((b) => b.dressPrice !== null).length,
          averageDressPrice:
            brides.filter((b) => b.dressPrice !== null).length > 0
              ? brides
                  .filter((b) => b.dressPrice !== null)
                  .reduce((sum, b) => sum + (b.dressPrice ?? 0), 0) /
                brides.filter((b) => b.dressPrice !== null).length
              : null,
          statuses: Object.entries(
            brides.reduce(
              (acc, b) => {
                acc[b.status] = (acc[b.status] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            )
          ).map(([status, count]) => ({ status, count })),
        },
      };
    } else if (nameLower.includes('finance request')) {
      const requests = parseFinanceRequests(items);
      parsedData = {
        type: 'finance_requests',
        count: requests.length,
        requests,
        summary: {
          totalRequests: requests.length,
          totalAmount: requests.reduce(
            (sum, r) => sum + (r.amount ?? 0),
            0
          ),
          byGroup: Object.entries(
            requests.reduce(
              (acc, r) => {
                acc[r.group] = (acc[r.group] || 0) + (r.amount ?? 0);
                return acc;
              },
              {} as Record<string, number>
            )
          ).map(([group, amount]) => ({ group, amount })),
        },
      };
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'monday.board_synced',
      entityType: 'integration_connection',
      metadata: { boardId, boardName: name, itemsSynced: synced },
    });

    return NextResponse.json({
      success: true,
      synced,
      boardName: name,
      itemCount: items.length,
      parsedData,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[MONDAY SYNC] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
