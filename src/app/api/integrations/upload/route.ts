import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  parseSpreadsheet,
  suggestColumnMappings,
} from '@/lib/integrations/spreadsheet-import';

/**
 * POST /api/integrations/upload
 * Upload a spreadsheet file (CSV, TSV, XLSX), parse it,
 * and return the parsed result with suggested column mappings.
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Use multipart form-data with a "file" field.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name;
    const ext = fileName.toLowerCase().split('.').pop();
    if (!['csv', 'tsv', 'xlsx', 'xls'].includes(ext ?? '')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}. Accepted: csv, tsv, xlsx` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the spreadsheet
    const parseResult = parseSpreadsheet(buffer, fileName);

    // Suggest column mappings for the first sheet
    let suggestedMappings = null;
    if (parseResult.sheets.length > 0 && parseResult.sheets[0].headers.length > 0) {
      suggestedMappings = await suggestColumnMappings(
        parseResult.sheets[0].headers,
        orgId
      );
    }

    return NextResponse.json({
      parseResult,
      suggestedMappings,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[UPLOAD] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
