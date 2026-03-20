import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { calculateFullyLoadedCost } from '@/lib/financial/uk-tax';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ orgId: string }> };

const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  employer_ni_rate: z.number().min(0).max(1).default(0.138),
  employer_ni_threshold: z.number().min(0).default(9100),
  employer_pension_rate: z.number().min(0).max(1).default(0.03),
});

const addMemberSchema = z.object({
  payroll_group_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  role_title: z.string().max(255).optional(),
  annual_gross_salary: z.number().min(0),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_forecast: z.boolean().default(false),
});

// GET /api/payroll/[orgId] — Fetch all payroll groups with members and calculated costs
export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const supabase = await createUntypedServiceClient();

    const { data: groups, error: gError } = await supabase
      .from('payroll_groups')
      .select('*')
      .eq('org_id', orgId)
      .order('name');

    if (gError) {
      return NextResponse.json({ error: gError.message }, { status: 500 });
    }

    const { data: members, error: mError } = await supabase
      .from('payroll_group_members')
      .select('*')
      .eq('org_id', orgId)
      .order('name');

    if (mError) {
      return NextResponse.json({ error: mError.message }, { status: 500 });
    }

    // Calculate fully loaded costs for each group
    const enrichedGroups = (groups ?? []).map((group: Record<string, unknown>) => {
      const groupMembers = (members ?? []).filter(
        (m: Record<string, unknown>) => m.payroll_group_id === group.id
      );

      const settings = {
        employer_ni_rate: Number(group.employer_ni_rate),
        employer_ni_threshold: Number(group.employer_ni_threshold),
        employer_pension_rate: Number(group.employer_pension_rate),
      };

      const memberCosts = groupMembers.map((m: Record<string, unknown>) => {
        const costs = calculateFullyLoadedCost(Number(m.annual_gross_salary), settings);
        return { ...m, costs };
      });

      const totalSalary = memberCosts.reduce((sum: number, m: Record<string, unknown>) => sum + Number((m.costs as Record<string, unknown>).salary), 0);
      const totalNI = memberCosts.reduce((sum: number, m: Record<string, unknown>) => sum + Number((m.costs as Record<string, unknown>).employerNI), 0);
      const totalPension = memberCosts.reduce((sum: number, m: Record<string, unknown>) => sum + Number((m.costs as Record<string, unknown>).employerPension), 0);
      const totalCost = memberCosts.reduce((sum: number, m: Record<string, unknown>) => sum + Number((m.costs as Record<string, unknown>).totalCost), 0);

      return {
        ...group,
        members: memberCosts,
        headcount: memberCosts.length,
        totals: {
          salary: totalSalary,
          employerNI: totalNI,
          employerPension: totalPension,
          totalCost,
          monthlyTotal: Math.round((totalCost / 12) * 100) / 100,
        },
      };
    });

    return NextResponse.json({ groups: enrichedGroups });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/payroll/[orgId] — Create a payroll group or add a member
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('admin');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body as { action: string };
    const supabase = await createUntypedServiceClient();

    if (action === 'create_group') {
      const input = createGroupSchema.parse(body);

      const { data, error } = await supabase
        .from('payroll_groups')
        .insert({
          org_id: orgId,
          name: input.name,
          description: input.description ?? null,
          employer_ni_rate: input.employer_ni_rate,
          employer_ni_threshold: input.employer_ni_threshold,
          employer_pension_rate: input.employer_pension_rate,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAudit({
        orgId,
        userId: user.id,
        action: 'payroll.group_created',
        entityType: 'payroll_group',
        entityId: data.id as string,
        metadata: { name: input.name },
      });

      return NextResponse.json({ group: data }, { status: 201 });
    }

    if (action === 'add_member') {
      const input = addMemberSchema.parse(body);

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
        return NextResponse.json({ error: error.message }, { status: 500 });
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
    }

    return NextResponse.json({ error: 'Invalid action. Use create_group or add_member.' }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/payroll/[orgId] — Delete a payroll group or member
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('admin');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const memberId = searchParams.get('memberId');
    const supabase = await createUntypedServiceClient();

    if (memberId) {
      const { error } = await supabase
        .from('payroll_group_members')
        .delete()
        .eq('id', memberId)
        .eq('org_id', orgId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAudit({
        orgId,
        userId: user.id,
        action: 'payroll.member_deleted',
        entityType: 'payroll_group_member',
        entityId: memberId,
      });

      return NextResponse.json({ deleted: true });
    }

    if (groupId) {
      // Cascade deletes members via FK constraint
      const { error } = await supabase
        .from('payroll_groups')
        .delete()
        .eq('id', groupId)
        .eq('org_id', orgId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAudit({
        orgId,
        userId: user.id,
        action: 'payroll.group_deleted',
        entityType: 'payroll_group',
        entityId: groupId,
      });

      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: 'Provide groupId or memberId query parameter' }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
