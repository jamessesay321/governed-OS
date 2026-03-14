import { callLLMConversation, callLLM } from '@/lib/ai/llm';
import { buildFinancialContext } from '@/lib/ai/financial-context';
import type { FinancialContext } from '@/lib/ai/financial-context';
import { getStagePrompt, getOpeningPromptInstruction, PROFILE_EXTRACTION_PROMPT } from './prompts';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  InterviewStage,
  InterviewStatus,
  InterviewMessage,
  Interview,
  BusinessContextProfile,
  INTERVIEW_STAGES,
} from '@/types';

// Stage ordering for transitions
const STAGE_ORDER: InterviewStage[] = [
  'business_model_confirmation',
  'goals_and_priorities',
  'contextual_enrichment',
  'benchmarking_baseline',
];

const STAGE_LABELS: Record<InterviewStage, string> = {
  business_model_confirmation: 'Business Model',
  goals_and_priorities: 'Goals & Priorities',
  contextual_enrichment: 'Context & Team',
  benchmarking_baseline: 'KPI Baseline',
};

/**
 * Get the next stage in the interview sequence, or null if complete.
 */
export function getNextStage(current: InterviewStage): InterviewStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

/**
 * Get the stage index (0-based) for progress tracking.
 */
export function getStageIndex(stage: InterviewStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Get all stage labels for UI display.
 */
export function getStageLabels(): { stage: InterviewStage; label: string }[] {
  return STAGE_ORDER.map((stage) => ({ stage, label: STAGE_LABELS[stage] }));
}

/**
 * Check if the AI response signals a stage transition.
 */
function detectStageComplete(response: string): boolean {
  return response.includes('[STAGE_COMPLETE]');
}

/**
 * Strip the stage transition marker from the response for display.
 */
function cleanResponse(response: string): string {
  return response.replace(/\[STAGE_COMPLETE\]/g, '').trim();
}

/**
 * Load or try to load financial context for the organisation.
 * Returns null if no financial data is available yet.
 */
export async function loadFinancialContext(orgId: string): Promise<FinancialContext | null> {
  try {
    // Get the last 12 months of data
    const now = new Date();
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 12);
    const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;

    const ctx = await buildFinancialContext(orgId, start, end);
    // If we have no period data, return null
    if (ctx.periodSummaries.length === 0 && ctx.avgMonthlyRevenue === 0) {
      return null;
    }
    return ctx;
  } catch {
    // If financial data is not available yet, continue without it
    return null;
  }
}

/**
 * Get or create an active interview for the organisation.
 */
