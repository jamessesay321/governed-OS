import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { getDefaultTaxSettings } from '@/lib/financial/uk-tax';
import { z } from 'zod';

const taxSettingsUpdateSchema = z.object({
  corporation_tax_rate: z.number().min(0).max(1).optional(),
  vat_registered: z.boolean().optional(),
  vat_rate: z.number().min(0).max(1).optional(),
  vat_flat_rate: z.number().min(0).max(1).nullable().optional(),
  vat_quarter_start_month: z.number().int().min(1).max(12).optional(),
  vat_scheme: z.enum(['standard', 'flat_rate', 'cash', 'annual']).optional(),
  paye_rate: z.number().min(0).max(1).optional(),
  employee_ni_rate: z.number().min(0).max(1).optional(),
  employer_ni_rate: z.number().min(0).max(1).optional(),
  employer_ni_threshold: z.number().min(0).optional(),
  employer_pension_rate: z.number().min(0).max(1).optional(),
  has_vat_payment_plan: z.boolean().optional(),
  vat_payment_plan_balance: z.number().min(0).optional(),
  vat_payment_plan_monthly: z.number().min(0).optional(),
  has_corp_tax_payment_plan: z.boolean().optional(),
  corp_tax_payment_plan_balance: z.number().min(0).optional(),
  corp_tax_payment_plan_monthly: z.number().min(0).optional(),
  has_paye_payment_plan: z.boolean().optional(),
  paye_payment_plan_balance: z.number().min(0).optional(),
  paye_payment_plan_monthly: z.number().min(0).optional(),
});

/**
 * GET /api/tax/[orgId]
 * Fetch tax settings for an organisation. Creates defaults if none exist.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TODO: Switch to createServiceClient after regenerating Supabase types with tax_settings table
    const supabase = await createUntypedServiceClient();

    // Try to fetch existing settings
    const { data: settings } = await supabase
      .from('tax_settings')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (settings) {
      return NextResponse.json({ settings });
    }

    // Create defaults if none exist
    const defaults = getDefaultTaxSettings();
    const { data: created, error } = await supabase
      .from('tax_settings')
      .insert({ org_id: orgId, ...defaults })
      .select()
      .single();

    if (error) {
      // Table may not exist yet (migration not run)
      return NextResponse.json({ settings: { org_id: orgId, ...defaults } });
    }

    return NextResponse.json({ settings: created });
  } catch (err) {
    console.error('[TAX] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch tax settings' }, { status: 500 });
  }
}

/**
 * PUT /api/tax/[orgId]
 * Update tax settings. Requires admin role.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('admin');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = taxSettingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    // TODO: Switch to createServiceClient after regenerating Supabase types with tax_settings table
    const supabase = await createUntypedServiceClient();

    const { data: updated, error } = await supabase
      .from('tax_settings')
      .upsert(
        { org_id: orgId, ...parsed.data, updated_at: new Date().toISOString() },
        { onConflict: 'org_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[TAX] Update error:', error);
      return NextResponse.json({ error: 'Failed to update tax settings' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'tax_settings.updated',
      entityType: 'tax_settings',
      entityId: orgId,
      metadata: { changes: parsed.data },
    });

    return NextResponse.json({ settings: updated });
  } catch (err) {
    console.error('[TAX] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update tax settings' }, { status: 500 });
  }
}
