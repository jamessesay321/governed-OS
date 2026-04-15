import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { logAudit } from '@/lib/audit/log';
import type { PlannedTrunkShow, TrunkShowPlannerData } from '@/types/trunk-show-planner';

/* ================================================================== */
/*  Zod Schemas                                                        */
/* ================================================================== */

const trunkShowPlanSchema = z.object({
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffRequired: z.number().int().min(0).max(50),
  freelancersRequired: z.number().int().min(0).max(50),
  hotelCostEstimate: z.number().min(0),
  travelCostEstimate: z.number().min(0),
  freelancerCostEstimate: z.number().min(0),
  shippingCostEstimate: z.number().min(0),
  expectedAppointments: z.number().int().min(0),
  conversionRate: z.number().min(0).max(1),
  averageDressPrice: z.number().min(0),
  status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']),
  notes: z.string().max(1000).optional(),
});

/* ================================================================== */
/*  Seed Data — Alonuko trunk shows                                    */
/* ================================================================== */

function computeDerived(
  plan: Omit<PlannedTrunkShow, 'expectedRevenue' | 'totalCost' | 'roi' | 'id'> & { id?: string }
): PlannedTrunkShow {
  const totalCost =
    plan.hotelCostEstimate +
    plan.travelCostEstimate +
    plan.freelancerCostEstimate +
    plan.shippingCostEstimate;
  const expectedBookings = Math.round(plan.expectedAppointments * plan.conversionRate);
  const expectedRevenue = expectedBookings * plan.averageDressPrice;
  const roi = expectedRevenue - totalCost;

  return {
    ...plan,
    id: plan.id ?? crypto.randomUUID(),
    totalCost,
    expectedRevenue,
    roi,
  } as PlannedTrunkShow;
}

/**
 * 2026 Trunk Show Schedule — aligned with Alonuko Strategic Plan
 *
 * Priority markets: Houston (warm market), New York (flagship), Atlanta
 * Revenue-per-show targets ramp across the year:
 *   Jan-May: ~£40K  |  Jun-Jul: ~£70K  |  Aug-Sep: ~£100K  |  Oct-Dec: ~£130K
 *
 * Average dress price: £7,000 (per draft accounts: £1.43M / ~205 orders)
 * Conversion rate: 65% (strategic plan baseline — trunk shows are curated
 *   appointments, not walk-in, but 80% was over-optimistic)
 * Cost per show: ~£10,000 average (flights, hotel, freelancer, shipping)
 *
 * 12 shows planned for 2026 = £930K projected revenue
 */
