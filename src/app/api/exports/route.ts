import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const exportSchema = z.object({
  type: z.enum(['financials', 'transactions', 'kpis', 'audit_trail']),
  format: z.enum(['csv']).default('csv'),
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
 * POST /api/exports — Generate a data export
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
