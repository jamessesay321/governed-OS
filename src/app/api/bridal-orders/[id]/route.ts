import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ id: string }> };

const updateOrderSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(['confirmed', 'on_hold', 'cancelled', 'completed', 'enquiry']).optional(),
  dress_style: z.string().nullable().optional(),
  dress_name: z.string().nullable().optional(),
  dress_price: z.number().min(0).nullable().optional(),
  actual_dress_choice: z.string().nullable().optional(),
  wedding_date: z.string().nullable().optional(),
  event_type: z.string().optional(),
  order_date: z.string().nullable().optional(),
  fitting_date: z.string().nullable().optional(),
  completion_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// PUT — update a bridal order
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { orgId, userId } = await getUserProfile();
    const body = await req.json();
    const parsed = updateOrderSchema.parse(body);

    if (Object.keys(parsed).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('bridal_orders')
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
      action: 'bridal_order_updated',
      entityType: 'bridal_order',
      entityId: id,
      changes: parsed as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ order: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE — delete a bridal order
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { orgId, userId } = await getUserProfile();

    const supabase = await createUntypedServiceClient();

    // Fetch order first for audit log
    const { data: existing } = await supabase
      .from('bridal_orders')
      .select('client_name, status')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('bridal_orders')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId,
      action: 'bridal_order_deleted',
      entityType: 'bridal_order',
      entityId: id,
      changes: existing as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
