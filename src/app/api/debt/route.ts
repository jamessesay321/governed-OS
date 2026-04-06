import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const facilitySchema = z.object({
  facility_name: z.string().min(1).max(200),
  lender: z.string().min(1).max(200),
  facility_type: z.enum([
    'term_loan', 'unsecured_loan', 'secured_loan', 'mca',
    'credit_card', 'overdraft', 'government_loan', 'director_loan',
    'creditor_plan', 'personal_loan', 'other',
  ]),
  classification: z.enum(['good', 'okay', 'bad', 'unclassified']).default('unclassified'),
  original_amount: z.number().min(0),
  current_balance: z.number().min(0),
  monthly_repayment: z.number().min(0).default(0),
  interest_rate: z.number().min(0).max(10).default(0),
  effective_apr: z.number().min(0).max(10).nullable().default(null),
  fixed_fee: z.number().min(0).default(0),
  start_date: z.string().nullable().default(null),
  maturity_date: z.string().nullable().default(null),
  next_payment_date: z.string().nullable().default(null),
  payment_day: z.number().min(1).max(31).nullable().default(null),
  repayment_frequency: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly', 'when_paid', 'none']).default('monthly'),
  sweep_percentage: z.number().min(0).max(100).nullable().default(null),
  sweep_source: z.string().nullable().default(null),
  status: z.enum(['active', 'paid_off', 'refinanced', 'defaulted', 'frozen']).default('active'),
  refinance_eligible: z.boolean().default(false),
  refinance_priority: z.number().nullable().default(null),
  refinance_notes: z.string().nullable().default(null),
  secured: z.boolean().default(false),
  collateral_description: z.string().nullable().default(null),
  has_debenture: z.boolean().default(false),
  director_name: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  statement_access: z.string().nullable().default(null),
  portal_url: z.string().nullable().default(null),
  last_statement_date: z.string().nullable().default(null),
});

// GET — list all facilities for org
export async function GET() {
  try {
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();

    const { data: facilities, error } = await supabase
      .from('debt_facilities')
      .select('*')
      .eq('org_id', orgId)
      .order('classification', { ascending: true })
      .order('current_balance', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also fetch balance history for all facilities
    const facilityIds = (facilities ?? []).map((f: Record<string, unknown>) => f.id as string);
    let balanceHistory: Record<string, unknown>[] = [];
    if (facilityIds.length > 0) {
      const { data: bh } = await supabase
        .from('debt_balance_history')
        .select('*')
        .in('facility_id', facilityIds)
        .order('period', { ascending: true });
      balanceHistory = bh ?? [];
    }

    // Group balance history by facility
    const historyByFacility: Record<string, Record<string, unknown>[]> = {};
    for (const bh of balanceHistory) {
      const fid = bh.facility_id as string;
      if (!historyByFacility[fid]) historyByFacility[fid] = [];
      historyByFacility[fid].push(bh);
    }

    const enriched = (facilities ?? []).map((f: Record<string, unknown>) => ({
      ...f,
      balance_history: historyByFacility[f.id as string] ?? [],
    }));

    return NextResponse.json({ facilities: enriched });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST — create a new facility
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await getUserProfile();
    const body = await req.json();
    const parsed = facilitySchema.parse(body);

    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('debt_facilities')
      .insert({ ...parsed, org_id: orgId })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId,
      action: 'debt_facility_created',
      entityType: 'debt_facility',
      entityId: data.id,
      changes: parsed as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ facility: data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PUT — update a facility
export async function PUT(req: NextRequest) {
  try {
    const { orgId, userId } = await getUserProfile();
    const body = await req.json();
    const { id, ...rest } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing facility id' }, { status: 400 });
    }

    const parsed = facilitySchema.partial().parse(rest);
    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('debt_facilities')
      .update(parsed)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId,
      action: 'debt_facility_updated',
      entityType: 'debt_facility',
      entityId: id,
      changes: parsed as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ facility: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
