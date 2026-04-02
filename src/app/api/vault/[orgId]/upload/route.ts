import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { storeVaultItem } from '@/lib/vault/storage';
import { logAudit } from '@/lib/audit/log';
import { randomUUID } from 'crypto';

type Params = { params: Promise<{ orgId: string }> };

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/**
 * POST /api/vault/[orgId]/upload — Upload a file to the Knowledge Vault
 *
 * Accepts multipart/form-data with:
 *   - file: the file to upload
 *   - title: (optional) display title, defaults to filename
 *   - description: (optional) file description
 *   - tags: (optional) comma-separated tags
 *   - visibility: (optional) org | owner_only | advisor_only
 *
 * Stores the file in Supabase Storage under vault-files/{orgId}/{itemId}/{filename}
 * and creates a vault_item record with file metadata in the content JSONB.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('advisor');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 50 MB.` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}. Supported: PDF, Excel, Word, PowerPoint, CSV, text, PNG, JPEG, WebP.` },
        { status: 400 }
      );
    }

    // Read optional metadata from form
    const title = (formData.get('title') as string) || file.name;
    const description = (formData.get('description') as string) || '';
    const tagsRaw = (formData.get('tags') as string) || '';
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20) : [];
    const visibility = (formData.get('visibility') as string) || 'org';

    if (!['org', 'owner_only', 'advisor_only'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    // Generate a unique item ID upfront so we can use it in the storage path
    const itemId = randomUUID();

    // Sanitise filename: keep only alphanumeric, dots, hyphens, underscores
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storagePath = `${orgId}/${itemId}/${safeName}`;

    // Upload to Supabase Storage
    const supabase = await createUntypedServiceClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('vault-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[vault-upload] Storage upload failed:', uploadError.message);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Create vault item with file metadata in content
    const result = await storeVaultItem({
      orgId,
      userId: user.id,
      itemType: 'file_upload',
      title: title.slice(0, 200),
      description: description.slice(0, 1000),
      tags,
      content: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storagePath,
        storageBucket: 'vault-files',
      },
      provenance: {
        source_entity_type: 'file_upload',
        data_freshness_at: new Date().toISOString(),
      },
      visibility: visibility as 'org' | 'owner_only' | 'advisor_only',
      status: 'final',
    });

    await logAudit({
      orgId,
      userId: user.id,
      action: 'vault.file_uploaded',
      entityType: 'vault_item',
      entityId: result.item.id,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json(
      {
        item: result.item,
        version: result.version,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[vault-upload] Error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
