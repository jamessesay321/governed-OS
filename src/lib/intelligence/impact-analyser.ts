import { callLLM } from '@/lib/ai/llm';
import { createServiceClient } from '@/lib/supabase/server';
import type { IntelligenceEvent, IntelligenceImpact, ImpactType } from '@/types';

type OrgContext = {
  orgId: string;
  orgName: string;
  sector: string;
  country: string;
  annualRevenue: number;
  employeeCount: number;
  outstandingDebt: number;
};

type ImpactAnalysis = {
  relevance_score: number;
  impact_type: ImpactType;
  impact_narrative: string;
  estimated_impact_pence: number;
};

const IMPACT_SYSTEM_PROMPT = `You are a financial intelligence analyst for SMEs. Given an economic or regulatory event and an organisation's financial profile, produce a personalised impact analysis.

You MUST return valid JSON with exactly these fields:
{
  "relevance_score": <number 0-1, how relevant this event is to this specific business>,
  "impact_type": <"positive" | "negative" | "neutral" | "mixed">,
  "impact_narrative": <string, 2-3 sentences explaining the specific impact on THIS business with concrete numbers where possible>,
  "estimated_impact_pence": <integer, estimated annual impact in pence, negative for costs/losses, positive for gains>
}

Rules:
- Ground your analysis in the organisation's actual financial data
- Use specific numbers: "A 0.25% rate rise increases your £500k loan cost by £1,250/year"
- Be concise but specific to this organisation
- If the event has minimal relevance (score < 0.2), say so clearly
- All monetary values in pence (£1 = 100 pence)
- Return ONLY the JSON object, no markdown formatting`;

/**
 * Use Claude to generate a personalised impact narrative for an event
 * relative to a specific organisation's financial position.
 * AI is used ONLY for narrative generation — no financial math.
 */
export async function analyseImpact(
  event: IntelligenceEvent,
  org: OrgContext
): Promise<ImpactAnalysis> {
  const userMessage = `Event:
- Title: ${event.title}
- Type: ${event.event_type}
- Summary: ${event.summary}
- Severity: ${event.severity}
- Sectors affected: ${event.sectors_affected.join(', ')}
- Countries affected: ${event.countries_affected.join(', ')}

Organisation:
- Name: ${org.orgName}
- Sector: ${org.sector}
- Country: ${org.country}
- Annual Revenue: £${(org.annualRevenue / 100).toLocaleString()}
- Employee Count: ${org.employeeCount}
- Outstanding Debt: £${(org.outstandingDebt / 100).toLocaleString()}

Analyse the specific impact of this event on this organisation.`;

  const response = await callLLM({
    systemPrompt: IMPACT_SYSTEM_PROMPT,
    userMessage,
    temperature: 0.2,
  });

  // Parse the JSON response — strip any markdown code fences
  const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned) as ImpactAnalysis;

  // Validate the response shape
  if (
    typeof parsed.relevance_score !== 'number' ||
    typeof parsed.impact_type !== 'string' ||
    typeof parsed.impact_narrative !== 'string' ||
    typeof parsed.estimated_impact_pence !== 'number'
  ) {
    throw new Error('Invalid impact analysis response from LLM');
  }

  // Clamp relevance score to [0, 1]
  parsed.relevance_score = Math.max(0, Math.min(1, parsed.relevance_score));

  return parsed;
}

/**
 * Analyse impact and persist to database.
 * Returns the stored IntelligenceImpact record.
 */
export async function analyseAndStoreImpact(
  event: IntelligenceEvent,
  org: OrgContext
): Promise<IntelligenceImpact> {
  const analysis = await analyseImpact(event, org);

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('intelligence_impacts' as any)
    .insert({
      event_id: event.id,
      org_id: org.orgId,
      relevance_score: analysis.relevance_score,
      impact_type: analysis.impact_type,
      impact_narrative: analysis.impact_narrative,
      estimated_impact_pence: analysis.estimated_impact_pence,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to store impact: ${error.message}`);
  return data as unknown as IntelligenceImpact;
}

/**
 * Get all impacts for an organisation, joined with their events.
 */
export async function getImpactsForOrg(
  orgId: string,
  limit = 20
): Promise<(IntelligenceImpact & { event: IntelligenceEvent })[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('intelligence_impacts' as any)
    .select('*, event:intelligence_events(*)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch impacts: ${error.message}`);
  return (data ?? []) as unknown as (IntelligenceImpact & { event: IntelligenceEvent })[];
}
