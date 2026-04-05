import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/roles';
import { getClientAnalytics } from '@/lib/clients/identity-resolver';

const ParamsSchema = z.object({
  orgId: z.string().uuid(),
});

/**
 * GET /api/clients/analytics/[orgId]
 * Returns client analytics including cross-year tracking and revenue splits.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const resolvedParams = await params;
    const parsed = ParamsSchema.safeParse(resolvedParams);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid org ID' }, { status: 400 });
    }
    const { orgId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await requireRole('viewer');

    const analytics = await getClientAnalytics(orgId);
    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[clients/analytics] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
