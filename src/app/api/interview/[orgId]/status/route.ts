import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  getOrCreateInterview,
  getCompletedInterview,
  loadInterviewMessages,
  getStageIndex,
  getStageLabels,
} from '@/lib/interview/engine';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/interview/[orgId]/status — Return current interview state
export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    // Verify org membership
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    // Check for completed interview first
    const completed = await getCompletedInterview(orgId);
    if (completed) {
      const messages = await loadInterviewMessages(orgId, completed.id);

      return NextResponse.json({
        status: 'completed',
        interviewId: completed.id,
        currentStage: completed.current_stage,
        stageIndex: getStageLabels().length,
        totalStages: getStageLabels().length,
        stages: getStageLabels(),
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          stage: m.stage,
          created_at: m.created_at,
        })),
        completedAt: completed.completed_at,
      });
    }

    // Check for in-progress interview
    const interview = await getOrCreateInterview(orgId, profile.id);
    const messages = await loadInterviewMessages(orgId, interview.id);

    return NextResponse.json({
      status: interview.status,
      interviewId: interview.id,
      currentStage: interview.current_stage,
      stageIndex: getStageIndex(interview.current_stage),
      totalStages: getStageLabels().length,
      stages: getStageLabels(),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        stage: m.stage,
        created_at: m.created_at,
      })),
      startedAt: interview.started_at,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error('Interview status error:', e);
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
