import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

// Seed bridal_orders from the Alonuko WIP 2026 report (Section A: Clients orders in progress)
// One-time operation to populate bridal order pipeline from real client data

const ALONUKO_ORG_ID = 'd49bc641-5b5e-4089-b931-5a103c69617a';
const DEFAULT_DEPOSIT = 1750; // 50% of avg dress price (~£3,500)
const DEPOSIT_DATE = '2026-01-15'; // approximate deposit date for in-progress orders

interface WipOrder {
  client_name: string;
  order_code: string;
  cogs: number;
  customer_id?: string;
}

// ============================================================
// Section A: Orders by code (no client name linked yet)
// ============================================================
const CODE_ORDERS: WipOrder[] = [
  { client_name: 'BR26-01 Client', order_code: 'BR26-01', cogs: 1887.21 },
  { client_name: 'BR26-03 Client', order_code: 'BR26-03', cogs: 248.40 },
  { client_name: 'BR26-04 Client', order_code: 'BR26-04', cogs: 499.50 },
  { client_name: 'BR26-05 Client', order_code: 'BR26-05', cogs: 768.66 },
  { client_name: 'BR26-06 Client', order_code: 'BR26-06', cogs: 234.00 },
  { client_name: 'BR26-09 Client', order_code: 'BR26-09', cogs: 6689.32 },
  { client_name: 'BR26-10 Client', order_code: 'BR26-10', cogs: 1378.12 },
  { client_name: 'BR26-13 Client', order_code: 'BR26-13', cogs: 627.75 },
  { client_name: 'BR26-14 Client', order_code: 'BR26-14', cogs: 342.00 },
  { client_name: 'BR26-15 Client', order_code: 'BR26-15', cogs: 252.00 },
];

// ============================================================
// Section A: Orders by client name (with Customer ID)
// ============================================================
const CLIENT_ORDERS: WipOrder[] = [
  { client_name: 'Abigail Wazola', order_code: 'BR26-AW', cogs: 423.00, customer_id: '4675226786' },
  { client_name: 'Alexis Olds', order_code: 'BR26-AO', cogs: 709.80, customer_id: '9644875887' },
  { client_name: 'Alexis Ryans', order_code: 'BR26-AR', cogs: 288.00, customer_id: '10052830150' },
  { client_name: 'Allison Williams', order_code: 'BR26-AWI', cogs: 1472.50, customer_id: '7416598267' },
  { client_name: 'Ana Karina Fonseca', order_code: 'BR26-AKF', cogs: 240.75, customer_id: '11339218979' },
  { client_name: 'Angelique Gray', order_code: 'BR26-AG', cogs: 72.00, customer_id: '11316826263' },
  { client_name: 'Antonice Turpin', order_code: 'BR26-AT', cogs: 2135.11, customer_id: '9748854713' },
  { client_name: 'Aryana Charles', order_code: 'BR26-AC', cogs: 405.00, customer_id: '9641698390' },
  { client_name: 'Brianna Matthews', order_code: 'BR26-BM', cogs: 405.00, customer_id: '18169549407' },
  { client_name: 'Brianna Whitehead', order_code: 'BR26-BW', cogs: 452.25, customer_id: '9461653000' },
  { client_name: 'Carline Uwajeh', order_code: 'BR26-CU', cogs: 657.91, customer_id: '10618414239' },
  { client_name: 'Cedrice Davis', order_code: 'BR26-CD', cogs: 456.47, customer_id: '18262999837' },
  { client_name: 'Chelsea Ntumba', order_code: 'BR26-CN', cogs: 202.50, customer_id: '8850541395' },
  { client_name: 'Charniece Huff', order_code: 'BR26-CH', cogs: 463.50, customer_id: '11410494491' },
  { client_name: 'Ciarah Jones', order_code: 'BR26-CJ', cogs: 1452.75, customer_id: '8883489830' },
  { client_name: 'Damilola Olatunde', order_code: 'BR26-DO', cogs: 770.45, customer_id: '18297170980' },
  { client_name: 'Dasia Jones', order_code: 'BR26-DJ', cogs: 355.47, customer_id: '9402122525' },
];

const ALL_ORDERS: WipOrder[] = [...CODE_ORDERS, ...CLIENT_ORDERS];

