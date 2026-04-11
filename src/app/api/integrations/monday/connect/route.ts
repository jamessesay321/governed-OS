import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { upsertConnection } from '@/lib/integrations/framework';
import { listBoards } from '@/lib/integrations/monday';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/integrations/monday/connect
 * Connect Monday.com using an API token.
 * Body: { apiToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const { apiToken } = body;

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    // Validate token by fetching boards
    let boards;
    try {
      boards = await listBoards(apiToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid API token or Monday.com API error' },
        { status: 401 }
      );
    }

    // Store connection
    await upsertConnection(orgId, 'monday', {
      status: 'active',
      credentials: { apiToken },
      syncFrequency: 'daily',
      config: {
        boardCount: boards.length,
        boardNames: boards.map((b) => b.name),
      },
    });

    await logAudit({
      orgId,
      userId: user.id,
      action: 'monday.connected',
      entityType: 'integration_connection',
      metadata: { boardCount: boards.length },
    });

    return NextResponse.json({
      success: true,
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        items_count: b.items_count,
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[MONDAY CONNECT] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
