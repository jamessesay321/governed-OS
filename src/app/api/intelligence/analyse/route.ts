import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getEventById } from '@/lib/intelligence/events';
import { analyseAndStoreImpact } from '@/lib/intelligence/impact-analyser';
import { z } from 'zod';

const analyseSchema = z.object({
  event_id: z.string().uuid(),
  org_name: z.string().min(1),
  sector: z.string().min(1),
  country: z.string().min(1).default('GB'),
  annual_revenue: z.number().int(),
  employee_count: z.number().int().min(0),
  outstanding_debt: z.number().int().min(0).default(0),
});

// POST /api/intelligence/analyse — Trigger impact analysis (advisor+)
export async function POST(request: Request) {
  try {
    const { profile } = await requireRole('advisor');
    const body = await request.json();
    const parsed = analyseSchema.parse(body);

    const event = await getEventById(parsed.event_id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const impact = await analyseAndStoreImpact(event, {
      orgId: profile.org_id,
      orgName: parsed.org_name,
      sector: parsed.sector,
      country: parsed.country,
      annualRevenue: parsed.annual_revenue,
      employeeCount: parsed.employee_count,
      outstandingDebt: parsed.outstanding_debt,
    });

    return NextResponse.json(impact, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[intelligence/analyse] POST error:', e);
    return NextResponse.json({ error: 'Failed to analyse impact' }, { status: 500 });
  }
}
