import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logVaultAccess } from '@/lib/vault/storage';

type Params = { params: Promise<{ orgId: string; itemId: string }> };

/**
 * GET /api/vault/[orgId]/[itemId]/download — Get a signed download URL for a vault file
 *
 * Returns a temporary signed URL (valid for 1 hour) for downloading the file.
 * Only works for file_upload vault items.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId, itemId } = await params;
    const { user, profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createUntypedServiceClient();

    // Fetch the vault item to get storage path
    const { data: item, error: fetchError } = await supabase
      .from('vault_items')
      .select('id, item_type, current_version')
      .eq('id', itemId)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if ((item as Record<string, unknown>).item_type !== 'file_upload') {
      return NextResponse.json({ error: 'Item is not a file upload' }, { status: 400 });
    }

    // Get the latest version content which has the storage path
    const { data: version, error: versionError } = await supabase
      .from('vault_versions')
      .select('content')
      .eq('vault_item_id', itemId)
      .eq('version_number', (item as Record<string, unknown>).current_version)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const content = (version as Record<string, unknown>).content as Record<string, unknown>;
    const storagePath = content.storagePath as string;
    const storageBucket = (content.storageBucket as string) || 'vault-files';

    if (!storagePath) {
      return NextResponse.json({ error: 'No file path found' }, { status: 404 });
    }

    // Create a signed URL valid for 1 hour
    const { data: signedUrl, error: signError } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, 3600);

    if (signError || !signedUrl) {
      console.error('[vault-download] Failed to create signed URL:', signError?.message);
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }

    // Log access
    await logVaultAccess(
      orgId,
      user.id,
      itemId,
      'downloaded',
      (item as Record<string, unknown>).current_version as number,
      { fileName: content.fileName }
    );

    return NextResponse.json({
      url: signedUrl.signedUrl,
      fileName: content.fileName,
      mimeType: content.mimeType,
      fileSize: content.fileSize,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[vault-download] Error:', e);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
