import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { fetchBoards, fetchBoardItems, mapItemToGroveRecord } from '@/lib/integrations/monday';
import { updateLastSync } from '@/lib/integrations/framework';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const syncSchema = z.object({
  boardId: z.string().min(1, 'boardId is required'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMondayApiKey(orgId: string): Promise<string | null> {
  // First check org-level stored key from integration_connections
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

  // Fallback to env var
  return process.env.MONDAY_API_KEY || null;
}

// ---------------------------------------------------------------------------
// GET /api/integrations/monday — List boards
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const apiKey = await getMondayApiKey(orgId);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Monday.com API key not configured', configured: false },
        { status: 400 }
      );
    }

    const boards = await fetchBoards(apiKey);

    // Fetch last sync info
    const supabase = await createUntypedServiceClient();
    const { data: lastSync } = await supabase
      .from('integration_syncs')
      .select('*')
      .eq('org_id', orgId)
      .eq('integration_id', 'monday')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      configured: true,
      boards,
      lastSync: lastSync ?? null,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[MONDAY] GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Monday.com boards' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/integrations/monday — Sync a board
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { boardId } = parsed.data;

    const apiKey = await getMondayApiKey(orgId);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Monday.com API key not configured' },
        { status: 400 }
      );
    }

    // Fetch items from the board
    const boards = await fetchBoards(apiKey);
    const board = boards.find((b) => b.id === boardId);
    const boardName = board?.name ?? `Board ${boardId}`;

    const { items } = await fetchBoardItems(apiKey, boardId);

    // Map items to Grove format
    const mappedRecords = items.map((item) =>
      mapItemToGroveRecord(item, boardName)
    );

    // Store sync result
    const supabase = await createUntypedServiceClient();
    const { error: syncError } = await supabase
      .from('integration_syncs')
      .upsert(
        {
          org_id: orgId,
          integration_id: 'monday',
          source_id: boardId,
          source_name: boardName,
          records_synced: mappedRecords.length,
          synced_data: mappedRecords,
          synced_at: new Date().toISOString(),
          status: 'completed',
        },
        { onConflict: 'org_id,integration_id,source_id' }
      );

    if (syncError) {
      console.error('[MONDAY] Sync storage error:', syncError.message);
      // Non-fatal: still return the data even if storage fails
    }

    // Update the integration connection last sync time
    await updateLastSync(orgId, 'monday').catch(() => {
      // Non-fatal
    });

    return NextResponse.json({
      success: true,
      boardName,
      recordsSynced: mappedRecords.length,
      records: mappedRecords,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[MONDAY] POST error:', err);
    return NextResponse.json(
      { error: 'Failed to sync Monday.com board' },
      { status: 500 }
    );
  }
}
