import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getMondayToken, listBoards, getBoardItems } from '@/lib/integrations/monday';

/**
 * GET /api/integrations/monday/boards
 * List all Monday.com boards.
 */
export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const token = await getMondayToken(orgId);
    if (!token) {
      return NextResponse.json(
        { error: 'Monday.com not connected' },
        { status: 404 }
      );
    }

    const boards = await listBoards(token);

    return NextResponse.json({
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        items_count: b.items_count,
        columns: b.columns.map((c) => ({
          id: c.id,
          title: c.title,
          type: c.type,
        })),
        groups: b.groups.map((g) => ({
          id: g.id,
          title: g.title,
        })),
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[MONDAY BOARDS] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
