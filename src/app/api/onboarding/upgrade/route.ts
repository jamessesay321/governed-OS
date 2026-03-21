import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/onboarding/upgrade
 * Switches an org from demo mode to full setup mode.
 * Resets onboarding so the user goes through the real flow.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('admin');
    const supabase = await createServiceClient();

    // Reset org: clear demo mode, re-open onboarding
    const { error } = await supabase
      .from('organisations')
      .update({
        onboarding_mode: 'full',
        has_completed_onboarding: false,
      } as any)
      .eq('id', profile.org_id);

    if (error) {
      console.error('[UPGRADE] Failed to update org:', error);
      return NextResponse.json(
        { error: 'Failed to switch to full setup' },
        { status: 500 }
      );
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'onboarding.upgrade_from_demo',
      entityType: 'organisation',
      entityId: profile.org_id,
      metadata: { previousMode: 'demo' },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[UPGRADE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
