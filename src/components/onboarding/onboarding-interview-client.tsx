'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { InterviewChat } from '@/components/interview/interview-chat';
import { InterviewCompletion } from '@/components/interview/interview-completion';
import { OnboardingProgress } from './onboarding-progress';
import type { InterviewStage } from '@/types';

type Props = {
  orgId: string;
  existingMessages: { role: 'user' | 'assistant'; content: string; stage: string }[];
  currentInterviewId: string | null;
  currentStage: string;
};

export function OnboardingInterviewClient({
  orgId,
  existingMessages,
  currentInterviewId,
  currentStage,
}: Props) {
  const router = useRouter();
  const [showCompletion, setShowCompletion] = useState(false);
  const [activeInterviewId, setActiveInterviewId] = useState(currentInterviewId);

  const STAGE_ORDER: InterviewStage[] = [
    'business_model_confirmation',
    'goals_and_priorities',
    'contextual_enrichment',
    'benchmarking_baseline',
  ];
  const stageIndex = STAGE_ORDER.indexOf(currentStage as InterviewStage);

  // After interview completion screen — redirect to Xero connect step
  if (showCompletion && activeInterviewId) {
    return (
      <div>
        <OnboardingProgress currentStep={2} completedSteps={{ interview: true, xero: false }} />
        <InterviewCompletion
          orgId={orgId}
          interviewId={activeInterviewId}
          redirectTo="/welcome/connect"
        />
      </div>
    );
  }

  return (
    <div>
      <OnboardingProgress currentStep={1} />

      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Tell us about your business
            </h2>
            <p className="text-muted-foreground mt-1">
              A quick conversation to personalise your dashboard and set up KPI targets.
            </p>
          </div>
          <button
            onClick={() => router.push('/welcome/connect')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline flex-shrink-0"
          >
            Skip this step
          </button>
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
              setTimeout(() => {
                setShowCompletion(true);
              }, 2000);
            }}
          />
        </Card>
      </div>
    </div>
  );
}
