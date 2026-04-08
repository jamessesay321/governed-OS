import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ orgId: string }> };

const addMemberSchema = z.object({
  payroll_group_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  role_title: z.string().max(255).optional(),
  annual_gross_salary: z.number().min(0),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_forecast: z.boolean().default(false),
});

const updateMemberSchema = z.object({
  id: z.string().uuid(),
  payroll_group_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  role_title: z.string().max(255).optional(),
  annual_gross_salary: z.number().min(0).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_forecast: z.boolean().optional(),
});

// POST /api/payroll/[orgId]/members — Add a new payroll group member
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('admin');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const body = await request.json();
    const input = addMemberSchema.parse(body);
    const supabase = await createUntypedServiceClient();

    // Verify the payroll group belongs to this org
    const { data: group, error: groupError } = await supabase
      .from('payroll_groups')
      .select('id')
      .eq('id', input.payroll_group_id)
      .eq('org_id', orgId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Payroll group not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('payroll_group_members')
      .insert({
        org_id: orgId,
        payroll_group_id: input.payroll_group_id,
        name: input.name,
        role_title: input.role_title ?? null,
        annual_gross_salary: input.annual_gross_salary,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        is_forecast: input.is_forecast,
      })
      .select()
      .single();

    if (error) {
      console.error('[payroll/members] POST error:', error.message);
      return NextResponse.json({ error: 'Failed to add payroll member' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'payroll.member_added',
      entityType: 'payroll_group_member',
      entityId: data.id as string,
      metadata: {
        groupId: input.payroll_group_id,
        name: input.name,
        salary: input.annual_gross_salary,
      },
    });

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.issues }, { status: 400 });
    }
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[payroll/members] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/payroll/[orgId]/members — Update an existing payroll group member
export async function PUT(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('admin');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const body = await request.json();
    const input = updateMemberSchema.parse(body);
    const supabase = await createUntypedServiceClient();

    // Verify the member belongs to this org
    const { data: existing, error: existErr } = await supabase
      .from('payroll_group_members')
      .select('id')
      .eq('id', input.id)
      .eq('org_id', orgId)
      .single();

    if (existErr || !existing) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // If changing group, verify the new group belongs to this org
    if (input.payroll_group_id) {
      const { data: group, error: groupError } = await supabase
        .from('payroll_groups')
        .select('id')
        .eq('id', input.payroll_group_id)
        .eq('org_id', orgId)
        .single();

      if (groupError || !group) {
        return NextResponse.json({ error: 'Payroll group not found' }, { status: 404 });
      }
    }

    // Build update payload (only include provided fields)
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.role_title !== undefined) updatePayload.role_title = input.role_title;
    if (input.annual_gross_salary !== undefined) updatePayload.annual_gross_salary = input.annual_gross_salary;
    if (input.start_date !== undefined) updatePayload.start_date = input.start_date;
    if (input.end_date !== undefined) updatePayload.end_date = input.end_date;
    if (input.is_forecast !== undefined) updatePayload.is_forecast = input.is_forecast;
    if (input.payroll_group_id !== undefined) updatePayload.payroll_group_id = input.payroll_group_id;

    const { data, error } = await supabase
      .from('payroll_group_members')
      .update(updatePayload)
      .eq('id', input.id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('[payroll/members] PUT error:', error.message);
      return NextResponse.json({ error: 'Failed to update payroll member' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'payroll.member_updated',
      entityType: 'payroll_group_member',
      entityId: input.id,
      metadata: { changes: updatePayload },
    });

    return NextResponse.json({ member: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.issues }, { status: 400 });
    }
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[payroll/members] PUT error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
