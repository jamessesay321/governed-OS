import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import {
  isAcuityConfigured,
  getAppointments,
  getAppointmentTypes,
} from '@/lib/integrations/acuity';
import { computeAllMetrics } from '@/lib/integrations/acuity-metrics';

const querySchema = z.object({
  /** Restrict appointments to those on or after this date (YYYY-MM-DD). */
  minDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Restrict appointments to those on or before this date (YYYY-MM-DD). */
  maxDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Maximum number of appointments to fetch (default 500). */
  limit: z.coerce.number().min(1).max(1000).optional().default(500),
});

/**
 * GET /api/integrations/acuity/metrics
 *
 * Fetches appointments and types from Acuity Scheduling, runs the pure
 * computation functions from acuity-metrics.ts, and returns pre-computed
 * scheduling metrics.
 *
 * Query params:
 *   - minDate  (optional) — YYYY-MM-DD, fetch appointments >= this date
 *   - maxDate  (optional) — YYYY-MM-DD, fetch appointments <= this date
 *   - limit    (optional) — max appointments to fetch (default 500, max 1000)
 *
 * Returns: AcuityMetricsSummary
 */
export async function GET(request: NextRequest) {
  // ---- Auth ----
  try {
    await requireRole('viewer');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ---- Check Acuity is configured ----
  if (!isAcuityConfigured()) {
    return NextResponse.json(
      { configured: false, error: 'Acuity Scheduling is not configured' },
      { status: 200 }
    );
  }

  // ---- Query param validation ----
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    minDate: url.searchParams.get('minDate') ?? undefined,
    maxDate: url.searchParams.get('maxDate') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { minDate, maxDate, limit } = parsed.data;

  try {
    // Default date range: last 180 days to 30 days ahead
    const now = new Date();
    const defaultMinDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const defaultMaxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // ---- Fetch data from Acuity API in parallel ----
    const [appointments, types] = await Promise.all([
      getAppointments({
        minDate: minDate ?? defaultMinDate,
        maxDate: maxDate ?? defaultMaxDate,
        direction: 'DESC',
        max: limit,
      }),
      getAppointmentTypes(),
    ]);

    // ---- Run pure computation layer ----
    const metrics = computeAllMetrics(appointments, types, now);

    return NextResponse.json({
      configured: true,
      ...metrics,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to compute Acuity metrics';
    console.error('[ACUITY METRICS]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
