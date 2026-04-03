import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { runFullSync } from '@/lib/xero/sync';
import { syncLimiter } from '@/lib/rate-limit';

// Allow up to 300s for full Xero sync (Pro plan)
export const maxDuration = 300;

/**
 * POST /api/xero/sync
 * Triggers a full Xero data sync. Requires advisor+ role.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('advisor');

    // Rate limit: 3 syncs per minute per org
    const limited = syncLimiter.check(profile.org_id);
    if (limited) return limited;

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[XERO SYNC] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
