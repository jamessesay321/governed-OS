import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getVersionHistory, createNewVersion } from '@/lib/vault/storage';
import { z } from 'zod';

type Params = { params: Promise<{ orgId: string; itemId: string }> };

const newVersionSchema = z.object({
  content: z.record(z.string(), z.unknown()),
  provenance: z.record(z.string(), z.unknown()).default({}),
  changeSummary: z.string().min(1).max(500),
});

/**
 * GET /api/vault/[orgId]/[itemId]/versions — Get version history (viewer+)
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId, itemId } = await params;
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const versions = await getVersionHistory(orgId, itemId);

    return NextResponse.json({ versions, total: versions.length });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[vault/versions] GET error:', e);
    return NextResponse.json({ error: 'Failed to retrieve version history' }, { status: 500 });
  }
}

/**
 * POST /api/vault/[orgId]/[itemId]/versions — Create new version (advisor+)
 * Original version is preserved (immutable). New version is appended.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, itemId } = await params;
    const { user, profile } = await requireRole('advisor');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = newVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const version = await createNewVersion({
      orgId,
      userId: user.id,
      vaultItemId: itemId,
      content: parsed.data.content,
      provenance: parsed.data.provenance,
      changeSummary: parsed.data.changeSummary,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[vault/versions] POST error:', e);
    return NextResponse.json({ error: 'Failed to create new version' }, { status: 500 });
  }
}
