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

const SEED_PLANS: PlannedTrunkShow[] = [
  computeDerived({
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
  computeDerived({
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
  computeDerived({
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
  computeDerived({
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
  computeDerived({
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
      averageDressPrice: 6400,
      defaultConversionRate: 0.8,
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
