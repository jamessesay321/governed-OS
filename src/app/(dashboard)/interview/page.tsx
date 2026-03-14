import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { InterviewPageClient } from './interview-page-client';

export default async function InterviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  const service = await createServiceClient();

  // Check if interview was already completed
  let interviewCompleted = false;
  let completedInterviewId: string | null = null;

  try {
    const { data: completedInterview } = await service
      .from('business_context_profiles' as any)
      .select('id, status')
      .eq('org_id', profile.org_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (completedInterview) {
      interviewCompleted = true;
      completedInterviewId = (completedInterview as any).id;
    }
  } catch {
    // Table may not exist yet or no completed interview
  }

  // Check for existing business profile
  let existingProfile = null;
  if (interviewCompleted && completedInterviewId) {
    try {
      const { data } = await service
        .from('business_context_profiles' as any)
        .select('*')
        .eq('id', completedInterviewId)
        .single();

      existingProfile = data as any;
    } catch {
      // Table may not exist or no profile
    }
  }

  // Check for in-progress interview with existing messages
  let existingMessages: { role: 'user' | 'assistant'; content: string; stage: string }[] = [];
  let currentInterviewId: string | null = null;
  let currentStage = 'business_model_confirmation';

  if (!interviewCompleted) {
    try {
      const { data: activeInterview } = await service
        .from('business_context_profiles' as any)
        .select('*')
        .eq('org_id', profile.org_id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activeInterview) {
        const active = activeInterview as any;
        currentInterviewId = active.id;
        currentStage = active.interview_type || 'business_model_confirmation';

        const { data: messages } = await service
          .from('interview_messages' as any)
          .select('role, content, stage')
          .eq('profile_id', active.id)
          .order('created_at', { ascending: true });

        if (messages && (messages as any[]).length > 0) {
          existingMessages = messages as unknown as typeof existingMessages;
        }
      }
    } catch {
      // Tables may not exist yet
    }
  }

  return (
    <InterviewPageClient
      orgId={profile.org_id}
      interviewCompleted={interviewCompleted}
      completedInterviewId={completedInterviewId}
      existingProfile={existingProfile}
      existingMessages={existingMessages}
      currentInterviewId={currentInterviewId}
      currentStage={currentStage}
    />
  );
}
