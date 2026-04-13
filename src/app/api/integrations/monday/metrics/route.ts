import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  computeAllMetrics,
  type BridalOrder,
} from '@/lib/integrations/monday-metrics';

// ---------------------------------------------------------------------------
// GET /api/integrations/monday/metrics
//
// Fetches bridal_orders from Supabase (already-synced data — does NOT call
// the Monday.com API) and returns pre-computed deterministic metrics.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const supabase = await createUntypedServiceClient();

    // Fetch all bridal orders for this org from the local table
    const { data: rawOrders, error } = await supabase
      .from('bridal_orders')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MONDAY METRICS] Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bridal orders' },
        { status: 500 }
      );
    }

    // Cast rows to the BridalOrder shape the computation layer expects
    const orders: BridalOrder[] = ((rawOrders ?? []) as unknown as Record<string, unknown>[]).map(
      (row) => ({
        id: row.id as string,
        org_id: row.org_id as string,
        client_id: (row.client_id as string) ?? null,
        client_name: row.client_name as string,
        email: (row.email as string) ?? null,
        phone: (row.phone as string) ?? null,
        status: (row.status as BridalOrder['status']) ?? 'enquiry',
        dress_style: (row.dress_style as string) ?? null,
        dress_name: (row.dress_name as string) ?? null,
        dress_price: row.dress_price != null ? Number(row.dress_price) : null,
        actual_dress_choice: (row.actual_dress_choice as string) ?? null,
        wedding_date: (row.wedding_date as string) ?? null,
        event_type: (row.event_type as string) ?? null,
        order_date: (row.order_date as string) ?? null,
        fitting_date: (row.fitting_date as string) ?? null,
        completion_date: (row.completion_date as string) ?? null,
        notes: (row.notes as string) ?? null,
        tags: (row.tags as string[]) ?? [],
        monday_item_id: (row.monday_item_id as string) ?? null,
        monday_board_id: (row.monday_board_id as string) ?? null,
        order_code: (row.order_code as string) ?? null,
        total_paid: row.total_paid != null ? Number(row.total_paid) : null,
        outstanding_balance:
          row.outstanding_balance != null
            ? Number(row.outstanding_balance)
            : null,
        source: (row.source as BridalOrder['source']) ?? 'manual',
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      })
    );

    // Run all pure computation functions
    const metrics = computeAllMetrics(orders);

    return NextResponse.json(metrics);
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[MONDAY METRICS] Error:', err);
    return NextResponse.json(
      { error: 'Failed to compute metrics' },
      { status: 500 }
    );
  }
}
