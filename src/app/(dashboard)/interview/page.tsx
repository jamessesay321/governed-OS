import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { InterviewPageClient } from './interview-page-client';

export default async function InterviewPage() {
  const { orgId, orgName } = await getUserProfile();

  const service = await createServiceClient();
  const untyped = await createUntypedServiceClient();

  // Check if interview was already completed
  let interviewCompleted = false;
  let completedInterviewId: string | null = null;

  try {
    const { data: completedInterview } = await service
      .from('business_context_profiles' as any)
      .select('id, status')
      .eq('org_id', orgId)
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

  // Check for existing business profile (load saved form data)
  let existingProfile = null;
  if (interviewCompleted && completedInterviewId) {
    try {
      const { data } = await service
        .from('business_context_profiles' as any)
        .select('*')
        .eq('id', completedInterviewId)
        .single();

      // If we have saved company_profile form data, use that
      const raw = (data as any)?.raw_interview_data?.company_profile;
      if (raw) {
        existingProfile = {
          company_name: raw.companyName,
          website: raw.website,
          linkedin: raw.linkedIn,
          twitter: raw.twitter,
          instagram: raw.instagram,
          tiktok: raw.tiktok,
          pinterest: raw.pinterest,
          industry: raw.industry,
          company_size: raw.companySize,
          revenue_range: raw.revenueRange,
          fiscal_year_end: raw.fiscalYearEnd,
          country: raw.country,
          year_established: raw.yearEstablished,
          description: raw.description,
          goals: raw.goals,
          challenges: raw.challenges,
        };
      } else {
        existingProfile = data as any;
      }
    } catch {
      // Table may not exist or no profile
    }
  }

  // If no profile yet, pre-populate from org name and any onboarding scan data
  if (!existingProfile) {
    // Start with what we already know from signup
    const fallback: Record<string, unknown> = {
      company_name: orgName || '',
    };

    // Check if there was a website scan during onboarding
    try {
      const { data: scanData } = await untyped
        .from('business_context_profiles')
        .select('raw_interview_data')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const scan = (scanData as any)?.raw_interview_data?.scan;
      if (scan) {
        if (scan.industry) fallback.industry = scan.industry;
        if (scan.website_url) fallback.website = scan.website_url;
        if (scan.business_type) fallback.description = scan.business_type;
      }
    } catch {
      // No scan data
    }

    // Check org metadata for website
    try {
      const { data: orgData } = await untyped
        .from('organisations')
        .select('website, industry')
        .eq('id', orgId)
        .maybeSingle();

      if (orgData) {
        if ((orgData as any).website && !fallback.website) fallback.website = (orgData as any).website;
        if ((orgData as any).industry && !fallback.industry) fallback.industry = (orgData as any).industry;
      }
    } catch {
      // Column may not exist
    }

    if (fallback.company_name || fallback.website || fallback.industry) {
      existingProfile = fallback;
    }
  }

  // Also check for saved profile even if interview not "completed" via AI
  if (!existingProfile) {
    try {
      const { data } = await service
        .from('business_context_profiles' as any)
        .select('raw_interview_data')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const raw = (data as any)?.raw_interview_data?.company_profile;
      if (raw) {
        interviewCompleted = true;
        existingProfile = {
          company_name: raw.companyName,
          website: raw.website,
          linkedin: raw.linkedIn,
          twitter: raw.twitter,
          instagram: raw.instagram,
          tiktok: raw.tiktok,
          pinterest: raw.pinterest,
          industry: raw.industry,
          company_size: raw.companySize,
          revenue_range: raw.revenueRange,
          fiscal_year_end: raw.fiscalYearEnd,
          country: raw.country,
          year_established: raw.yearEstablished,
          description: raw.description,
          goals: raw.goals,
          challenges: raw.challenges,
        };
      }
    } catch {
      // No saved profile yet
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
        .eq('org_id', orgId)
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
      orgId={orgId}
      interviewCompleted={interviewCompleted}
      completedInterviewId={completedInterviewId}
      existingProfile={existingProfile}
      existingMessages={existingMessages}
      currentInterviewId={currentInterviewId}
      currentStage={currentStage}
    />
  );
}
