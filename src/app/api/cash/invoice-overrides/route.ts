import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const overrideSchema = z.object({
  invoice_xero_id: z.string().min(1).max(120),
  override_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  excluded_from_forecast: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

const bulkSchema = z.object({
  overrides: z.array(overrideSchema).min(1).max(500),
});

// GET — list all overrides for org
export async function GET() {
  try {
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('invoice_forecast_overrides')
      .select('*')
      .eq('org_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ overrides: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST — upsert one or many invoice overrides (used by row toggle + bulk actions)
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await getUserProfile();
    const body = await req.json();
    const parsed = bulkSchema.parse(body);

    const supabase = await createUntypedServiceClient();
    const now = new Date().toISOString();

    const rows = parsed.overrides.map((o) => ({
      org_id: orgId,
      invoice_xero_id: o.invoice_xero_id,
      override_date: o.override_date ?? null,
      excluded_from_forecast: o.excluded_from_forecast ?? false,
      note: o.note ?? null,
      created_by: userId,
      updated_by: userId,
      updated_at: now,
    }));

    const { data, error } = await supabase
      .from('invoice_forecast_overrides')
      .upsert(rows, { onConflict: 'org_id,invoice_xero_id' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId,
      action: 'invoice_forecast_override_upserted',
      entityType: 'invoice_forecast_override',
      changes: {
        count: rows.length,
        invoice_xero_ids: rows.map((r) => r.invoice_xero_id),
      },
    });

    return NextResponse.json({ overrides: data ?? [], count: rows.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE — remove a specific invoice override (clears it)
export async function DELETE(req: NextRequest) {
  try {
    const { orgId, userId } = await getUserProfile();
    const url = new URL(req.url);
    const invoiceXeroId = url.searchParams.get('invoice_xero_id');

    if (!invoiceXeroId) {
      return NextResponse.json({ error: 'Missing invoice_xero_id' }, { status: 400 });
    }

    const supabase = await createUntypedServiceClient();
    const { error } = await supabase
      .from('invoice_forecast_overrides')
      .delete()
      .eq('org_id', orgId)
      .eq('invoice_xero_id', invoiceXeroId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId,
      action: 'invoice_forecast_override_cleared',
      entityType: 'invoice_forecast_override',
      changes: { invoice_xero_id: invoiceXeroId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
