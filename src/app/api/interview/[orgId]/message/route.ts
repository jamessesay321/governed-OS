import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  getOrCreateInterview,
  loadInterviewMessages,
  loadFinancialContext,
  loadBusinessScan,
  processInterviewMessage,
  generateOpeningMessage,
  skipStage,
  getStageIndex,
  getStageLabels,
} from '@/lib/interview/engine';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import type { InterviewStage } from '@/types';

type Params = { params: Promise<{ orgId: string }> };

const VALID_STAGES = [
  'business_model_confirmation',
  'revenue_deep_dive',
  'cost_structure',
  'growth_goals',
  'risk_and_challenges',
  'team_and_operations',
] as const;

const interviewMessageSchema = z.object({
  message: z.string().min(1).max(5000).optional(),
  action: z.enum(['start', 'skip']).optional(),
  currentStage: z.enum(VALID_STAGES).optional(),
});

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
    const parsed = interviewMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { message, action, currentStage } = parsed.data as {
      message?: string;
      action?: 'start' | 'skip';
      currentStage?: InterviewStage;
    };

    // Get or create interview
    const interview = await getOrCreateInterview(orgId, user.id);

    // Load financial context and business scan
    const financialContext = await loadFinancialContext(orgId);
    const businessScan = await loadBusinessScan(orgId);

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

      const openingMessage = await generateOpeningMessage(orgId, interview.id, financialContext, businessScan);

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
      financialContext,
      businessScan
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Interview message error:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Failed to process interview message' }, { status: 500 });
  }
}
