'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { InterviewChat } from '@/components/interview/interview-chat';
import { InterviewCompletion } from '@/components/interview/interview-completion';
import type { InterviewStage, BusinessContextProfile } from '@/types';

type Props = {
  orgId: string;
  interviewCompleted: boolean;
  completedInterviewId: string | null;
  existingProfile: Partial<BusinessContextProfile> | null;
  existingMessages: { role: 'user' | 'assistant'; content: string; stage: string }[];
  currentInterviewId: string | null;
  currentStage: string;
};

export function InterviewPageClient({
  orgId,
  interviewCompleted,
  completedInterviewId,
  existingProfile,
  existingMessages,
  currentInterviewId,
  currentStage,
}: Props) {
  const [showCompletion, setShowCompletion] = useState(interviewCompleted);
  const [activeInterviewId, setActiveInterviewId] = useState(
    completedInterviewId ?? currentInterviewId
  );

  // If interview is completed, show the completion/profile screen
  if (showCompletion && activeInterviewId) {
    return (
      <div className="py-4">
        <InterviewCompletion
          orgId={orgId}
          interviewId={activeInterviewId}
          profile={existingProfile}
        />
      </div>
    );
  }

  // Otherwise show the chat interview
  // Map stages to the correct stage index
  const STAGE_ORDER: InterviewStage[] = [
    'business_model_confirmation',
    'goals_and_priorities',
    'contextual_enrichment',
    'benchmarking_baseline',
  ];
  const stageIndex = STAGE_ORDER.indexOf(currentStage as InterviewStage);

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome to Governed OS</h1>
        <p className="text-muted-foreground mt-1">
          Let&apos;s get to know your business. This conversation will help us set up your
          financial model and personalise your dashboard.
        </p>
      </div>

      <Card className="overflow-hidden">
        <InterviewChat
          orgId={orgId}
          initialMessages={existingMessages.map((m) => ({
            role: m.role,
            content: m.content,
            stage: m.stage as InterviewStage,
          }))}
          initialStage={currentStage as InterviewStage}
          initialStageIndex={stageIndex >= 0 ? stageIndex : 0}
          interviewId={currentInterviewId ?? undefined}
          onComplete={() => {
            // Brief delay before showing completion to let the final message be seen
            setTimeout(() => {
              setShowCompletion(true);
            }, 2000);
          }}
        />
      </Card>
    </div>
  );
}
