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

const createScheduleSchema = z.object({
  report_type: z.enum(REPORT_TYPES),
  frequency: z.enum(FREQUENCIES).default('weekly'),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(28).nullable().optional(),
  time_of_day: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM in 24h format')
    .default('08:00'),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient required'),
  subject_template: z.string().max(200).nullable().optional(),
  include_ai_summary: z.boolean().default(true),
  include_attachments: z.boolean().default(true),
});

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

  // Fallback: tomorrow at the given time
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback.toISOString();
}

/* ------------------------------------------------------------------ */
/*  GET /api/reports/schedule                                          */
/*  List scheduled reports for the user's org                          */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const { user, profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;
    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedules: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/reports/schedule                                         */
/*  Create a new scheduled report                                      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;
    const body = await req.json();
    const parsed = createScheduleSchema.parse(body);

    const supabase = await createUntypedServiceClient();

    const nextSendAt = computeNextSendAt(
      parsed.frequency,
      parsed.day_of_week,
      parsed.day_of_month,
      parsed.time_of_day,
    );

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        org_id: orgId,
        created_by: user.id,
        report_type: parsed.report_type,
        frequency: parsed.frequency,
        day_of_week: parsed.day_of_week ?? null,
        day_of_month: parsed.day_of_month ?? null,
        time_of_day: parsed.time_of_day,
        recipients: parsed.recipients,
        subject_template: parsed.subject_template ?? null,
        include_ai_summary: parsed.include_ai_summary,
        include_attachments: parsed.include_attachments,
        active: true,
        next_send_at: nextSendAt,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'scheduled_report_created',
      entityType: 'scheduled_report',
      entityId: data.id,
      changes: {
        report_type: parsed.report_type,
        frequency: parsed.frequency,
        recipients: parsed.recipients,
      },
    });

    return NextResponse.json({ schedule: data }, { status: 201 });
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
