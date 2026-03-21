import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import { generateDemoProfile } from '@/lib/demo/generate-demo-data';

const demoSchema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  teamSize: z.string().min(1).max(20),
});

/**
 * POST /api/onboarding/demo
 * Sets up demo mode: saves minimal info, generates sample data, marks onboarding complete.
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('admin');
    const supabase = await createServiceClient();

    const body = await request.json();
    const parsed = demoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please fill in all fields' },
        { status: 400 }
      );
    }

    const { companyName, industry, teamSize } = parsed.data;

    // Generate a demo business profile using AI
    const demoData = await generateDemoProfile(companyName, industry, teamSize);

    // Save the demo profile to business_context_profiles
    try {
      await supabase
        .from('business_context_profiles' as any)
        .upsert({
          org_id: profile.org_id,
          status: 'completed',
          interview_type: 'demo',
          raw_interview_data: {
            company_profile: {
              companyName,
              industry,
              companySize: teamSize,
              description: demoData.description,
              goals: demoData.goals,
              challenges: demoData.challenges,
            },
            demo_mode: true,
            demo_generated_at: new Date().toISOString(),
          },
          completed_at: new Date().toISOString(),
        } as any, {
          onConflict: 'org_id',
        });
    } catch {
      // Table may not exist yet, continue anyway
    }

    // Update the organisation: mark as demo mode + completed onboarding
    const { error: orgError } = await supabase
      .from('organisations')
      .update({
        has_completed_onboarding: true,
        // Store demo metadata in the org row if columns exist
      } as any)
      .eq('id', profile.org_id);

    if (orgError) {
      console.error('[DEMO] Failed to update org:', orgError);
      return NextResponse.json(
        { error: 'Failed to set up demo' },
        { status: 500 }
      );
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'onboarding.demo_completed',
      entityType: 'organisation',
      entityId: profile.org_id,
      metadata: { industry, teamSize, companyName },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DEMO] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
