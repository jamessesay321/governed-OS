import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { fetchBoards } from '@/lib/integrations/monday';
import { syncMondayOrders, type MondayBridalOrder } from '@/lib/integrations/monday-orders';

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

/**
 * Upsert a Monday bridal order into the bridal_orders table.
 * Matches on (org_id, monday_item_id) when the item has a Monday ID,
 * otherwise falls back to matching on (org_id, client_name).
 */
async function upsertBridalOrder(
  supabase: Awaited<ReturnType<typeof createUntypedServiceClient>>,
  orgId: string,
  order: MondayBridalOrder,
  boardId: string
): Promise<{ action: 'created' | 'updated'; id: string }> {
  // Check if order already exists by monday_item_id
  const { data: existing } = await supabase
    .from('bridal_orders')
    .select('id')
    .eq('org_id', orgId)
    .eq('monday_item_id', order.mondayItemId)
    .maybeSingle();

  const row = {
    org_id: orgId,
    client_name: order.clientName,
    status: order.status,
    dress_style: order.dressStyle,
    dress_name: order.dressName,
    dress_price: order.dressPrice,
    wedding_date: order.weddingDate,
    email: order.email,
    phone: order.phone,
    notes: order.notes,
    monday_item_id: order.mondayItemId,
    monday_board_id: boardId,
    order_code: order.orderCode,
    total_paid: order.totalPaid ?? 0,
    outstanding_balance: order.outstandingBalance ?? 0,
    source: 'monday' as const,
  };

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('bridal_orders')
      .update(row)
      .eq('id', existing.id);

    if (error) throw new Error(`Failed to update order ${existing.id}: ${error.message}`);
    return { action: 'updated', id: existing.id as string };
  }

  // Also check by client_name fallback (in case monday_item_id was not set before)
  const { data: existingByName } = await supabase
    .from('bridal_orders')
    .select('id')
    .eq('org_id', orgId)
    .eq('client_name', order.clientName)
    .is('monday_item_id', null)
    .maybeSingle();

  if (existingByName) {
    const { error } = await supabase
      .from('bridal_orders')
      .update(row)
      .eq('id', existingByName.id);

    if (error) throw new Error(`Failed to update order ${existingByName.id}: ${error.message}`);
    return { action: 'updated', id: existingByName.id as string };
  }

  // Insert new record
  const { data: inserted, error: insertError } = await supabase
    .from('bridal_orders')
    .insert(row)
    .select('id')
    .single();

  if (insertError) throw new Error(`Failed to insert order: ${insertError.message}`);
  return { action: 'created', id: (inserted as Record<string, unknown>).id as string };
}

// ---------------------------------------------------------------------------
// POST /api/orders/sync-monday — Sync bridal orders from Monday.com
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole('admin');
    const orgId = profile.org_id as string;
    const userId = profile.id as string;

    // Validate input
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { boardId } = parsed.data;

    // Get Monday.com API key
    const apiKey = await getMondayApiKey(orgId);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Monday.com API key not configured. Connect Monday.com in Settings > Integrations.' },
        { status: 400 }
      );
    }

    // Get board name for logging
    const boards = await fetchBoards(apiKey);
    const board = boards.find((b) => b.id === boardId);
    const boardName = board?.name ?? `Board ${boardId}`;

    // Sync orders from Monday.com
    const mondayOrders = await syncMondayOrders(apiKey, boardId);

    if (mondayOrders.length === 0) {
      return NextResponse.json({
        success: true,
        boardName,
        created: 0,
        updated: 0,
        total: 0,
        message: 'No items found on this board.',
      });
    }

    // Upsert each order into bridal_orders
    const supabase = await createUntypedServiceClient();
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const order of mondayOrders) {
      try {
        const result = await upsertBridalOrder(supabase, orgId, order, boardId);
        if (result.action === 'created') created++;
        else updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${order.clientName}: ${msg}`);
      }
    }

    // Audit log (non-critical — sync succeeded even if audit fails)
    await logAudit(
      {
        orgId,
        userId,
        action: 'monday_orders_sync',
        entityType: 'bridal_orders',
        metadata: {
          boardId,
          boardName,
          totalItems: mondayOrders.length,
          created,
          updated,
          errors: errors.length,
        },
      },
      { critical: false }
    );

    return NextResponse.json({
      success: true,
      boardName,
      created,
      updated,
      total: mondayOrders.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: `Synced ${created + updated} orders from "${boardName}" (${created} new, ${updated} updated).`,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[SYNC-MONDAY] Error:', err);
    return NextResponse.json(
      { error: 'Failed to sync orders from Monday.com' },
      { status: 500 }
    );
  }
}
