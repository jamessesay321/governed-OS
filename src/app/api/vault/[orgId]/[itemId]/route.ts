import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getVaultItem, archiveVaultItem, logVaultAccess } from '@/lib/vault/storage';

type Params = { params: Promise<{ orgId: string; itemId: string }> };

/**
 * GET /api/vault/[orgId]/[itemId] — Get vault item with latest version (viewer+)
 * Logs an access event for governance.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId, itemId } = await params;
    const { user, profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await getVaultItem(orgId, itemId);
    if (!result) {
      return NextResponse.json({ error: 'Vault item not found' }, { status: 404 });
    }

    // Log access for governance trail
    await logVaultAccess(orgId, user.id, itemId, 'viewed', result.item.current_version);

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[vault] GET item error:', e);
    return NextResponse.json({ error: 'Failed to retrieve vault item' }, { status: 500 });
  }
}

/**
 * DELETE /api/vault/[orgId]/[itemId] — Archive a vault item (advisor+)
 * Items are never truly deleted — only archived.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, itemId } = await params;
    const { user, profile } = await requireRole('advisor');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = await archiveVaultItem(orgId, user.id, itemId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to archive vault item' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Item archived', itemId });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[vault] DELETE error:', e);
    return NextResponse.json({ error: 'Failed to archive vault item' }, { status: 500 });
  }
}
