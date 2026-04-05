import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/roles';
import { resolveClients } from '@/lib/clients/identity-resolver';
import { logAudit } from '@/lib/audit/log';

const ParamsSchema = z.object({
  orgId: z.string().uuid(),
});

/**
 * POST /api/clients/resolve/[orgId]
 * Triggers client identity resolution from raw_transactions.
 * Builds/updates the clients table with deduplicated contact records.
 */
export async function POST(
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

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await requireRole('viewer');

    // Run resolution
    const result = await resolveClients(orgId);

    await logAudit(
      {
        orgId,
        userId: user.id,
        action: 'clients.resolved',
        entityType: 'client',
        changes: result as unknown as Record<string, unknown>,
      },
      { critical: false },
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[clients/resolve] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
