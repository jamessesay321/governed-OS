import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  getOrCreateInterview,
  loadInterviewMessages,
  loadFinancialContext,
  processInterviewMessage,
  generateOpeningMessage,
  skipStage,
  getStageIndex,
  getStageLabels,
} from '@/lib/interview/engine';
import { logAudit } from '@/lib/audit/log';
import type { InterviewStage } from '@/types';

type Params = { params: Promise<{ orgId: string }> };

// POST /api/interview/[orgId]/message — Send a message in the interview
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('viewer');

    // Verify org membership
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const body = await request.json();
    const { message, action, currentStage } = body as {
      message?: string;
      action?: 'start' | 'skip';
      currentStage?: InterviewStage;
    };

    // Get or create interview
    const interview = await getOrCreateInterview(orgId, user.id);

    // Load financial context
    const financialContext = await loadFinancialContext(orgId);

    // Handle "start" action — generate opening message
    if (action === 'start') {
      const existingMessages = await loadInterviewMessages(orgId, interview.id);

      // If there are already messages, return them instead of generating a new opening
      if (existingMessages.length > 0) {
        return NextResponse.json({
          messages: existingMessages.map((m) => ({
            role: m.role,
            content: m.content,
            stage: m.stage,
          })),
          currentStage: interview.current_stage,
          stageIndex: getStageIndex(interview.current_stage),
          totalStages: getStageLabels().length,
          interviewId: interview.id,
          isComplete: interview.status === 'completed',
        });
      }

      const openingMessage = await generateOpeningMessage(orgId, interview.id, financialContext);

      await logAudit({
        orgId,
        userId: user.id,
        action: 'interview.started',
        entityType: 'interview',
        entityId: interview.id,
      });

      return NextResponse.json({
        aiResponse: openingMessage,
        currentStage: 'business_model_confirmation',
        stageIndex: 0,
        totalStages: getStageLabels().length,
        stageTransitioned: false,
        isComplete: false,
        interviewId: interview.id,
      });
    }

    // Handle "skip" action — skip the current stage
    if (action === 'skip') {
      const stage = currentStage ?? interview.current_stage;
      const { newStage, isComplete } = await skipStage(orgId, interview.id, stage);

      await logAudit({
        orgId,
        userId: user.id,
        action: 'interview.stage_skipped',
        entityType: 'interview',
        entityId: interview.id,
        metadata: { skippedStage: stage, newStage },
      });

      return NextResponse.json({
        aiResponse: newStage
          ? `No problem. Let's move on to the next section.`
          : `All sections complete. Let me compile your business profile.`,
        currentStage: newStage ?? stage,
        stageIndex: newStage ? getStageIndex(newStage) : getStageLabels().length,
        totalStages: getStageLabels().length,
        stageTransitioned: true,
        newStage,
        isComplete,
        interviewId: interview.id,
      });
    }

    // Handle regular message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Load existing messages for conversation context
    const existingMessages = await loadInterviewMessages(orgId, interview.id);
    const conversationHistory = existingMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const stage = currentStage ?? interview.current_stage;

    const result = await processInterviewMessage(
      orgId,
      interview.id,
      message.trim(),
      stage,
      conversationHistory,
      financialContext
    );

    await logAudit({
      orgId,
      userId: user.id,
      action: 'interview.message_sent',
      entityType: 'interview',
      entityId: interview.id,
      metadata: {
        stage: result.currentStage,
        stageTransitioned: result.stageTransitioned,
        isComplete: result.isComplete,
      },
    });

    return NextResponse.json({
      aiResponse: result.aiResponse,
      currentStage: result.currentStage,
      stageIndex: result.stageIndex,
      totalStages: result.totalStages,
      stageTransitioned: result.stageTransitioned,
      newStage: result.newStage,
      isComplete: result.isComplete,
      interviewId: interview.id,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error('Interview message error:', e);
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
