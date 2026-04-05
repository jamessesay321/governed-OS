import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { OnboardingInterviewClient } from '@/components/onboarding/onboarding-interview-client';

export default async function OnboardingInterviewPage() {
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

  // If already completed, skip to next step
  if (interviewCompleted) {
    return redirect('/welcome/connect');
  }

  // Fetch org-level scan data to pre-populate interview context
  let initialContext: Record<string, unknown> | null = null;
  try {
    const { data: orgData } = await service
      .from('organisations' as any)
      .select('website_url, industry, business_scan, demo_company_name, demo_industry')
      .eq('id', profile.org_id)
      .single();

    if (orgData) {
      initialContext = orgData as unknown as Record<string, unknown>;
    }
  } catch {
    // Organisation may not have scan data yet
  }

  // Fetch any existing profile data from business_context_profiles
  let existingProfileData: Record<string, unknown> | null = null;
  try {
    const { data: profileData } = await service
      .from('business_context_profiles' as any)
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (profileData) {
      existingProfileData = profileData as unknown as Record<string, unknown>;
    }
  } catch {
    // No existing profile data
  }

  // Check for in-progress interview with existing messages
  let existingMessages: { role: 'user' | 'assistant'; content: string; stage: string }[] = [];
  let currentInterviewId: string | null = null;
  let currentStage = 'business_model_confirmation';

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

  return (
    <OnboardingInterviewClient
      orgId={profile.org_id}
      existingMessages={existingMessages}
      currentInterviewId={currentInterviewId}
      currentStage={currentStage}
      initialContext={initialContext}
      existingProfile={existingProfileData}
    />
  );
}