export async function POST() {
  try {
    const { profile } = await requireRole('admin');
    const userId = profile.id as string;
    const orgId = ALONUKO_ORG_ID;

    const supabase = await createUntypedServiceClient();

    // Check for existing WIP-imported orders to avoid duplicates
    const { data: existing } = await supabase
      .from('bridal_orders')
      .select('order_code, client_name')
      .eq('org_id', orgId)
      .eq('source', 'wip_import');

    const existingCodes = new Set(
      (existing ?? []).map((e: Record<string, unknown>) => e.order_code as string)
    );
    const existingNames = new Set(
      (existing ?? []).map((e: Record<string, unknown>) => e.client_name as string)
    );

    // Filter out orders that already exist (match on order_code OR client_name)
    const newOrders = ALL_ORDERS.filter(
      (o) => !existingCodes.has(o.order_code) && !existingNames.has(o.client_name)
    );

    if (newOrders.length === 0) {
      return NextResponse.json({
        message: `Already seeded. ${existing?.length ?? 0} WIP orders exist.`,
        seeded: false,
        existing_count: existing?.length ?? 0,
      });
    }

    // Build order rows
    const orderRows = newOrders.map((o) => ({
      org_id: orgId,
      client_name: o.client_name,
      order_code: o.order_code,
      status: 'confirmed',
      dress_style: 'Made to Order',
      source: 'wip_import',
      event_type: 'wedding',
      notes: o.customer_id
        ? `WIP 2026 import. Customer ID: ${o.customer_id}. COGS: £${o.cogs.toFixed(2)}`
        : `WIP 2026 import. COGS: £${o.cogs.toFixed(2)}`,
      tags: ['wip-2026'],
    }));

    // Insert orders
    const { data: insertedOrders, error: orderError } = await supabase
      .from('bridal_orders')
      .insert(orderRows)
      .select('id, client_name, order_code');

    if (orderError) {
      return NextResponse.json(
        { error: `Failed to insert orders: ${orderError.message}` },
        { status: 500 }
      );
    }

    const orders = insertedOrders as Record<string, unknown>[];

    // Build payment rows — one deposit per order
    const paymentRows = orders.map((order) => ({
      order_id: order.id as string,
      org_id: orgId,
      payment_type: 'deposit',
      amount: DEFAULT_DEPOSIT,
      status: 'paid',
      paid_date: DEPOSIT_DATE,
      notes: 'Estimated deposit (50% of avg dress price). WIP 2026 import.',
    }));

    const { error: paymentError } = await supabase
      .from('bridal_order_payments')
      .insert(paymentRows);

    if (paymentError) {
      // Orders were inserted but payments failed — log the issue
      console.error('[BRIDAL SEED] Payment insert failed:', paymentError.message);
      await logAudit({
        orgId,
        userId,
        action: 'bridal_orders_seed_partial',
        entityType: 'bridal_order',
        entityId: orgId,
        changes: {
          orders_created: orders.length,
          payments_failed: true,
          payment_error: paymentError.message,
        },
      });

      return NextResponse.json(
        {
          message: `Seeded ${orders.length} orders but payment insert failed: ${paymentError.message}`,
          seeded: true,
          orders_created: orders.length,
          payments_created: 0,
          orders,
        },
        { status: 207 }
      );
    }

    // Update total_paid and outstanding_balance on each order
    // Deposit is £1,750; typical dress price ~£3,500 so outstanding ~£1,750
    for (const order of orders) {
      await supabase
        .from('bridal_orders')
        .update({
          total_paid: DEFAULT_DEPOSIT,
          outstanding_balance: 3500 - DEFAULT_DEPOSIT, // £1,750 outstanding
        })
        .eq('id', order.id as string);
    }

    await logAudit({
      orgId,
      userId,
      action: 'bridal_orders_seeded',
      entityType: 'bridal_order',
      entityId: orgId,
      changes: {
        orders_created: orders.length,
        payments_created: paymentRows.length,
        source: 'wip_2026',
        order_codes: orders.map((o) => o.order_code),
      },
    });

    return NextResponse.json(
      {
        message: `Seeded ${orders.length} bridal orders with ${paymentRows.length} deposit payments from WIP 2026`,
        seeded: true,
        orders_created: orders.length,
        payments_created: paymentRows.length,
        orders,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[BRIDAL SEED] Error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
