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

const SEED_PLANS: PlannedTrunkShow[] = [
  computePlan({
    id: 'ts-ny-2026',
    city: 'New York',
    country: 'US',
    startDate: '2026-04-15',
    endDate: '2026-04-20',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 5000,
    travelCostEstimate: 3500,
    freelancerCostEstimate: 2500,
    shippingCostEstimate: 1000,
    expectedAppointments: 15,
    conversionRate: 0.8,
    averageDressPrice: 6400,
    status: 'confirmed',
    notes: 'Annual NYC trunk show at The Plaza — flagship event',
  }),
  computePlan({
    id: 'ts-la-2026',
    city: 'Los Angeles',
    country: 'US',
    startDate: '2026-06-10',
    endDate: '2026-06-14',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 4000,
    travelCostEstimate: 3000,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1000,
    expectedAppointments: 10,
    conversionRate: 0.8,
    averageDressPrice: 6400,
    status: 'planned',
    notes: 'West coast expansion — Beverly Hills bridal boutique partnership',
  }),
  computePlan({
    id: 'ts-ldn-2026',
    city: 'London',
    country: 'UK',
    startDate: '2026-09-05',
    endDate: '2026-09-10',
    staffRequired: 3,
    freelancersRequired: 2,
    hotelCostEstimate: 800,
    travelCostEstimate: 200,
    freelancerCostEstimate: 1500,
    shippingCostEstimate: 500,
    expectedAppointments: 20,
    conversionRate: 0.8,
    averageDressPrice: 6400,
    status: 'planned',
    notes: 'London bridal week — home market showcase',
  }),
  computePlan({
    id: 'ts-dxb-2026',
    city: 'Dubai',
    country: 'UAE',
    startDate: '2026-11-12',
    endDate: '2026-11-16',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 6000,
    travelCostEstimate: 4000,
    freelancerCostEstimate: 3000,
    shippingCostEstimate: 2000,
    expectedAppointments: 8,
    conversionRate: 0.8,
    averageDressPrice: 6400,
    status: 'planned',
    notes: 'Premium market — higher-value brides, luxury venue',
  }),
  computePlan({
    id: 'ts-mia-2027',
    city: 'Miami',
    country: 'US',
    startDate: '2027-02-18',
    endDate: '2027-02-22',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 4500,
    travelCostEstimate: 3000,
    freelancerCostEstimate: 2500,
    shippingCostEstimate: 1000,
    expectedAppointments: 12,
    conversionRate: 0.8,
    averageDressPrice: 6400,
    status: 'planned',
    notes: 'South Florida market — strong destination wedding demographic',
  }),
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
    : 0.8; // fallback

  // Average dress price from real orders
  const ordersWithPrice = orders.filter((o) => o.total_price > 0);
  const avgDressPrice = ordersWithPrice.length > 0
    ? ordersWithPrice.reduce((sum, o) => sum + Number(o.total_price), 0) / ordersWithPrice.length
    : 6400; // fallback GBP

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
