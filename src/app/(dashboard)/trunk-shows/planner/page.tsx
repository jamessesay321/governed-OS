import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { PlannerClient } from './planner-client';
import type { PlannedTrunkShow } from '@/types/trunk-show-planner';

/* ================================================================== */
/*  Account Code Mapping (570-574 = trunk show spend)                  */
/* ================================================================== */

const TRUNK_SHOW_CODES: Record<string, string> = {
  '570': 'Travel',
  '571': 'Food & Drink',
  '572': 'Purchases',
  '573': 'Freelance Workers',
  '574': 'Shipping',
};

/* ================================================================== */
/*  Seed Data — realistic Alonuko trunk shows                          */
/* ================================================================== */

function computePlan(
  partial: Omit<PlannedTrunkShow, 'expectedRevenue' | 'totalCost' | 'roi'> & {
    hotelCostEstimate: number;
    travelCostEstimate: number;
    freelancerCostEstimate: number;
    shippingCostEstimate: number;
    expectedAppointments: number;
    conversionRate: number;
    averageDressPrice: number;
  },
): PlannedTrunkShow {
  const totalCost =
    partial.hotelCostEstimate +
    partial.travelCostEstimate +
    partial.freelancerCostEstimate +
    partial.shippingCostEstimate;
  const expectedBookings = Math.round(partial.expectedAppointments * partial.conversionRate);
  const expectedRevenue = expectedBookings * partial.averageDressPrice;
  const roi = expectedRevenue - totalCost;

  return { ...partial, totalCost, expectedRevenue, roi };
}

/**
 * 2026 Trunk Show Schedule — aligned with Alonuko Strategic Plan
 * Priority markets: Houston (warm), New York (flagship), Atlanta (new)
 * 12 shows, revenue ramp: £40K → £70K → £100K → £130K per show
 * Avg dress price: £7,000 | Conversion: 65% | Cost: ~£10K/show
 */
const SEED_PLANS: PlannedTrunkShow[] = [
  // Q1: Ramp-up (£40K target)
  computePlan({ id: 'ts-hou-jan-2026', city: 'Houston', country: 'US', startDate: '2026-01-17', endDate: '2026-01-21', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 3500, travelCostEstimate: 3000, freelancerCostEstimate: 2000, shippingCostEstimate: 1500, expectedAppointments: 10, conversionRate: 0.65, averageDressPrice: 7000, status: 'completed', notes: 'Houston warm market — strong existing client base. Google Ads £500-800/mo.' }),
  computePlan({ id: 'ts-ny-feb-2026', city: 'New York', country: 'US', startDate: '2026-02-14', endDate: '2026-02-19', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 5000, travelCostEstimate: 3500, freelancerCostEstimate: 2500, shippingCostEstimate: 1500, expectedAppointments: 12, conversionRate: 0.65, averageDressPrice: 7000, status: 'completed', notes: 'NYC flagship — boutique partnerships (Lovely Bride, Designer Loft). Valentine\'s engagement season.' }),
  computePlan({ id: 'ts-atl-mar-2026', city: 'Atlanta', country: 'US', startDate: '2026-03-14', endDate: '2026-03-18', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 3000, travelCostEstimate: 2800, freelancerCostEstimate: 2000, shippingCostEstimate: 1500, expectedAppointments: 10, conversionRate: 0.65, averageDressPrice: 7000, status: 'confirmed', notes: 'Atlanta new market. Google Ads running. Destination wedding demographic.' }),
  // Q2: Building (£40K → £70K)
  computePlan({ id: 'ts-hou-may-2026', city: 'Houston', country: 'US', startDate: '2026-05-09', endDate: '2026-05-13', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 3500, travelCostEstimate: 3000, freelancerCostEstimate: 2000, shippingCostEstimate: 1500, expectedAppointments: 12, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'Houston return — referrals from Jan. Pre-Civil Ceremony launch.' }),
  computePlan({ id: 'ts-ny-jun-2026', city: 'New York', country: 'US', startDate: '2026-06-20', endDate: '2026-06-25', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 5000, travelCostEstimate: 3500, freelancerCostEstimate: 2500, shippingCostEstimate: 1500, expectedAppointments: 15, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'Civil Ceremony collection debut (£1,500-£3,000 range). £70K target.' }),
  computePlan({ id: 'ts-ldn-jul-2026', city: 'London', country: 'UK', startDate: '2026-07-11', endDate: '2026-07-15', staffRequired: 3, freelancersRequired: 1, hotelCostEstimate: 0, travelCostEstimate: 500, freelancerCostEstimate: 1500, shippingCostEstimate: 500, expectedAppointments: 18, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'Home market — Civil Ceremony collection. Low cost. 7,000 mailing list.' }),
  // Q3: Peak (£100K target)
  computePlan({ id: 'ts-atl-aug-2026', city: 'Atlanta', country: 'US', startDate: '2026-08-08', endDate: '2026-08-12', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 3000, travelCostEstimate: 2800, freelancerCostEstimate: 2000, shippingCostEstimate: 1500, expectedAppointments: 18, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'Atlanta return — All-Black collection debut (£800-£2,000). £100K target.' }),
  computePlan({ id: 'ts-hou-sep-2026', city: 'Houston', country: 'US', startDate: '2026-09-12', endDate: '2026-09-16', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 3500, travelCostEstimate: 3000, freelancerCostEstimate: 2000, shippingCostEstimate: 1500, expectedAppointments: 18, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'Houston Q3 — autumn season. Mature referral pipeline. Full collection.' }),
  computePlan({ id: 'ts-ny-sep-2026', city: 'New York', country: 'US', startDate: '2026-09-26', endDate: '2026-10-01', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 5000, travelCostEstimate: 3500, freelancerCostEstimate: 2500, shippingCostEstimate: 1500, expectedAppointments: 20, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'NYC autumn — biggest show. Kleinfeld pathway for 2027.' }),
  // Q4: Peak performance (£130K target)
  computePlan({ id: 'ts-hou-oct-2026', city: 'Houston', country: 'US', startDate: '2026-10-24', endDate: '2026-10-28', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 3500, travelCostEstimate: 3000, freelancerCostEstimate: 2000, shippingCostEstimate: 1500, expectedAppointments: 22, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'Mainline Bridal debut (Oct launch). Full 3-collection offering. £130K target.' }),
  computePlan({ id: 'ts-atl-nov-2026', city: 'Atlanta', country: 'US', startDate: '2026-11-14', endDate: '2026-11-18', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 3000, travelCostEstimate: 2800, freelancerCostEstimate: 2000, shippingCostEstimate: 1500, expectedAppointments: 22, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'Atlanta year-end — engagement season. Full collection. £130K target.' }),
  computePlan({ id: 'ts-ny-dec-2026', city: 'New York', country: 'US', startDate: '2026-12-05', endDate: '2026-12-10', staffRequired: 2, freelancersRequired: 1, hotelCostEstimate: 5000, travelCostEstimate: 3500, freelancerCostEstimate: 2500, shippingCostEstimate: 1500, expectedAppointments: 22, conversionRate: 0.65, averageDressPrice: 7000, status: 'planned', notes: 'NYC December peak — engagement season. 3-collection showcase. £130K target.' }),
];

