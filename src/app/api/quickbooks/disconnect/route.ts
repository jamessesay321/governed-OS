import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/quickbooks/disconnect
 * Disconnects QuickBooks. Requires admin+ role. Data is preserved.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('admin');
    const supabase = await createServiceClient();

    await supabase
      .from('quickbooks_connections' as any)
      .update({ status: 'disconnected' })
      .eq('org_id', profile.org_id);

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'quickbooks.disconnected',
      entityType: 'quickbooks_connections',
      entityId: profile.org_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[QBO DISCONNECT] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Disconnect failed' },
      { status: 500 }
    );
  }
}
