import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  loadInterviewMessages,
  extractBusinessProfile,
  storeBusinessProfile,
} from '@/lib/interview/engine';
import { generateRecommendations } from '@/lib/interview/recommendations';
import { logAudit } from '@/lib/audit/log';
import { autoStoreToVault } from '@/lib/vault/auto-store';

type Params = { params: Promise<{ orgId: string }> };

// POST /api/interview/[orgId]/complete — Parse transcript into structured profile + generate recommendations
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('viewer');

    // Verify org membership
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const body = await request.json();
    const { interviewId, edits } = body as {
      interviewId: string;
      edits?: Record<string, unknown>;
    };

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    // Load all messages for the transcript
    const messages = await loadInterviewMessages(orgId, interviewId);

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No interview messages found' }, { status: 400 });
    }

    // Extract structured profile from transcript
    let extractedProfile = await extractBusinessProfile(
      messages.map((m) => ({ role: m.role, content: m.content }))
    );

    // Apply user edits if provided
    if (edits && typeof edits === 'object') {
      extractedProfile = { ...extractedProfile, ...edits };
    }

    // Store the profile
    const storedProfile = await storeBusinessProfile(orgId, interviewId, extractedProfile);

    // Generate auto-suggested KPIs, dashboard layout, and playbook modules
    const recommendations = await generateRecommendations(extractedProfile);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'interview.profile_created',
      entityType: 'business_context_profile',
      entityId: storedProfile.id,
      metadata: {
        interviewId,
        hasEdits: !!edits,
        recommendedKPIs: recommendations.kpis.length,
        recommendedTemplate: recommendations.dashboard.template_id,
        recommendedModules: recommendations.playbook_modules.map((m) => m.module_slug),
      },
    });

    // Auto-store interview transcript to Knowledge Vault (best-effort)
    autoStoreToVault({
      orgId,
      userId: user.id,
      itemType: 'interview_transcript',
      title: `Business Profile Interview`,
      description: `AI interview with ${messages.length} messages — profile extracted`,
      tags: ['interview', 'business-profile', 'auto-generated'],
      content: {
        interviewId,
        messageCount: messages.length,
        profile: storedProfile,
        recommendations,
      },
      provenance: {
        source_entity_type: 'interview',
        source_entity_id: interviewId,
      },
      sourceEntityType: 'interview',
      sourceEntityId: storedProfile.id,
    });

    return NextResponse.json({
      profile: storedProfile,
      recommendations,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[interview/complete] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
