import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  ingestMappedData,
  type ColumnMapping,
} from '@/lib/integrations/spreadsheet-import';
import { z } from 'zod';

const ingestSchema = z.object({
  data: z.array(z.record(z.string(), z.string())),
  mappings: z.array(
    z.object({
      sourceColumn: z.string(),
      targetField: z.enum([
        'date',
        'amount',
        'description',
        'reference',
        'category',
        'contact',
        'skip',
      ]),
      transform: z
        .enum(['none', 'parse_date', 'parse_currency', 'trim'])
        .optional(),
    })
  ),
  source: z.string().optional(),
});

/**
 * POST /api/integrations/upload/ingest
 * Ingest parsed and mapped spreadsheet data into the staging pipeline.
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = ingestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { data, mappings, source } = parsed.data;

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No data rows provided.' },
        { status: 400 }
      );
    }

    const result = await ingestMappedData(
      orgId,
      data,
      mappings as ColumnMapping[],
      source ?? 'csv_import'
    );

    return NextResponse.json({
      success: true,
      ingested: result.ingested,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[INGEST] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
