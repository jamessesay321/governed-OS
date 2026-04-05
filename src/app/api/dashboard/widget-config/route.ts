import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

const widgetConfigSchema = z.object({
  templateName: z.string().max(100).nullable().optional(),
  widgets: z.array(z.string().min(1).max(100)).max(50),
});

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/widget-config                                   */
/*  Fetch the user's saved widget config for their org                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const { user, profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;
    const supabase = await createUntypedServiceClient();

    const { data, error } = await supabase
      .from('dashboard_widget_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[widget-config] GET error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch widget config' }, { status: 500 });
    }

    return NextResponse.json({ config: data ?? null });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[widget-config] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/dashboard/widget-config                                  */
/*  Save widget config (upsert by user_id + org_id)                    */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = widgetConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createUntypedServiceClient();

    // Upsert: insert or update on conflict
    const { data, error } = await supabase
      .from('dashboard_widget_configs')
      .upsert(
        {
          user_id: user.id,
          org_id: orgId,
          template_name: parsed.data.templateName ?? null,
          widgets: parsed.data.widgets,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,org_id',
        },
      )
      .select()
      .single();

    if (error) {
      console.error('[widget-config] POST error:', error.message);
      return NextResponse.json({ error: 'Failed to save widget config' }, { status: 500 });
    }

    await logAudit(
      {
        orgId,
        userId: user.id,
        action: 'dashboard.widget_config_saved',
        entityType: 'dashboard_widget_config',
        entityId: data.id,
        metadata: {
          templateName: parsed.data.templateName,
          widgetCount: parsed.data.widgets.length,
        },
      },
      { critical: false },
    );

    return NextResponse.json({ config: data }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[widget-config] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
