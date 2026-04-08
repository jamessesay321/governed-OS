import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

const widgetEntrySchema = z.object({
  type: z.string().min(1).max(100),
  visible: z.boolean(),
  order: z.number().int().min(0).max(100),
});

const saveWidgetsSchema = z.object({
  widgets: z.array(widgetEntrySchema).min(1).max(50),
});

export type WidgetEntry = z.infer<typeof widgetEntrySchema>;

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/widgets                                        */
/*  Fetch the user's saved widget configuration                       */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const { user, profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;
    const supabase = await createUntypedServiceClient();

    // Try dashboard_preferences first (custom_widgets JSONB)
    try {
      const { data: prefData, error: prefError } = await supabase
        .from('dashboard_preferences')
        .select('custom_widgets, template_id')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .maybeSingle();

      if (!prefError && prefData?.custom_widgets && Array.isArray(prefData.custom_widgets)) {
        const items = prefData.custom_widgets as unknown[];
        const first = items[0] as Record<string, unknown> | undefined;
        if (first && 'visible' in first && 'order' in first) {
          return NextResponse.json({
            widgets: prefData.custom_widgets as WidgetEntry[],
            templateId: prefData.template_id ?? null,
          });
        }
      }
    } catch {
      // Table may not exist yet — continue to fallback
    }

    // Fallback to dashboard_widget_configs table
    try {
      const { data: configData, error: configError } = await supabase
        .from('dashboard_widget_configs')
        .select('widgets, template_name')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .maybeSingle();

      if (!configError && configData?.widgets && Array.isArray(configData.widgets)) {
        const items = configData.widgets as unknown[];
        const first = items[0] as Record<string, unknown> | undefined;
        if (first && 'visible' in first && 'order' in first) {
          return NextResponse.json({
            widgets: configData.widgets as WidgetEntry[],
            templateId: configData.template_name ?? null,
          });
        }
      }
    } catch {
      // Table may not exist yet
    }

    // No saved config found — return null so client uses defaults
    return NextResponse.json({ widgets: null, templateId: null });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[dashboard/widgets] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/dashboard/widgets                                       */
/*  Save widget order + visibility                                    */
/*  Body: { widgets: Array<{ type: string; visible: boolean; order: number }> } */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = saveWidgetsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createUntypedServiceClient();
    let savedSuccessfully = false;

    // Save to dashboard_preferences.custom_widgets (primary storage)
    try {
      const { error: prefError } = await supabase
        .from('dashboard_preferences')
        .upsert(
          {
            user_id: user.id,
            org_id: orgId,
            template_id: 'custom',
            custom_widgets: parsed.data.widgets,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'org_id,user_id' },
        );

      if (!prefError) {
        savedSuccessfully = true;
      } else {
        console.error('[dashboard/widgets] POST pref error:', prefError.message);
      }
    } catch {
      // Table may not exist
    }

    // Also save to dashboard_widget_configs for backward compatibility
    try {
      const { error: configError } = await supabase
        .from('dashboard_widget_configs')
        .upsert(
          {
            user_id: user.id,
            org_id: orgId,
            template_name: 'custom',
            widgets: parsed.data.widgets,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,org_id' },
        );

      if (!configError) {
        savedSuccessfully = true;
      } else {
        console.error('[dashboard/widgets] POST config error:', configError.message);
      }
    } catch {
      // Table may not exist
    }

    if (!savedSuccessfully) {
      return NextResponse.json(
        { error: 'Failed to save widget configuration' },
        { status: 500 },
      );
    }

    await logAudit(
      {
        orgId,
        userId: user.id,
        action: 'dashboard.widgets_saved',
        entityType: 'dashboard_widget_config',
        entityId: user.id,
        metadata: {
          widgetCount: parsed.data.widgets.length,
          visibleCount: parsed.data.widgets.filter((w) => w.visible).length,
        },
      },
      { critical: false },
    );

    return NextResponse.json({ success: true, widgets: parsed.data.widgets });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[dashboard/widgets] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
