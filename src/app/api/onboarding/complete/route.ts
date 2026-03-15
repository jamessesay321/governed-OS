import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/onboarding/complete
 * Marks the organisation's onboarding as completed.
 */
export async function POST() {
  try {
    const { user, profile } = await requireRole('admin');
    const supabase = await createServiceClient();

    const { error } = await supabase
      .from('organisations')
      .update({ has_completed_onboarding: true } as any)
      .eq('id', profile.org_id);

    if (error) {
      console.error('[ONBOARDING] Failed to mark complete:', error);
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 }
      );
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'onboarding.completed',
      entityType: 'organisation',
      entityId: profile.org_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
