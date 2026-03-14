import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  loadInterviewMessages,
  extractBusinessProfile,
  storeBusinessProfile,
  getCompletedInterview,
} from '@/lib/interview/engine';
import { logAudit } from '@/lib/audit/log';

type Params = { params: Promise<{ orgId: string }> };

// POST /api/interview/[orgId]/complete — Parse transcript into structured profile
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

    await logAudit({
      orgId,
      userId: user.id,
      action: 'interview.profile_created',
      entityType: 'business_context_profile',
      entityId: storedProfile.id,
      metadata: {
        interviewId,
        hasEdits: !!edits,
      },
    });

    return NextResponse.json({
      profile: storedProfile,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error('Interview complete error:', e);
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