const SEED_PLANS: PlannedTrunkShow[] = [
  // ── Q1: Ramp-up phase (£40K target per show) ──
  computeDerived({
    id: 'ts-hou-jan-2026',
    city: 'Houston',
    country: 'US',
    startDate: '2026-01-17',
    endDate: '2026-01-21',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 3500,
    travelCostEstimate: 3000,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1500,
    expectedAppointments: 10,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'completed',
    notes: 'Houston is the warm market — strong existing client base. Google Ads campaign running £500-800/mo in Houston area.',
  }),
  computeDerived({
    id: 'ts-ny-feb-2026',
    city: 'New York',
    country: 'US',
    startDate: '2026-02-14',
    endDate: '2026-02-19',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 5000,
    travelCostEstimate: 3500,
    freelancerCostEstimate: 2500,
    shippingCostEstimate: 1500,
    expectedAppointments: 12,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'completed',
    notes: 'NYC flagship — targeting boutique partnerships (Lovely Bride, Designer Loft). Valentine\'s weekend timing for engagement season.',
  }),
  computeDerived({
    id: 'ts-atl-mar-2026',
    city: 'Atlanta',
    country: 'US',
    startDate: '2026-03-14',
    endDate: '2026-03-18',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 3000,
    travelCostEstimate: 2800,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1500,
    expectedAppointments: 10,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'confirmed',
    notes: 'Atlanta — new market entry. Google Ads campaign running £500-800/mo. Strong destination wedding demographic.',
  }),
  // ── Q2: Building momentum (£40K → £70K target) ──
  computeDerived({
    id: 'ts-hou-may-2026',
    city: 'Houston',
    country: 'US',
    startDate: '2026-05-09',
    endDate: '2026-05-13',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 3500,
    travelCostEstimate: 3000,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1500,
    expectedAppointments: 12,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'Houston return visit — repeat clients + referrals from Jan show. Pre-Civil Ceremony collection launch.',
  }),
  computeDerived({
    id: 'ts-ny-jun-2026',
    city: 'New York',
    country: 'US',
    startDate: '2026-06-20',
    endDate: '2026-06-25',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 5000,
    travelCostEstimate: 3500,
    freelancerCostEstimate: 2500,
    shippingCostEstimate: 1500,
    expectedAppointments: 15,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'Civil Ceremony collection debut (mid-June launch, £1,500-£3,000 range). Targeting £70K+ revenue.',
  }),
  computeDerived({
    id: 'ts-ldn-jul-2026',
    city: 'London',
    country: 'UK',
    startDate: '2026-07-11',
    endDate: '2026-07-15',
    staffRequired: 3,
    freelancersRequired: 1,
    hotelCostEstimate: 0,
    travelCostEstimate: 500,
    freelancerCostEstimate: 1500,
    shippingCostEstimate: 500,
    expectedAppointments: 18,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'Home market showcase — Civil Ceremony collection. Low cost (no hotel/flights). Mailing list: 7,000 subscribers for marketing push.',
  }),
  // ── Q3: Peak season (£100K target per show) ──
  computeDerived({
    id: 'ts-atl-aug-2026',
    city: 'Atlanta',
    country: 'US',
    startDate: '2026-08-08',
    endDate: '2026-08-12',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 3000,
    travelCostEstimate: 2800,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1500,
    expectedAppointments: 18,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'Atlanta return — All-Black collection debut (mid-August launch, £800-£2,000). Building repeat market. £100K target.',
  }),
  computeDerived({
    id: 'ts-hou-sep-2026',
    city: 'Houston',
    country: 'US',
    startDate: '2026-09-12',
    endDate: '2026-09-16',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 3500,
    travelCostEstimate: 3000,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1500,
    expectedAppointments: 18,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'Houston Q3 — autumn wedding season. Mature market with referral pipeline. Full collection including All-Black.',
  }),
  computeDerived({
    id: 'ts-ny-sep-2026',
    city: 'New York',
    country: 'US',
    startDate: '2026-09-26',
    endDate: '2026-10-01',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 5000,
    travelCostEstimate: 3500,
    freelancerCostEstimate: 2500,
    shippingCostEstimate: 1500,
    expectedAppointments: 20,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'NYC autumn — biggest show of the year. US wholesale pathway: Kleinfeld preparation for 2027.',
  }),
  // ── Q4: Peak performance (£130K target per show) ──
  computeDerived({
    id: 'ts-hou-oct-2026',
    city: 'Houston',
    country: 'US',
    startDate: '2026-10-24',
    endDate: '2026-10-28',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 3500,
    travelCostEstimate: 3000,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1500,
    expectedAppointments: 22,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'Mainline Bridal collection debut (mid-October launch). Full 3-collection offering. £130K target.',
  }),
  computeDerived({
    id: 'ts-atl-nov-2026',
    city: 'Atlanta',
    country: 'US',
    startDate: '2026-11-14',
    endDate: '2026-11-18',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 3000,
    travelCostEstimate: 2800,
    freelancerCostEstimate: 2000,
    shippingCostEstimate: 1500,
    expectedAppointments: 22,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'Atlanta year-end — engagement season. Full collection with holiday campaign. £130K target.',
  }),
  computeDerived({
    id: 'ts-ny-dec-2026',
    city: 'New York',
    country: 'US',
    startDate: '2026-12-05',
    endDate: '2026-12-10',
    staffRequired: 2,
    freelancersRequired: 1,
    hotelCostEstimate: 5000,
    travelCostEstimate: 3500,
    freelancerCostEstimate: 2500,
    shippingCostEstimate: 1500,
    expectedAppointments: 22,
    conversionRate: 0.65,
    averageDressPrice: 7000,
    status: 'planned',
    notes: 'NYC year-end flagship — December engagement season peak. Full 3-collection showcase. £130K target.',
  }),
];

/* ================================================================== */
/*  GET /api/trunk-shows/plan — Fetch all planned trunk shows          */
/* ================================================================== */

export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const _orgId = profile.org_id as string;

    // MVP: return seed data. Persistence via trunk_show_plans table later.
    const data: TrunkShowPlannerData = {
      plans: SEED_PLANS,
      historicalSpend: {},
      averageDressPrice: 7000,
      defaultConversionRate: 0.65,
    };

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[trunk-shows/plan] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ================================================================== */
/*  POST /api/trunk-shows/plan — Create a new trunk show plan          */
/* ================================================================== */

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = trunkShowPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const plan = computeDerived({
      ...parsed.data,
      id: crypto.randomUUID(),
    });

    // Audit log the creation
    await logAudit({
      orgId,
      userId: user.id,
      action: 'trunk_show_plan.create',
      entityType: 'trunk_show_plan',
      entityId: plan.id,
      changes: {
        city: plan.city,
        country: plan.country,
        startDate: plan.startDate,
        endDate: plan.endDate,
        totalCost: plan.totalCost,
        expectedRevenue: plan.expectedRevenue,
        status: plan.status,
      },
    });

    // MVP: return the computed plan. Persistence later.
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[trunk-shows/plan] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
