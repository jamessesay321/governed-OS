import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { OrdersClient } from './orders-client';

export interface BridalPayment {
  id: string;
  order_id: string;
  org_id: string;
  payment_type: 'deposit' | 'interim' | 'balance' | 'refund';
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  xero_invoice_id: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  notes: string | null;
  created_at: string;
}

export interface BridalOrder {
  id: string;
  org_id: string;
  client_id: string | null;
  client_name: string;
  email: string | null;
  phone: string | null;
  status: 'confirmed' | 'on_hold' | 'cancelled' | 'completed' | 'enquiry';
  dress_style: string | null;
  dress_name: string | null;
  dress_price: number | null;
  actual_dress_choice: string | null;
  wedding_date: string | null;
  event_type: string | null;
  order_date: string | null;
  fitting_date: string | null;
  completion_date: string | null;
  notes: string | null;
  tags: string[];
  // Monday.com / WIP link fields (from migration 040)
  monday_item_id: string | null;
  monday_board_id: string | null;
  order_code: string | null;
  total_paid: number | null;
  outstanding_balance: number | null;
  source: 'manual' | 'monday' | 'wip_import';
  created_at: string;
  updated_at: string;
  payments: BridalPayment[];
}

export interface OrdersSummary {
  totalOrders: number;
  confirmed: number;
  onHold: number;
  enquiries: number;
  completed: number;
  cancelled: number;
  totalRevenuePipeline: number;
  depositsCollected: number;
  totalPaid: number;
  outstandingBalance: number;
}

function computeSummary(orders: BridalOrder[]): OrdersSummary {
  const confirmed = orders.filter((o) => o.status === 'confirmed').length;
  const onHold = orders.filter((o) => o.status === 'on_hold').length;
  const enquiries = orders.filter((o) => o.status === 'enquiry').length;
  const completed = orders.filter((o) => o.status === 'completed').length;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;

  // Revenue pipeline = dress_price for confirmed + completed orders
  const revenueOrders = orders.filter((o) => o.status === 'confirmed' || o.status === 'completed');
  const totalRevenuePipeline = revenueOrders.reduce(
    (sum, o) => sum + Number(o.dress_price ?? 0),
    0
  );

  // Deposits collected = sum of all paid deposit payments
  let depositsCollected = 0;
  let totalPaid = 0;
  for (const order of orders) {
    for (const payment of order.payments) {
      if (payment.status === 'paid') {
        totalPaid += Number(payment.amount);
        if (payment.payment_type === 'deposit') {
          depositsCollected += Number(payment.amount);
        }
      }
    }
  }

  // Outstanding = total revenue pipeline - total paid (for confirmed/completed)
  const confirmedPaid = revenueOrders.reduce((sum, o) => {
    const orderPaid = o.payments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount), 0);
    return sum + orderPaid;
  }, 0);
  const outstandingBalance = totalRevenuePipeline - confirmedPaid;

  return {
    totalOrders: orders.length,
    confirmed,
    onHold,
    enquiries,
    completed,
    cancelled,
    totalRevenuePipeline,
    depositsCollected,
    totalPaid,
    outstandingBalance: Math.max(0, outstandingBalance),
  };
}

export default async function OrdersPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Fetch all bridal orders
  const { data: rawOrders } = await supabase
    .from('bridal_orders')
    .select('*')
    .eq('org_id', orgId)
    .order('wedding_date', { ascending: true });

  const orderRows = (rawOrders ?? []) as unknown as Record<string, unknown>[];

  // Fetch all payments for these orders
  const orderIds = orderRows.map((o) => o.id as string);
  let rawPayments: Record<string, unknown>[] = [];
  if (orderIds.length > 0) {
    const { data: pmt } = await supabase
      .from('bridal_order_payments')
      .select('*')
      .in('order_id', orderIds)
      .order('due_date', { ascending: true });
    rawPayments = (pmt ?? []) as unknown as Record<string, unknown>[];
  }

  // Group payments by order
  const paymentsByOrder: Record<string, BridalPayment[]> = {};
  for (const p of rawPayments) {
    const oid = p.order_id as string;
    if (!paymentsByOrder[oid]) paymentsByOrder[oid] = [];
    paymentsByOrder[oid].push(p as unknown as BridalPayment);
  }

  const orders: BridalOrder[] = orderRows.map((o) => ({
    ...(o as unknown as BridalOrder),
    tags: (o.tags as string[]) ?? [],
    source: (o.source as BridalOrder['source']) ?? 'manual',
    order_code: (o.order_code as string) ?? null,
    monday_item_id: (o.monday_item_id as string) ?? null,
    monday_board_id: (o.monday_board_id as string) ?? null,
    total_paid: o.total_paid != null ? Number(o.total_paid) : null,
    outstanding_balance: o.outstanding_balance != null ? Number(o.outstanding_balance) : null,
    payments: paymentsByOrder[o.id as string] ?? [],
  }));

  const summary = computeSummary(orders);

  return <OrdersClient orders={orders} summary={summary} orgId={orgId} />;
}
