import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const orderSchema = z.object({
  client_id: z.string().uuid().nullable().default(null),
  client_name: z.string().min(1).max(200),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  status: z.enum(['confirmed', 'on_hold', 'cancelled', 'completed', 'enquiry']).default('enquiry'),
  dress_style: z.string().nullable().default(null),
  dress_name: z.string().nullable().default(null),
  dress_price: z.number().min(0).nullable().default(null),
  actual_dress_choice: z.string().nullable().default(null),
  wedding_date: z.string().nullable().default(null),
  event_type: z.string().default('wedding'),
  order_date: z.string().nullable().default(null),
  fitting_date: z.string().nullable().default(null),
  completion_date: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
});

// GET — list all bridal orders for org with their payments
export async function GET() {
  try {
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();

    const { data: orders, error } = await supabase
      .from('bridal_orders')
      .select('*')
      .eq('org_id', orgId)
      .order('wedding_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch all payments for these orders
    const orderIds = (orders ?? []).map((o: Record<string, unknown>) => o.id as string);
    let payments: Record<string, unknown>[] = [];
    if (orderIds.length > 0) {
      const { data: pmt } = await supabase
        .from('bridal_order_payments')
        .select('*')
        .in('order_id', orderIds)
        .order('due_date', { ascending: true });
      payments = pmt ?? [];
    }

    // Group payments by order
    const paymentsByOrder: Record<string, Record<string, unknown>[]> = {};
    for (const p of payments) {
      const oid = p.order_id as string;
      if (!paymentsByOrder[oid]) paymentsByOrder[oid] = [];
      paymentsByOrder[oid].push(p);
    }

    const enriched = (orders ?? []).map((o: Record<string, unknown>) => ({
      ...o,
      payments: paymentsByOrder[o.id as string] ?? [],
    }));

    return NextResponse.json({ orders: enriched });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST — create a new bridal order
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await getUserProfile();
    const body = await req.json();
    const parsed = orderSchema.parse(body);

    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('bridal_orders')
      .insert({ ...parsed, org_id: orgId })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId,
      action: 'bridal_order_created',
      entityType: 'bridal_order',
      entityId: data.id,
      changes: parsed as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ order: data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
