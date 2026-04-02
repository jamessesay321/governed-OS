import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { listVaultItems, storeVaultItem } from '@/lib/vault/storage';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import type { VaultItemType, VaultItemStatus, VaultVisibility } from '@/lib/vault/storage';

type Params = { params: Promise<{ orgId: string }> };

const VALID_TYPES = [
  'board_pack', 'scenario_output', 'kpi_snapshot', 'variance_analysis',
  'narrative', 'anomaly_report', 'interview_transcript',
  'playbook_assessment', 'custom_report', 'ai_analysis', 'file_upload',
] as const;

const storeSchema = z.object({
  itemType: z.enum(VALID_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  tags: z.array(z.string().max(50)).max(20).default([]),
  content: z.record(z.string(), z.unknown()),
  provenance: z.record(z.string(), z.unknown()).default({}),
  sourceEntityType: z.string().max(50).optional(),
  sourceEntityId: z.string().uuid().optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  visibility: z.enum(['org', 'owner_only', 'advisor_only']).default('org'),
  status: z.enum(['draft', 'final']).default('final'),
});

/**
 * GET /api/vault/[orgId] — List vault items (viewer+)
 * Query params: ?type=board_pack&status=final&search=quarterly&limit=20&offset=0
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const itemType = url.searchParams.get('type') as VaultItemType | null;
    const status = url.searchParams.get('status') as VaultItemStatus | null;
    const search = url.searchParams.get('search') ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    const result = await listVaultItems(orgId, {
      itemType: itemType ?? undefined,
      status: status ?? undefined,
      search,
      limit,
      offset,
      userId: profile.id as string,
      userRole: profile.role as string,
    });

    return NextResponse.json({
      items: result.items,
      total: result.total,
      limit,
      offset,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[vault] GET error:', e);
    return NextResponse.json({ error: 'Failed to list vault items' }, { status: 500 });
  }
}

/**
 * POST /api/vault/[orgId] — Store a new item in the vault (advisor+)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('advisor');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = storeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await storeVaultItem({
      orgId,
      userId: user.id,
      itemType: parsed.data.itemType,
      title: parsed.data.title,
      description: parsed.data.description,
      tags: parsed.data.tags,
      content: parsed.data.content,
      provenance: parsed.data.provenance,
      sourceEntityType: parsed.data.sourceEntityType,
      sourceEntityId: parsed.data.sourceEntityId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      visibility: parsed.data.visibility as VaultVisibility,
      status: parsed.data.status as 'draft' | 'final',
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[vault] POST error:', e);
    return NextResponse.json({ error: 'Failed to store vault item' }, { status: 500 });
  }
}
