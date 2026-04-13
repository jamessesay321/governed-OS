import { NextResponse } from 'next/server';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  isAcuityConfigured,
  getAppointments,
} from '@/lib/integrations/acuity';
import { classifyLineItem } from '@/lib/integrations/shopify-metrics';
import {
  computeTrunkShowROI,
  type TrunkShowAppointment,
  type TrunkShowPayment,
} from '@/lib/integrations/trunk-show-roi';

// ---------------------------------------------------------------------------
// Trunk show expense account codes (from Xero)
// ---------------------------------------------------------------------------

const TRUNK_SHOW_CODES = ['570', '571', '572', '573', '574'];

// ---------------------------------------------------------------------------
// Shopify helper (extract payments for matching)
// ---------------------------------------------------------------------------

async function fetchShopifyPayments(): Promise<TrunkShowPayment[]> {
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!shopifyDomain || !shopifyToken) return [];

  const payments: TrunkShowPayment[] = [];
  const url = `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&limit=250`;

  const res = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': shopifyToken },
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    orders: Array<{
      customer?: { first_name?: string; last_name?: string; email?: string };
      email?: string;
      created_at: string;
      financial_status: string;
      line_items: Array<{ title: string; price: string; quantity: number }>;
    }>;
  };

  for (const order of data.orders) {
    if (order.financial_status === 'voided' || order.financial_status === 'refunded') continue;

    const customerName = order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim()
      : '';
    const email = order.customer?.email ?? order.email;

    // Sum all line items for total order value
    let totalAmount = 0;
    for (const li of order.line_items) {
      totalAmount += (parseFloat(li.price) || 0) * li.quantity;
    }

    if (customerName || email) {
      payments.push({
        customerName: customerName || 'Unknown',
        email,
        amount: totalAmount,
        date: order.created_at,
      });
    }
  }

  return payments;
}

// ---------------------------------------------------------------------------
// GET /api/integrations/trunk-show-roi
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;
    const supabase = await createUntypedServiceClient();

    const acuityReady = isAcuityConfigured();

    // Fetch from 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const minDate = twelveMonthsAgo.toISOString().split('T')[0];

    // Fetch in parallel: Acuity, Shopify, Xero spend
    const [acuityAppts, shopifyPayments, xeroSpend] = await Promise.all([
      // Acuity appointments (including future for upcoming shows)
      acuityReady
        ? getAppointments({ minDate, max: 1000 })
            .then((appts) =>
              appts.map(
                (a): TrunkShowAppointment => ({
                  name: `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim(),
                  email: a.email ?? undefined,
                  date: a.datetime ?? a.date ?? '',
                  type: a.type ?? '',
                  calendar: a.calendar ?? '',
                  location: a.location ?? '',
                  price: parseFloat(String(a.price ?? '0')) || 0,
                  paid: String(a.paid) === 'yes' || String(a.paid) === 'true',
                  cancelled: a.canceled === true || String(a.canceled) === 'true',
                })
              )
            )
            .catch(() => [] as TrunkShowAppointment[])
        : ([] as TrunkShowAppointment[]),

      // Shopify payments
      fetchShopifyPayments().catch(() => [] as TrunkShowPayment[]),

      // Xero trunk show spend from normalised_financials
      (async () => {
        // Get account IDs for trunk show codes
        const { data: coaData } = await supabase
          .from('chart_of_accounts')
          .select('id, code')
          .eq('org_id', orgId)
          .in('code', TRUNK_SHOW_CODES);

        const accounts = (coaData ?? []) as Array<{ id: string; code: string }>;
        const accountIds = accounts.map((a) => a.id);

        if (accountIds.length === 0) return {} as Record<string, number>;

        const { data: financials } = await supabase
          .from('normalised_financials')
          .select('period, amount')
          .eq('org_id', orgId)
          .in('account_id', accountIds);

        const spendByPeriod: Record<string, number> = {};
        for (const row of (financials ?? []) as Array<{ period: string; amount: number }>) {
          spendByPeriod[row.period] = (spendByPeriod[row.period] ?? 0) + Number(row.amount);
        }
        return spendByPeriod;
      })(),
    ]);

    // Compute ROI
    const result = computeTrunkShowROI(acuityAppts, shopifyPayments, xeroSpend);

    return NextResponse.json({
      ...result,
      sources: {
        acuity: { connected: acuityReady, appointments: acuityAppts.length },
        shopify: { connected: !!process.env.SHOPIFY_STORE_DOMAIN, payments: shopifyPayments.length },
        xero: { connected: true, periods: Object.keys(xeroSpend).length },
      },
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[TRUNK-SHOW-ROI] Error:', err);
    return NextResponse.json(
      { error: 'Failed to compute trunk show ROI' },
      { status: 500 }
    );
  }
}