export async function getOrCreateInterview(
  orgId: string,
  userId: string
): Promise<Interview> {
  const supabase = await createServiceClient();

  // Check for existing in-progress interview
  try {
    const { data: existing } = await supabase
      .from('business_context_profiles' as any)
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) return existing as unknown as Interview;
  } catch {
    // No existing interview, create one
  }

  // Create a new interview
  const { data: interview, error } = await supabase
    .from('business_context_profiles' as any)
    .insert({
      org_id: orgId,
      user_id: userId,
      status: 'in_progress' as InterviewStatus,
      current_stage: 'business_model_confirmation' as InterviewStage,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Table may not exist yet — return a virtual interview object
    return {
      id: crypto.randomUUID(),
      org_id: orgId,
      user_id: userId,
      status: 'in_progress',
      current_stage: 'business_model_confirmation',
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return interview as unknown as Interview;
}

/**
 * Check if an interview has been completed for this org.
 */
export async function getCompletedInterview(orgId: string): Promise<Interview | null> {
  const supabase = await createServiceClient();

  try {
    const { data } = await supabase
      .from('business_context_profiles' as any)
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    return (data as unknown as Interview) ?? null;
  } catch {
    return null;
  }
}

/**
 * Load existing messages for an interview (for resume capability).
 */
export async function loadInterviewMessages(
  orgId: string,
  interviewId: string
): Promise<InterviewMessage[]> {
  const supabase = await createServiceClient();

  try {
    const { data } = await supabase
      .from('interview_messages' as any)
      .select('*')
      .eq('org_id', orgId)
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true });

    return (data as unknown as InterviewMessage[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Store a message in the interview_messages table.
 * Uses try/catch since the table may not exist yet.
 */
async function storeMessage(
  orgId: string,
  interviewId: string,
  role: 'user' | 'assistant',
  content: string,
  stage: InterviewStage,
  metadata: Record<string, unknown> | null = null
): Promise<void> {
  const supabase = await createServiceClient();

  try {
    await supabase.from('interview_messages' as any).insert({
      org_id: orgId,
      interview_id: interviewId,
      role,
      content,
      stage,
      metadata,
    });
  } catch {
    // Table may not exist yet — silently continue
    console.warn('Failed to store interview message — table may not exist');
  }
}

/**
 * Update the interview stage.
 */
async function updateInterviewStage(
  interviewId: string,
  stage: InterviewStage
): Promise<void> {
  const supabase = await createServiceClient();

  try {
    await supabase
      .from('business_context_profiles' as any)
      .update({ current_stage: stage, updated_at: new Date().toISOString() })
      .eq('id', interviewId);
  } catch {
    console.warn('Failed to update interview stage — table may not exist');
  }
}

/**
 * Mark interview as completed.
 */
async function completeInterview(interviewId: string): Promise<void> {
  const supabase = await createServiceClient();

  try {
    await supabase
      .from('business_context_profiles' as any)
      .update({
        status: 'completed' as InterviewStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', interviewId);
  } catch {
    console.warn('Failed to complete interview — table may not exist');
  }
}

export type ProcessMessageResult = {
  aiResponse: string;
  currentStage: InterviewStage;
  stageTransitioned: boolean;
  newStage: InterviewStage | null;
  isComplete: boolean;
  stageIndex: number;
  totalStages: number;
};

/**
 * Process a user message in the interview flow.
 * Handles stage detection, prompt selection, and stage transitions.
 */
export async function processInterviewMessage(
  orgId: string,
  interviewId: string,
  userMessage: string,
  currentStage: InterviewStage,
  existingMessages: { role: 'user' | 'assistant'; content: string }[],
  financialContext: FinancialContext | null
): Promise<ProcessMessageResult> {
  // Build conversation history
  const systemPrompt = getStagePrompt(currentStage, financialContext);
  const conversationMessages = [
    ...existingMessages,
    { role: 'user' as const, content: userMessage },
  ];

  // Call LLM with full conversation history
  const rawResponse = await callLLMConversation({
    systemPrompt,
    messages: conversationMessages,
    temperature: 0.5,
  });

  // Detect stage transition
  const stageComplete = detectStageComplete(rawResponse);
  const cleanedResponse = cleanResponse(rawResponse);

  // Store messages
  await storeMessage(orgId, interviewId, 'user', userMessage, currentStage);
  await storeMessage(orgId, interviewId, 'assistant', cleanedResponse, currentStage);

  // Handle stage transition
  let newStage: InterviewStage | null = null;
  let isComplete = false;

  if (stageComplete) {
    newStage = getNextStage(currentStage);
    if (newStage) {
      await updateInterviewStage(interviewId, newStage);
    } else {
      // All stages complete
      isComplete = true;
      await completeInterview(interviewId);
    }
  }

  return {
    aiResponse: cleanedResponse,
    currentStage: stageComplete && newStage ? newStage : currentStage,
    stageTransitioned: stageComplete,
    newStage,
    isComplete,
    stageIndex: getStageIndex(stageComplete && newStage ? newStage : currentStage),
    totalStages: STAGE_ORDER.length,
  };
}

/**
 * Generate the opening AI message for a new interview.
 */
export async function generateOpeningMessage(
  orgId: string,
  interviewId: string,
  financialContext: FinancialContext | null
): Promise<string> {
  const systemPrompt = getStagePrompt('business_model_confirmation', financialContext);
  const instruction = getOpeningPromptInstruction(financialContext);

  const response = await callLLMConversation({
    systemPrompt,
    messages: [{ role: 'user', content: instruction }],
    temperature: 0.5,
  });

  const cleaned = cleanResponse(response);

  // Store the opening message
  await storeMessage(orgId, interviewId, 'assistant', cleaned, 'business_model_confirmation', {
    type: 'opening_message',
  });

  return cleaned;
}

/**
 * Skip the current interview stage and advance to the next.
 */
export async function skipStage(
  orgId: string,
  interviewId: string,
  currentStage: InterviewStage
): Promise<{ newStage: InterviewStage | null; isComplete: boolean }> {
  const newStage = getNextStage(currentStage);

  if (newStage) {
    await updateInterviewStage(interviewId, newStage);
    await storeMessage(orgId, interviewId, 'assistant', `Skipped "${STAGE_LABELS[currentStage]}" stage. Moving on.`, currentStage, {
      type: 'stage_skipped',
    });
  } else {
    await completeInterview(interviewId);
  }

  return { newStage, isComplete: !newStage };
}

type ExtractedProfile = Omit<BusinessContextProfile, 'id' | 'org_id' | 'interview_id' | 'created_at' | 'updated_at'>;

/**
 * Parse the full interview transcript into a structured BusinessContextProfile.
 */
export async function extractBusinessProfile(
  messages: { role: string; content: string }[]
): Promise<ExtractedProfile> {
  // Build transcript from messages
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Client' : 'Advisor'}: ${m.content}`)
    .join('\n\n');

  const rawResponse = await callLLM({
    systemPrompt: PROFILE_EXTRACTION_PROMPT,
    userMessage: `Here is the full interview transcript:\n\n${transcript}`,
    temperature: 0.1,
  });

  // Extract JSON
  const fenceMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : rawResponse.match(/\{[\s\S]*\}/)?.[0] ?? rawResponse;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      revenue_model: parsed.revenue_model ?? '',
      revenue_streams: parsed.revenue_streams ?? [],
      seasonality_description: parsed.seasonality_description ?? null,
      key_clients_description: parsed.key_clients_description ?? null,
      industry: parsed.industry ?? null,
      business_stage: parsed.business_stage ?? null,
      twelve_month_goals: parsed.twelve_month_goals ?? [],
      biggest_challenges: parsed.biggest_challenges ?? [],
      success_definition: parsed.success_definition ?? null,
      team_size: parsed.team_size ?? null,
      team_structure: parsed.team_structure ?? null,
      customer_concentration_risk: parsed.customer_concentration_risk ?? null,
      competitive_positioning: parsed.competitive_positioning ?? null,
      risk_tolerance: parsed.risk_tolerance ?? null,
      target_revenue_growth: parsed.target_revenue_growth ?? null,
      target_gross_margin: parsed.target_gross_margin ?? null,
      target_net_margin: parsed.target_net_margin ?? null,
      acceptable_burn_rate: parsed.acceptable_burn_rate ?? null,
      runway_requirement_months: parsed.runway_requirement_months ?? null,
      custom_kpis: parsed.custom_kpis ?? [],
    };
  } catch {
    throw new Error('Failed to parse interview transcript into structured profile');
  }
}

/**
 * Store the extracted business context profile.
 */
export async function storeBusinessProfile(
  orgId: string,
  interviewId: string,
  profile: ExtractedProfile
): Promise<BusinessContextProfile> {
  const supabase = await createServiceClient();

  const record = {
    org_id: orgId,
    interview_id: interviewId,
    ...profile,
  };

  try {
    const { data, error } = await supabase
      .from('business_context_profiles' as any)
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as BusinessContextProfile;
  } catch {
    // Table may not exist — return a virtual record
    return {
      id: crypto.randomUUID(),
      org_id: orgId,
      interview_id: interviewId,
      ...profile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
