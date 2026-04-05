import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const SwitchSchema = z.object({
  orgId: z.string().uuid('Invalid organisation ID'),
});

/**
 * POST /api/advisor/switch
 * Sets the advisor's active client org via a cookie.
 * Pass orgId = null/empty to clear (return to own org).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedUser();

    const role = profile.role as string;
    if (role !== 'advisor' && role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: 'Only advisors can switch client context' },
        { status: 403 },
      );
    }

    const body = await req.json();

    // Allow clearing the active org
    if (body.orgId === null || body.orgId === '' || body.orgId === undefined) {
      const cookieStore = await cookies();
      cookieStore.delete('advisor_active_org_id');

      await logAudit(
        {
          orgId: profile.org_id as string,
          userId: user.id,
          action: 'advisor.switch_clear',
          entityType: 'advisor_session',
          metadata: { cleared: true },
        },
        { critical: false },
      );

      return NextResponse.json({ success: true, activeOrgId: null });
    }

    const parsed = SwitchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { orgId } = parsed.data;

    // Validate that this advisor actually has access to the requested org
    const supabase = await createServiceClient();
    const { data: relationship, error } = await supabase
      .from('advisor_clients')
      .select('id, status')
      .eq('advisor_user_id', user.id)
      .eq('client_org_id', orgId)
      .eq('status', 'active')
      .single();

    if (error || !relationship) {
      return NextResponse.json(
        { error: 'You do not have access to this organisation' },
        { status: 403 },
      );
    }

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set('advisor_active_org_id', orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    await logAudit(
      {
        orgId: orgId,
        userId: user.id,
        action: 'advisor.switch_org',
        entityType: 'advisor_session',
        entityId: orgId,
        metadata: {
          advisor_org_id: profile.org_id,
          target_org_id: orgId,
        },
      },
      { critical: false },
    );

    return NextResponse.json({ success: true, activeOrgId: orgId });
  } catch (err) {
    console.error('[ADVISOR] Error in POST /api/advisor/switch:', err);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }
}
