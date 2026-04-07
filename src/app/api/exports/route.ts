import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import ExcelJS from 'exceljs';

const exportSchema = z.object({
  type: z.enum(['financials', 'transactions', 'kpis', 'audit_trail']),
  format: z.enum(['csv', 'xlsx']).default('csv'),
});

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

/**
 * Build a styled Excel workbook from headers + rows.
 * Returns an ArrayBuffer ready to send as a response.
 */
async function buildExcelWorkbook(
  sheetName: string,
  headers: string[],
  rows: string[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grove';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Header row — styled
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }, // Grove emerald
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Data rows
  for (const row of rows) {
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
    const excelRow = sheet.addRow(row.map((cell) => {
      // Auto-detect numbers
      const num = parseFloat(cell);
      if (!isNaN(num) && cell.trim() !== '' && !/^\d{4}-\d{2}/.test(cell)) {
        return num;
      }
      return cell;
    }));
    excelRow.font = { size: 10 };
  }

  // Auto-width columns
  for (let i = 1; i <= headers.length; i++) {
    const col = sheet.getColumn(i);
    let maxLen = headers[i - 1].length;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(Math.max(maxLen + 3, 10), 50);
  }

  // Format number columns with comma separator
  for (let i = 1; i <= headers.length; i++) {
    const headerLower = headers[i - 1].toLowerCase();
    if (headerLower.includes('amount') || headerLower.includes('value') || headerLower.includes('target') || headerLower.includes('previous')) {
      sheet.getColumn(i).numFmt = '#,##0.00';
    }
  }

  // Alternating row colors
  sheet.eachRow((row, rowNum) => {
    if (rowNum > 1 && rowNum % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDF4' }, // Light emerald
      };
    }
  });

  // Add borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * POST /api/exports — Generate a data export (CSV or XLSX)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('advisor');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createUntypedServiceClient();
    let csv = '';
    let filename = '';

    switch (parsed.data.type) {
      case 'financials': {
        const { data } = await supabase
          .from('normalised_financials')
          .select('period, account_code, account_name, account_type, amount, currency')
          .eq('org_id', orgId)
          .order('period', { ascending: false })
          .limit(10000);

        const rows = (data ?? []).map((r: Record<string, unknown>) => [
          String(r.period ?? ''),
          String(r.account_code ?? ''),
          String(r.account_name ?? ''),
          String(r.account_type ?? ''),
          String(r.amount ?? '0'),
          String(r.currency ?? 'GBP'),
        ]);

        csv = toCsv(['Period', 'Account Code', 'Account Name', 'Type', 'Amount', 'Currency'], rows);
        filename = `grove-financials-${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      case 'transactions': {
        const { data } = await supabase
          .from('raw_transactions')
          .select('date, type, contact_name, description, line_amount, account_code, currency_code')
          .eq('org_id', orgId)
          .order('date', { ascending: false })
          .limit(10000);

        const rows = (data ?? []).map((r: Record<string, unknown>) => [
          String(r.date ?? ''),
          String(r.type ?? ''),
          String(r.contact_name ?? ''),
          String(r.description ?? ''),
          String(r.line_amount ?? '0'),
          String(r.account_code ?? ''),
          String(r.currency_code ?? 'GBP'),
        ]);

        csv = toCsv(['Date', 'Type', 'Contact', 'Description', 'Amount', 'Account Code', 'Currency'], rows);
        filename = `grove-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      case 'kpis': {
        const { data } = await supabase
          .from('kpi_snapshots')
          .select('period, metric_key, metric_label, value, unit, category, target_value, previous_value')
          .eq('org_id', orgId)
          .order('period', { ascending: false })
          .limit(5000);

        const rows = (data ?? []).map((r: Record<string, unknown>) => [
          String(r.period ?? ''),
          String(r.metric_key ?? ''),
          String(r.metric_label ?? ''),
          String(r.value ?? ''),
          String(r.unit ?? ''),
          String(r.category ?? ''),
          String(r.target_value ?? ''),
          String(r.previous_value ?? ''),
        ]);

        csv = toCsv(['Period', 'Key', 'Label', 'Value', 'Unit', 'Category', 'Target', 'Previous'], rows);
        filename = `grove-kpis-${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      case 'audit_trail': {
        const { data } = await supabase
          .from('audit_logs')
          .select('created_at, user_id, action, entity_type, entity_id, metadata')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(10000);

        const rows = (data ?? []).map((r: Record<string, unknown>) => [
          String(r.created_at ?? ''),
          String(r.user_id ?? ''),
          String(r.action ?? ''),
          String(r.entity_type ?? ''),
          String(r.entity_id ?? ''),
          r.metadata ? JSON.stringify(r.metadata) : '',
        ]);

        csv = toCsv(['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'Metadata'], rows);
        filename = `grove-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'data.exported',
      entityType: 'export',
      entityId: parsed.data.type,
      metadata: { format: parsed.data.format, type: parsed.data.type },
    });

    // Excel format
    if (parsed.data.format === 'xlsx') {
      const xlsxFilename = filename.replace('.csv', '.xlsx');
      const headers = csv.split('\n')[0].split(',').map((h) => h.replace(/^"|"$/g, ''));
      const dataRows = csv.split('\n').slice(1).map((line) =>
        line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
      );

      const buffer = await buildExcelWorkbook(
        parsed.data.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        headers,
        dataRows,
      );

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${xlsxFilename}"`,
        },
      });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[exports] POST error:', err);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
