import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const prefsSchema = z.object({
  language: z.string().min(2).max(5).default('en'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  numberFormat: z.enum(['comma-period', 'period-comma', 'space-comma']).default('comma-period'),
  timezone: z.string().min(1).max(50).default('Europe/London'),
  emailWeeklySummary: z.boolean().default(true),
  emailAgentReports: z.boolean().default(true),
  emailKpiAlerts: z.boolean().default(true),
  emailBillingReminders: z.boolean().default(false),
  emailProductUpdates: z.boolean().default(false),
});

/**
 * GET /api/preferences — Get current user's preferences
 */
export async function GET() {
  try {
    const { user, profile } = await requireRole('viewer');
    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !data) {
      // Return defaults if no prefs saved yet
      return NextResponse.json({
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'comma-period',
        timezone: 'Europe/London',
        emailWeeklySummary: true,
        emailAgentReports: true,
        emailKpiAlerts: true,
        emailBillingReminders: false,
        emailProductUpdates: false,
      });
    }

    return NextResponse.json({
      language: data.language,
      dateFormat: data.date_format,
      numberFormat: data.number_format,
      timezone: data.timezone,
      emailWeeklySummary: data.email_weekly_summary,
      emailAgentReports: data.email_agent_reports,
      emailKpiAlerts: data.email_kpi_alerts,
      emailBillingReminders: data.email_billing_reminders,
      emailProductUpdates: data.email_product_updates,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[preferences] GET error:', err);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

/**
 * PUT /api/preferences — Save user preferences (upsert)
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('viewer');

    const body = await request.json();
    const parsed = prefsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createUntypedServiceClient();
    const orgId = profile.org_id as string;

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          org_id: orgId,
          language: parsed.data.language,
          date_format: parsed.data.dateFormat,
          number_format: parsed.data.numberFormat,
          timezone: parsed.data.timezone,
          email_weekly_summary: parsed.data.emailWeeklySummary,
          email_agent_reports: parsed.data.emailAgentReports,
          email_kpi_alerts: parsed.data.emailKpiAlerts,
          email_billing_reminders: parsed.data.emailBillingReminders,
          email_product_updates: parsed.data.emailProductUpdates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,org_id' }
      );

    if (error) {
      console.error('[preferences] PUT error:', error.message);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'preferences.updated',
      entityType: 'user_preferences',
      entityId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[preferences] PUT error:', err);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
