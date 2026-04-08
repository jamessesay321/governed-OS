import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ id: string }> };

const paymentSchema = z.object({
  payment_type: z.enum(['deposit', 'interim', 'balance', 'refund']),
  amount: z.number().min(0),
  due_date: z.string().nullable().default(null),
  paid_date: z.string().nullable().default(null),
  payment_method: z.string().nullable().default(null),
  xero_invoice_id: z.string().nullable().default(null),
  status: z.enum(['pending', 'paid', 'overdue', 'waived']).default('pending'),
  notes: z.string().nullable().default(null),
});

// GET — list all payments for a bridal order
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();

    // Verify order belongs to org
    const { data: order } = await supabase
      .from('bridal_orders')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: payments, error } = await supabase
      .from('bridal_order_payments')
      .select('*')
      .eq('order_id', id)
      .eq('org_id', orgId)
      .order('due_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payments: payments ?? [] });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST — add a payment to a bridal order
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { orgId, userId } = await getUserProfile();
    const body = await req.json();
    const parsed = paymentSchema.parse(body);

    const supabase = await createUntypedServiceClient();

    // Verify order belongs to org
    const { data: order } = await supabase
      .from('bridal_orders')
      .select('id, client_name')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('bridal_order_payments')
      .insert({ ...parsed, order_id: id, org_id: orgId })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId,
      action: 'bridal_payment_created',
      entityType: 'bridal_order_payment',
      entityId: data.id,
      changes: { ...parsed, order_id: id } as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ payment: data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
