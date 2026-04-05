import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

const schema = z.object({
  websiteUrl: z.string().optional(),
  businessDescription: z.string().optional(),
});

/**
 * POST /api/onboarding/save-basics
 * Best-effort save of website URL and business description to the organisations table.
 * Called as a fallback when the website scan fails or errors out.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { websiteUrl, businessDescription } = parsed.data;

    if (!websiteUrl && !businessDescription) {
      return NextResponse.json({ success: true }); // nothing to save
    }

    const supabase = await createServiceClient();

    const updatePayload: Record<string, string> = {};
    if (websiteUrl) updatePayload.website_url = websiteUrl;
    if (businessDescription) updatePayload.business_description = businessDescription;

    const { error } = await supabase
      .from('organisations')
      .update(updatePayload)
      .eq('id', profile.org_id);

    if (error) {
      console.error('[ONBOARDING] Failed to save basics:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'onboarding.save_basics',
      entityType: 'organisation',
      entityId: profile.org_id,
      metadata: { websiteUrl: !!websiteUrl, businessDescription: !!businessDescription },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING] save-basics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
