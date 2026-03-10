import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { runFullSync } from '@/lib/xero/sync';

/**
 * POST /api/xero/sync
 * Triggers a full Xero data sync. Requires advisor+ role.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('advisor');

    const result = await runFullSync(profile.org_id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, recordsSynced: result.recordsSynced },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recordsSynced: result.recordsSynced,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('[XERO SYNC] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
