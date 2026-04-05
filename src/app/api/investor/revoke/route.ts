import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const RevokeSchema = z.object({
  investorOrgId: z.string().uuid('Valid investor org ID required'),
  orgId: z.string().uuid('Valid org ID required'),
});

/**
 * POST /api/investor/revoke
 * Revoke an investor's access to an organisation.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RevokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { investorOrgId, orgId } = parsed.data;

    // Verify caller is owner/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== orgId || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = await createServiceClient();

    const { error: deleteError } = await serviceClient
      .from('investor_organisations')
      .delete()
      .eq('id', investorOrgId)
      .eq('org_id', orgId);

    if (deleteError) {
      console.error('[investor-revoke] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'investor_access_revoked',
      entityType: 'investor_organisations',
      entityId: investorOrgId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[investor-revoke] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
