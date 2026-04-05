import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { fetchBoards, fetchBoardItems } from '@/lib/integrations/monday';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMondayApiKey(orgId: string): Promise<string | null> {
  const supabase = await createUntypedServiceClient();
  const { data: connection } = await supabase
    .from('integration_connections')
    .select('credentials')
    .eq('org_id', orgId)
    .eq('integration_id', 'monday')
    .eq('status', 'active')
    .maybeSingle();

  const storedKey = (connection?.credentials as Record<string, unknown>)?.api_key as string | undefined;
  if (storedKey) return storedKey;

  return process.env.MONDAY_API_KEY || null;
}

// ---------------------------------------------------------------------------
// GET /api/integrations/monday/boards/[boardId] — Board items with columns
// ---------------------------------------------------------------------------

type RouteParams = { params: Promise<{ boardId: string }> };

export async function GET(
  _request: Request,
  context: RouteParams
) {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;
    const { boardId } = await context.params;

    const apiKey = await getMondayApiKey(orgId);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Monday.com API key not configured', configured: false },
        { status: 400 }
      );
    }

    // Fetch board metadata for columns
    const boards = await fetchBoards(apiKey);
    const board = boards.find((b) => b.id === boardId);

    if (!board) {
      return NextResponse.json(
        { error: `Board ${boardId} not found` },
        { status: 404 }
      );
    }

    // Fetch items
    const { items, cursor } = await fetchBoardItems(apiKey, boardId);

    return NextResponse.json({
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        columns: board.columns,
        items_count: board.items_count,
      },
      items,
      hasMore: !!cursor,
      cursor,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[MONDAY] Board items error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch board items' },
      { status: 500 }
    );
  }
}
