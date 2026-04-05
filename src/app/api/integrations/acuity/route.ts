import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import {
  isAcuityConfigured,
  getAppointments,
  getAppointmentTypes,
  getCalendars,
  calculateRevenue,
  calculateUtilisation,
  calculateClientFrequency,
  type SchedulingSummary,
} from '@/lib/integrations/acuity';

const querySchema = z.object({
  minDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  maxDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * GET /api/integrations/acuity
 *
 * Returns appointment summary: upcoming appointments, revenue breakdown,
 * utilisation rate, and client frequency data.
 */
export async function GET(request: Request) {
  try {
    await requireRole('viewer');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isAcuityConfigured()) {
    return NextResponse.json(
      { error: 'Acuity Scheduling is not configured', configured: false },
      { status: 400 }
    );
  }

  // Parse optional query params
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    minDate: url.searchParams.get('minDate') ?? undefined,
    maxDate: url.searchParams.get('maxDate') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Fetch data in parallel
    const [upcoming, allRecent, types, calendars] = await Promise.all([
      // Upcoming appointments (next 30 days)
      getAppointments({
        minDate: parsed.data.minDate ?? todayStr,
        maxDate: parsed.data.maxDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        canceled: false,
        direction: 'ASC',
        max: 50,
      }),
      // Recent appointments for revenue calc (last 60 days)
      getAppointments({
        minDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        maxDate: todayStr,
        direction: 'DESC',
        max: 200,
      }),
      getAppointmentTypes(),
      getCalendars(),
    ]);

    // Calculate metrics
    const revenue = calculateRevenue(allRecent, types);
    const utilisation = await calculateUtilisation(upcoming, types);
    const topClients = calculateClientFrequency([...allRecent, ...upcoming]);

    const summary: SchedulingSummary = {
      upcoming,
      revenue,
      utilisation,
      topClients,
      appointmentTypes: types,
      calendars,
    };

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Acuity data';
    console.error('[Acuity API]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
