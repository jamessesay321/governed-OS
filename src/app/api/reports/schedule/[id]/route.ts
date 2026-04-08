import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

const REPORT_TYPES = [
  'executive_summary',
  'kpi_dashboard',
  'cash_flow',
  'income_statement',
  'balance_sheet',
  'variance',
  'board_pack',
  'daily_briefing',
] as const;

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

const updateScheduleSchema = z.object({
  report_type: z.enum(REPORT_TYPES).optional(),
  frequency: z.enum(FREQUENCIES).optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(28).nullable().optional(),
  time_of_day: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM in 24h format')
    .optional(),
  recipients: z.array(z.string().email()).min(1).optional(),
  subject_template: z.string().max(200).nullable().optional(),
  include_ai_summary: z.boolean().optional(),
  include_attachments: z.boolean().optional(),
  active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

/* ------------------------------------------------------------------ */
/*  Helper: compute next send timestamp                                */
/* ------------------------------------------------------------------ */

function computeNextSendAt(
  frequency: string,
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined,
  timeOfDay: string,
): string {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(':').map(Number);

  if (frequency === 'daily') {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (frequency === 'weekly' && dayOfWeek != null) {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    const currentDay = next.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
    return next.toISOString();
  }

  if (frequency === 'monthly' && dayOfMonth != null) {
    const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return next.toISOString();
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback.toISOString();
}

/* ------------------------------------------------------------------ */
/*  PUT /api/reports/schedule/[id]                                     */
/*  Update a scheduled report                                          */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;
    const body = await req.json();
    const parsed = updateScheduleSchema.parse(body);

    if (Object.keys(parsed).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = await createUntypedServiceClient();

    // If frequency/time fields changed, recompute next_send_at
    const updatePayload: Record<string, unknown> = {
      ...parsed,
      updated_at: new Date().toISOString(),
    };

    if (parsed.frequency || parsed.day_of_week !== undefined || parsed.day_of_month !== undefined || parsed.time_of_day) {
      // Fetch existing to merge with new values
      const { data: existing } = await supabase
        .from('scheduled_reports')
        .select('frequency, day_of_week, day_of_month, time_of_day')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (existing) {
        const freq = parsed.frequency ?? existing.frequency;
        const dow = parsed.day_of_week !== undefined ? parsed.day_of_week : existing.day_of_week;
        const dom = parsed.day_of_month !== undefined ? parsed.day_of_month : existing.day_of_month;
        const tod = parsed.time_of_day ?? existing.time_of_day;

        updatePayload.next_send_at = computeNextSendAt(freq, dow, dom, tod);
      }
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'scheduled_report_updated',
      entityType: 'scheduled_report',
      entityId: id,
      changes: parsed as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ schedule: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/reports/schedule/[id]                                   */
/*  Soft-delete: set active=false                                      */
/* ------------------------------------------------------------------ */

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'scheduled_report_deactivated',
      entityType: 'scheduled_report',
      entityId: id,
    });

    return NextResponse.json({ schedule: data });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