/* ================================================================== */
/*  Helper                                                              */
/* ================================================================== */

function monthLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/* ================================================================== */
/*  Server Page                                                        */
/* ================================================================== */

export default async function TrunkShowPlannerPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  const trunkCodes = Object.keys(TRUNK_SHOW_CODES);

  // ── Fetch chart_of_accounts for trunk show codes ──
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class')
    .eq('org_id', orgId)
    .in('code', trunkCodes);

  const accounts = (coaData ?? []) as unknown as Array<{
    id: string; name: string; code: string; class: string;
  }>;

  const accountIds = accounts.map((a) => a.id);
  const idToCode = new Map(accounts.map((a) => [a.id, a.code]));

  // ── Fetch normalised_financials for trunk show accounts ──
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', accountIds)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string; amount: number; account_id: string;
  }>;

  // ── Aggregate historical spend by period ──
  const historicalSpendByMonth: Record<string, number> = {};
  for (const row of rows) {
    const code = idToCode.get(row.account_id);
    if (!code) continue;
    const period = row.period.slice(0, 7); // YYYY-MM
    historicalSpendByMonth[period] = (historicalSpendByMonth[period] ?? 0) + Number(row.amount);
  }

  // ── Fetch bridal orders for enquiry/booking data ──
  const { data: bridalOrders } = await supabase
    .from('bridal_orders')
    .select('id, status, order_date, total_price, source')
    .eq('org_id', orgId)
    .order('order_date', { ascending: false })
    .limit(200);

  const orders = (bridalOrders ?? []) as unknown as Array<{
    id: string; status: string; order_date: string; total_price: number; source: string;
  }>;

  // Calculate enquiry-to-booking conversion from actual data
  const totalEnquiries = orders.length;
  const confirmedOrders = orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'completed' || o.status === 'in_progress',
  ).length;
  const actualConversionRate = totalEnquiries > 0
    ? confirmedOrders / totalEnquiries
    : 0.65; // fallback — 65% per strategic plan

  // Average dress price from real orders
  const ordersWithPrice = orders.filter((o) => o.total_price > 0);
  const avgDressPrice = ordersWithPrice.length > 0
    ? ordersWithPrice.reduce((sum, o) => sum + Number(o.total_price), 0) / ordersWithPrice.length
    : 7000; // fallback — £7K per draft accounts (£1.43M / ~205 orders)

  // ── Fetch org config ──
  const { data: orgData } = await supabase
    .from('organisations')
    .select('id, name')
    .eq('id', orgId)
    .single();

  const orgName = (orgData as Record<string, unknown> | null)?.name as string ?? 'Organisation';

  // ── Build period labels for historical chart ──
  const historicalPeriods = Object.keys(historicalSpendByMonth).sort().slice(-12);
  const historicalChartData = historicalPeriods.map((period) => ({
    month: monthLabel(period + '-01'),
    spend: Math.round(historicalSpendByMonth[period] ?? 0),
  }));

  return (
    <PlannerClient
      plans={SEED_PLANS}
      historicalSpend={historicalChartData}
      historicalSpendByMonth={historicalSpendByMonth}
      actualConversionRate={Math.round(actualConversionRate * 100) / 100}
      averageDressPrice={Math.round(avgDressPrice)}
      orgName={orgName}
      totalEnquiries={totalEnquiries}
      confirmedOrders={confirmedOrders}
    />
  );
}
