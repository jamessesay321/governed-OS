import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { runQboFullSync } from '@/lib/quickbooks/sync';

/**
 * POST /api/quickbooks/sync
 * Triggers a full QuickBooks sync. Requires advisor+ role.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('advisor');
    const result = await runQboFullSync(profile.org_id, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recordsSynced: result.recordsSynced,
    });
  } catch (err) {
    console.error('[QBO SYNC] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
