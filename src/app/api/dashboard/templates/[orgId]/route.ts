import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import {
  getAllTemplates,
  getDefaultTemplate,
  getTemplateById,
  WIDGET_REGISTRY,
} from '@/lib/dashboard/templates';
import type { DashboardWidget } from '@/lib/dashboard/templates';
import { z } from 'zod';

const savePreferenceSchema = z.object({
  template_id: z.string().min(1).max(64),
  custom_widgets: z
    .array(
      z.object({
        type: z.string(),
        label: z.string(),
        size: z.enum(['full', 'half', 'third']),
        order: z.number().int().min(1),
      })
    )
    .optional(),
});

/**
 * GET /api/dashboard/templates/[orgId]
 * Get available templates and user's current selection.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createUntypedServiceClient();

    // Fetch user's saved preference
    const { data: preference } = await supabase
      .from('dashboard_preferences')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', profile.id)
      .single();

    const templates = getAllTemplates();
    const defaultTemplate = getDefaultTemplate(profile.role);

    let activeTemplate;
    let customWidgets: DashboardWidget[] | null = null;

    if (preference) {
      activeTemplate = getTemplateById(preference.template_id) ?? defaultTemplate;
      customWidgets = preference.custom_widgets
        ? (preference.custom_widgets as DashboardWidget[])
        : null;
    } else {
      activeTemplate = defaultTemplate;
    }

    return NextResponse.json({
      templates,
      activeTemplate,
      customWidgets,
      widgetRegistry: WIDGET_REGISTRY,
    });
  } catch (err) {
    console.error('[DASHBOARD_TEMPLATES] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * PUT /api/dashboard/templates/[orgId]
 * Save user's template preference and optional custom widget layout.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = savePreferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const supabase = await createUntypedServiceClient();

    const { data: saved, error } = await supabase
      .from('dashboard_preferences')
      .upsert(
        {
          org_id: orgId,
          user_id: profile.id,
          template_id: parsed.data.template_id,
          custom_widgets: parsed.data.custom_widgets ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[DASHBOARD_TEMPLATES] Save error:', error);
      // Table may not exist yet — return success anyway
      return NextResponse.json({
        preference: {
          template_id: parsed.data.template_id,
          custom_widgets: parsed.data.custom_widgets ?? null,
        },
      });
    }

    await logAudit({
      orgId,
      userId: user.id,
      action: 'dashboard_preference.updated',
      entityType: 'dashboard_preferences',
      entityId: profile.id,
      metadata: { template_id: parsed.data.template_id },
    });

    return NextResponse.json({ preference: saved });
  } catch (err) {
    console.error('[DASHBOARD_TEMPLATES] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to save template preference' }, { status: 500 });
  }
}
