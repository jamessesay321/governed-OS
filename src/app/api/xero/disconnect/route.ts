import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/xero/disconnect
 * Disconnects Xero integration. Requires admin+ role.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('admin');
    const supabase = await createServiceClient();

    const { error } = await supabase
      .from('xero_connections')
      .update({ status: 'disconnected' })
      .eq('org_id', profile.org_id)
      .eq('status', 'active');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      );
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'xero.disconnected',
      entityType: 'xero_connection',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
