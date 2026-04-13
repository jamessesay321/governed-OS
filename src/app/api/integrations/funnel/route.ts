import { NextResponse } from 'next/server';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import {
  isAcuityConfigured,
  getAppointments,
} from '@/lib/integrations/acuity';
import { classifyLineItem } from '@/lib/integrations/shopify-metrics';
import {
  computeFunnelSummary,
  computeBrideJourneys,
  type FunnelConsultation,
  type FunnelDeal,
  type FunnelOrder,
  type FunnelPayment,
} from '@/lib/integrations/funnel-metrics';

// ---------------------------------------------------------------------------
// HubSpot helpers (reused from hubspot route)
// ---------------------------------------------------------------------------

function getHubSpotToken(): string | null {
  return process.env.HUBSPOT_ACCESS_TOKEN ?? null;
}

async function fetchHubSpotDeals(token: string): Promise<FunnelDeal[]> {
  const deals: FunnelDeal[] = [];
  let after: string | undefined;
  const props = 'dealname,dealstage,amount,pipeline,closedate,createdate';

  do {
    const url = new URL('https://api.hubapi.com/crm/v3/objects/deals');
    url.searchParams.set('limit', '100');
    url.searchParams.set('properties', props);
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) break;

    const data = (await res.json()) as {
      results: Array<{
        properties: Record<string, string | null>;
      }>;
      paging?: { next?: { after: string } };
    };

    for (const r of data.results) {
      const p = r.properties;
      deals.push({
        name: p.dealname ?? '',
        stage: p.dealstage ?? '',
        pipeline: p.pipeline ?? '',
        amount: parseFloat(p.amount ?? '0') || 0,
        createdAt: p.createdate ?? '',
        closedAt: p.closedate ?? undefined,
      });
    }

    after = data.paging?.next?.after;
  } while (after);

  return deals;
}

// ---------------------------------------------------------------------------
// Shopify helpers
// ---------------------------------------------------------------------------

async function fetchShopifyPayments(orgId: string): Promise<FunnelPayment[]> {
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!shopifyDomain || !shopifyToken) return [];

  const payments: FunnelPayment[] = [];
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

    for (const li of order.line_items) {
      const lineType = classifyLineItem(li.title);
      const amount = (parseFloat(li.price) || 0) * li.quantity;

      payments.push({
        customerName: customerName || li.title.split(/\s+(deposit|balance|payment)/i)[0].trim(),
        email,
        amount,
        date: order.created_at,
        lineItemType: lineType,
      });
    }
  }

  return payments;
}

// ---------------------------------------------------------------------------
// GET /api/integrations/funnel
//
// Pulls data from all 4 platforms (Acuity, HubSpot, Monday/Supabase, Shopify)
// and computes the cross-platform bride journey funnel.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    // Fetch data from all sources in parallel
    const hubspotToken = getHubSpotToken();
    const acuityReady = isAcuityConfigured();
    const supabase = await createUntypedServiceClient();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const minDate = sixMonthsAgo.toISOString().split('T')[0];

    const [acuityData, hubspotDeals, mondayOrders, shopifyPayments] = await Promise.all([
      // Acuity consultations
      acuityReady
        ? getAppointments({ minDate, max: 500 })
            .then((appts) =>
              appts.map(
                (a): FunnelConsultation => ({
                  name: `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim(),
                  email: a.email ?? undefined,
                  date: a.datetime ?? a.date ?? '',
                  type: a.type ?? '',
                  price: parseFloat(String(a.price ?? '0')) || 0,
                  paid: String(a.paid) === 'yes' || String(a.paid) === 'true',
                  cancelled: String(a.canceled) === 'true',
                })
              )
            )
            .catch(() => [] as FunnelConsultation[])
        : ([] as FunnelConsultation[]),

      // HubSpot deals
      hubspotToken
        ? fetchHubSpotDeals(hubspotToken).catch(() => [] as FunnelDeal[])
        : ([] as FunnelDeal[]),

      // Monday/Supabase bridal orders
      Promise.resolve(
        supabase
          .from('bridal_orders')
          .select('client_name, email, status, dress_price, total_paid, outstanding_balance, order_date, wedding_date')
          .eq('org_id', orgId)
      )
        .then(({ data }) =>
          ((data ?? []) as Record<string, unknown>[]).map(
            (r): FunnelOrder => ({
              clientName: (r.client_name as string) ?? '',
              email: (r.email as string) ?? undefined,
              status: (r.status as string) ?? 'enquiry',
              dressPrice: Number(r.dress_price) || 0,
              totalPaid: Number(r.total_paid) || 0,
              outstandingBalance: Number(r.outstanding_balance) || 0,
              orderDate: (r.order_date as string) ?? undefined,
              weddingDate: (r.wedding_date as string) ?? undefined,
            })
          )
        )
        .catch(() => [] as FunnelOrder[]),

      // Shopify payments
      fetchShopifyPayments(orgId).catch(() => [] as FunnelPayment[]),
    ]);

    // Run funnel computation
    const summary = computeFunnelSummary(acuityData, hubspotDeals, mondayOrders, shopifyPayments);
    const journeys = computeBrideJourneys(acuityData, hubspotDeals, mondayOrders, shopifyPayments);

    // Source availability
    const sources = {
      acuity: { connected: acuityReady, records: acuityData.length },
      hubspot: { connected: !!hubspotToken, records: hubspotDeals.length },
      monday: { connected: true, records: mondayOrders.length },
      shopify: { connected: !!process.env.SHOPIFY_STORE_DOMAIN, records: shopifyPayments.length },
    };

    return NextResponse.json({
      summary,
      journeys: journeys.slice(0, 100), // Top 100 by value
      sources,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[FUNNEL] Error:', err);
    return NextResponse.json(
      { error: 'Failed to compute funnel metrics' },
      { status: 500 }
    );
  }
}
